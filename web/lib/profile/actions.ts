'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AppUser, SearchPreferences } from '@/lib/supabase/types'

// ─── Profile ───────────────────────────────────────────────────────────────────

export interface ProfileUpdatePayload {
  name:  string
  phone: string | null
}

export interface ActionResult {
  error?: string
  success?: boolean
}

/**
 * updateProfile — persists name and phone to users table.
 * Returns { success: true } or { error: message }.
 */
export async function updateProfile(
  payload: ProfileUpdatePayload,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthenticated' }

  const { error } = await supabase
    .from('users')
    .update({ name: payload.name.trim(), phone: payload.phone?.trim() || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

// ─── Search Preferences ────────────────────────────────────────────────────────

/**
 * saveSearchPreferences — upserts the JSONB search_preferences column.
 *
 * The entire preferences object is replaced on save (merge is handled client-side
 * by reading current values into the form first).
 */
export async function saveSearchPreferences(
  prefs: SearchPreferences,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthenticated' }

  // Strip undefined keys so the JSONB doesn't store noise
  const clean: SearchPreferences = Object.fromEntries(
    Object.entries(prefs).filter(([, v]) => v !== undefined && v !== ''),
  ) as SearchPreferences

  const { error } = await supabase
    .from('users')
    .update({ search_preferences: clean })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

// ─── Profile fetch ─────────────────────────────────────────────────────────────

/**
 * getProfile — fetches the current user's full row including preferences.
 * Used server-side to seed forms.
 */
export async function getProfile(): Promise<AppUser | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return data as AppUser | null
}

// ─── Conversation history ──────────────────────────────────────────────────────

export interface ConversationWithProperty {
  id:           string
  status:       string
  track:        string
  created_at:   string
  updated_at:   string
  property_id:  string
  property: {
    id:     string
    title:  string
    photos: string[]
    price:  number
    address: string
  }
}

/**
 * getConversationHistory — returns all bot conversations for the current user
 * joined with property details, ordered by most-recent first.
 */
export async function getConversationHistory(): Promise<ConversationWithProperty[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('bot_conversations')
    .select(`
      id,
      status,
      track,
      created_at,
      updated_at,
      property_id,
      properties (
        id,
        title,
        photos,
        price,
        address
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  // Flatten the nested join shape
  return data.map((row: any) => ({
    id:          row.id,
    status:      row.status,
    track:       row.track,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    property_id: row.property_id,
    property:    row.properties,
  }))
}

// ─── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoriteWithProperty {
  id:          string
  created_at:  string
  property:    {
    id:        string
    title:     string
    photos:    string[]
    price:     number
    address:   string
    rooms:     number | null
    size_sqm:  number | null
    category:  string
    arnona:    number
    vaad:      number
  }
}

/**
 * getFavorites — returns all favorites for the current user with property details.
 */
export async function getFavorites(): Promise<FavoriteWithProperty[]> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      properties (
        id, title, photos, price, address, rooms, size_sqm, category, arnona, vaad
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .filter((row: any) => row.properties !== null)
    .map((row: any) => ({
      id:         row.id,
      created_at: row.created_at,
      property:   row.properties,
    }))
}
