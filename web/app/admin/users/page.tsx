import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { UsersTable } from '@/components/admin/UsersTable'
import { getAdminUsers } from '@/lib/admin/actions'

export const dynamic = 'force-dynamic'

/**
 * AdminUsersPage — searchable, ban/unban user moderation table.
 * Initial data server-fetched; subsequent searches use server actions.
 */
export default async function AdminUsersPage() {
  const users = await getAdminUsers()

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
              ניהול משתמשים
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
              {users.length} משתמשים במערכת
            </p>
          </div>
        </div>

        <UsersTable initialUsers={users} />

      </div>
    </PageShell>
  )
}
