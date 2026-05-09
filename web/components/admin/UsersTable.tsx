'use client'

import { useState, useTransition } from 'react'
import { Search, Ban, CheckCircle, User } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { banUser, unbanUser, getAdminUsers } from '@/lib/admin/actions'
import type { AdminUser } from '@/lib/admin/actions'

interface UsersTableProps {
  initialUsers: AdminUser[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'בעל נכס',
  renter: 'שוכר',
  both: 'שניהם',
  admin: 'אדמין',
}

/**
 * UsersTable — searchable, ban/unban moderation table.
 * Fetches fresh list via server action after each mutation.
 */
export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const fresh = await getAdminUsers(search)
      setUsers(fresh)
    })
  }

  function handleBanToggle(user: AdminUser) {
    setActionUserId(user.id)
    startTransition(async () => {
      try {
        if (user.is_banned) {
          await unbanUser(user.id)
        } else {
          await banUser(user.id)
        }
        // Refresh table
        const fresh = await getAdminUsers(search)
        setUsers(fresh)
      } catch (err) {
        console.error('[UsersTable] Ban toggle failed:', err)
        alert('שגיאה בביצוע הפעולה')
      } finally {
        setActionUserId(null)
      }
    })
  }

  const filtered = search
    ? users  // already filtered server-side
    : users

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3" style={{ color: 'var(--color-muted, #8B7355)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם / אימייל..."
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
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>משתמש</TableHead>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>תפקיד</TableHead>
              <TableHead className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>נרשם</TableHead>
              <TableHead className="text-xs font-semibold text-end" style={{ color: 'var(--color-dark)' }}>פעולה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-sm" style={{ color: 'var(--color-muted, #8B7355)' }}>
                  <User size={20} className="mx-auto mb-2 opacity-40" />
                  אין משתמשים
                </TableCell>
              </TableRow>
            )}
            {filtered.map((user) => (
              <TableRow
                key={user.id}
                style={{
                  background: user.is_banned ? '#FEF2F2' : 'var(--color-bg)',
                  opacity: actionUserId === user.id && isPending ? 0.5 : 1,
                }}
              >
                <TableCell className="py-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                      {user.name || '—'}
                      {user.is_banned && (
                        <span className="ms-2 text-[10px] font-bold text-red-500 bg-red-50 rounded-full px-2 py-0.5">
                          מודר
                        </span>
                      )}
                    </p>
                    <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--color-muted, #8B7355)' }}>
                      {user.email ?? user.phone ?? '—'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-dark)' }}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell className="text-end">
                  <button
                    onClick={() => handleBanToggle(user)}
                    disabled={isPending && actionUserId === user.id}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ms-auto transition-colors"
                    style={{
                      borderColor: user.is_banned ? '#10B981' : '#EF4444',
                      color: user.is_banned ? '#10B981' : '#EF4444',
                    }}
                  >
                    {user.is_banned
                      ? <><CheckCircle size={11} /> בטל מודרציה</>
                      : <><Ban size={11} /> השעה</>
                    }
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-[11px] text-end" style={{ color: 'var(--color-muted, #8B7355)' }}>
        מציג {filtered.length} משתמשים
      </p>
    </div>
  )
}
