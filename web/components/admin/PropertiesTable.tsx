'use client'

import { useState, useTransition } from 'react'
import { Search, Trash2, Building2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteProperty, getAdminProperties } from '@/lib/admin/actions'
import type { AdminProperty } from '@/lib/admin/actions'

interface PropertiesTableProps {
  initialProperties: AdminProperty[]
}

function formatPrice(price: number) {
  return `₪${price.toLocaleString('he-IL')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

const CATEGORY_LABEL: Record<string, string> = {
  rental: 'שכירות',
  sale: 'מכירה',
  roommates: 'שותפים',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  sold: 'נמכר',
}

/**
 * PropertiesTable — searchable property moderation table with delete action.
 */
export function PropertiesTable({ initialProperties }: PropertiesTableProps) {
  const [properties, setProperties] = useState<AdminProperty[]>(initialProperties)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fresh = await getAdminProperties(search)
      setProperties(fresh)
    })
  }

  function handleDelete(property: AdminProperty) {
    if (!confirm(`בטוח שברצונך למחוק את הנכס "${property.title}"?\nפעולה זו אינה הפיכה.`)) return

    setActionId(property.id)
    startTransition(async () => {
      try {
        await deleteProperty(property.id)
        const fresh = await getAdminProperties(search)
        setProperties(fresh)
      } catch (err) {
        console.error('[PropertiesTable] Delete failed:', err)
        alert('שגיאה במחיקת הנכס')
      } finally {
        setActionId(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3" style={{ color: 'var(--color-muted, #8B7355)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי כותרת / כתובת..."
            className="w-full rounded-xl border px-3 py-2.5 ps-8 text-sm outline-none"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-dark)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl px-4 py-2 text-sm font-semibold shrink-0"
          style={{ background: 'var(--color-primary)', color: '#FDFAF7' }}
        >
          חיפוש
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: 'var(--color-surface)' }}>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>נכס</TableHead>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>קטגוריה</TableHead>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>מחיר</TableHead>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>סטטוס</TableHead>
              <TableHead className="text-xs font-semibold text-end" style={{ color: 'var(--color-dark)' }}>מחק</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm" style={{ color: 'var(--color-muted, #8B7355)' }}>
                  <Building2 size={20} className="mx-auto mb-2 opacity-40" />
                  אין נכסים
                </TableCell>
              </TableRow>
            )}
            {properties.map((property) => (
              <TableRow
                key={property.id}
                style={{
                  background: 'var(--color-bg)',
                  opacity: actionId === property.id && isPending ? 0.4 : 1,
                }}
              >
                <TableCell className="py-3">
                  <div>
                    <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--color-dark)' }}>
                      {property.title}
                    </p>
                    <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-muted, #8B7355)' }}>
                      {property.owner_name} · {formatDate(property.created_at)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-dark)' }}>
                  {CATEGORY_LABEL[property.category] ?? property.category}
                </TableCell>
                <TableCell className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>
                  {formatPrice(property.price)}
                </TableCell>
                <TableCell>
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{
                      background: property.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                      color: property.status === 'active' ? '#16A34A' : '#6B7280',
                    }}
                  >
                    {STATUS_LABEL[property.status] ?? property.status}
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <button
                    onClick={() => handleDelete(property)}
                    disabled={isPending && actionId === property.id}
                    className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 ms-auto hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={11} />
                    מחק
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[11px] text-end" style={{ color: 'var(--color-muted, #8B7355)' }}>
        מציג {properties.length} נכסים
      </p>
    </div>
  )
}
