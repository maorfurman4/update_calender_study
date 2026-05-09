import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/shared/PageShell'
import { BotChat } from '@/components/bot/BotChat'
import type { Property } from '@/lib/supabase/types'

interface BotPageProps {
  params: Promise<{ propertyId: string }>
}

// ─── Track-specific greeting messages ─────────────────────────────────────────

function getGreeting(category: string): string {
  switch (category) {
    case 'sale':
      return 'שלום! אני יועץ נדל״ן מטעם הפלטפורמה. אשאל אותך כמה שאלות כדי לוודא שהנכס מתאים לך. נתחיל?'
    case 'roommates':
      return 'היי! אשמח להכיר אותך ולבדוק אם אנחנו מתאימים כשותפים. נתחיל בכמה שאלות קצרות?'
    case 'rental':
    default:
      return 'שלום! אשאל אותך מספר שאלות קצרות כדי לוודא שהדירה מתאימה לך. נתחיל?'
  }
}

/**
 * BotPage — AI screening chat for a specific property.
 *
 * Server Component:
 *   1. Auth check — redirect to /login if unauthenticated.
 *   2. Fetch property.
 *   3. Look up existing bot_conversation for (user, property).
 *   4. If already 'approved' → redirect to /swipe (no re-screening needed).
 *   5. Pass property + greeting to BotChat (Client Component).
 *
 * Full-viewport, no scroll — BotChat manages its own internal scroll.
 */
export default async function BotPage({ params }: BotPageProps) {
  const { propertyId } = await params

  // ── Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/bot/${propertyId}`)
  }

  // ── Property ──────────────────────────────────────────────────────────────
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error || !property) notFound()

  // ── Existing conversation — skip re-screening if already approved ──────────
  const { data: existingConversation } = await supabase
    .from('bot_conversations')
    .select('status')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingConversation?.status === 'approved') {
    // Already approved — send them back to swipe with a toast-like param
    redirect('/swipe?approved=1')
  }

  const greeting = getGreeting(property.category)

  return (
    // fullscreen + hideNav so the chat takes the whole screen
    <PageShell fullscreen hideNav>
      <BotChat property={property as Property} greeting={greeting} />
    </PageShell>
  )
}
