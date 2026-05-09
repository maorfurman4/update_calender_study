'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'

// Service-role client — bypasses RLS for all admin mutations
function serviceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalUsers: number
  totalProperties: number
  totalSwipesToday: number
  totalLeadsToday: number
  bannedUsers: number
  activeProperties: number
}

export interface AdminUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  is_banned: boolean
  created_at: string
}

export interface AdminProperty {
  id: string
  title: string
  address: string
  category: string
  price: number
  status: string
  owner_id: string
  owner_name: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Write audit entry (fire-and-forget — never throws)
// ---------------------------------------------------------------------------
async function writeAudit(
  supabase: ReturnType<typeof serviceClient>,
  action_type: string,
  target_id: string | null,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from('audit_logs').insert({ action_type, target_id, details: (details ?? null) as Json | null })
  } catch (err) {
    console.error('[admin/audit] Failed to write audit log:', err)
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getAdminStats(): Promise<AdminStats> {
  const db = serviceClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [
    { count: totalUsers },
    { count: totalProperties },
    { count: totalSwipesToday },
    { count: totalLeadsToday },
    { count: bannedUsers },
    { count: activeProperties },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('properties').select('*', { count: 'exact', head: true }),
    db.from('swipes').select('*', { count: 'exact', head: true }).gte('swiped_at', todayIso),
    db.from('leads').select('*', { count: 'exact', head: true }).gte('revealed_at', todayIso),
    db.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    db.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalProperties: totalProperties ?? 0,
    totalSwipesToday: totalSwipesToday ?? 0,
    totalLeadsToday: totalLeadsToday ?? 0,
    bannedUsers: bannedUsers ?? 0,
    activeProperties: activeProperties ?? 0,
  }
}

// ---------------------------------------------------------------------------
// User moderation
// ---------------------------------------------------------------------------

export async function getAdminUsers(search?: string): Promise<AdminUser[]> {
  const db = serviceClient()
  let query = db
    .from('users')
    .select('id, name, email, phone, role, is_banned, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    query = query.or(`name.ilike.${q},email.ilike.${q}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminUser[]
}

export async function banUser(userId: string): Promise<void> {
  const db = serviceClient()
  const { error } = await db
    .from('users')
    .update({ is_banned: true })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  await writeAudit(db, 'ban_user', userId)
}

export async function unbanUser(userId: string): Promise<void> {
  const db = serviceClient()
  const { error } = await db
    .from('users')
    .update({ is_banned: false })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  await writeAudit(db, 'unban_user', userId)
}

// ---------------------------------------------------------------------------
// Property moderation
// ---------------------------------------------------------------------------

export async function getAdminProperties(search?: string): Promise<AdminProperty[]> {
  const db = serviceClient()

  // Fetch properties with owner name via JOIN
  let query = db
    .from('properties')
    .select('id, title, address, category, price, status, owner_id, created_at, users!owner_id(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    query = query.or(`title.ilike.${q},address.ilike.${q}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => {
    const owner = p.users as unknown as { name: string } | null
    return {
      id: p.id,
      title: p.title,
      address: p.address,
      category: p.category,
      price: p.price,
      status: p.status,
      owner_id: p.owner_id,
      owner_name: owner?.name ?? '—',
      created_at: p.created_at,
    }
  })
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const db = serviceClient()

  // Fetch title for audit record before deletion
  const { data: prop } = await db.from('properties').select('title').eq('id', propertyId).single()

  const { error } = await db.from('properties').delete().eq('id', propertyId)
  if (error) throw new Error(error.message)

  await writeAudit(db, 'delete_property', propertyId, { title: prop?.title })
}

// ---------------------------------------------------------------------------
// Kill Switch
// ---------------------------------------------------------------------------

export async function getMaintenanceMode(): Promise<boolean> {
  const db = serviceClient()
  const { data } = await db.from('system_settings').select('maintenance_mode').single()
  return (data as { maintenance_mode: boolean } | null)?.maintenance_mode ?? false
}

export async function toggleMaintenance(enabled: boolean): Promise<void> {
  const db = serviceClient()
  const { error } = await db
    .from('system_settings')
    .update({ maintenance_mode: enabled, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)
  await writeAudit(db, 'toggle_maintenance', null, { enabled })
}

// ---------------------------------------------------------------------------
// Audit log reader (last 100 entries for admin UI)
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string
  action_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
  const db = serviceClient()
  const { data, error } = await db
    .from('audit_logs')
    .select('id, action_type, target_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as AuditEntry[]
}
