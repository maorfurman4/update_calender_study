import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { PropertiesTable } from '@/components/admin/PropertiesTable'
import { getAdminProperties } from '@/lib/admin/actions'

export const dynamic = 'force-dynamic'

/**
 * AdminPropertiesPage — searchable property moderation table with delete action.
 * Initial data server-fetched; subsequent searches use server actions.
 */
export default async function AdminPropertiesPage() {
  const properties = await getAdminProperties()

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ArrowRight size={16} style={{ color: 'var(--color-dark)' }} />
          </Link>
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--color-dark)' }}>
              ניהול נכסים
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
              {properties.length} נכסים במערכת
            </p>
          </div>
        </div>

        <PropertiesTable initialProperties={properties} />

      </div>
    </PageShell>
  )
}
