import { streamText, tool, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { buildSystemPrompt } from '@/lib/bot/prompts'
import type { Database, Json } from '@/lib/supabase/types'
import type { UIMessage } from 'ai'

/**
 * POST /api/chat
 *
 * Streaming chat endpoint for the AI bot gatekeeper.
 * Powered by Vercel AI SDK v6 + OpenAI GPT-4o.
 *
 * Request body (sent by useChat from @ai-sdk/react):
 *   { id, messages: UIMessage[], propertyId: string }
 *
 * Flow:
 *   1. Authenticate user via Supabase cookie session.
 *   2. Fetch property details to build the track-specific system prompt.
 *   3. Find or create a bot_conversations record for (user, property).
 *   4. Stream GPT-4o with the approve_candidate tool.
 *   5. approve_candidate.execute → update conversation to 'approved' + insert lead.
 *   6. Return toUIMessageStreamResponse() so useChat can render the stream.
 */
export async function POST(req: Request) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  const body = await req.json()
  const messages: UIMessage[] = body.messages ?? []
  const propertyId: string | undefined = body.propertyId

  if (!propertyId) {
    return new Response(JSON.stringify({ error: 'propertyId required' }), {
      status: 400,
    })
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    })
  }

  // ── Fetch property ───────────────────────────────────────────────────────────
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (propError || !property) {
    return new Response(JSON.stringify({ error: 'Property not found' }), {
      status: 404,
    })
  }

  // ── Find or create bot_conversations record ──────────────────────────────────
  // We look for the most recent conversation for this (user, property) pair.
  // If none exists (first message), create one with status 'in_progress'.
  let conversationId: string

  const { data: existing } = await supabase
    .from('bot_conversations')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    conversationId = existing.id
  } else {
    const { data: created, error: createErr } = await supabase
      .from('bot_conversations')
      .insert({
        user_id:     user.id,
        property_id: propertyId,
        track:       property.category,
        status:      'in_progress',
        messages:    [],
      })
      .select('id')
      .single()

    if (createErr || !created) {
      console.error('[/api/chat] failed to create conversation:', createErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to start conversation' }), {
        status: 500,
      })
    }
    conversationId = created.id
  }

  // ── Build system prompt ─────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(property)

  // ── Service-role client for tool side-effects (bypasses RLS) ────────────────
  const serviceClient = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // convertToModelMessages is async in AI SDK v6 — must be awaited before streamText
  const modelMessages = await convertToModelMessages(messages)

  // ── Stream ──────────────────────────────────────────────────────────────────
  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: modelMessages,

    // ── Tool: approve_candidate ───────────────────────────────────────────────
    // The LLM calls this when the candidate satisfies all screening conditions.
    // The execute function runs server-side, updates the DB, and returns a
    // structured result that the client uses to display the WhatsApp CTA.
    tools: {
      approve_candidate: tool({
        description:
          'Call this tool ONLY when the candidate has fully satisfied all screening conditions and should be connected to the property owner. Do not call it prematurely.',
        inputSchema: z.object({
          summary: z
            .string()
            .describe(
              'A one-sentence Hebrew summary of why the candidate was approved, e.g. "מועמד מאושר — תקציב מתאים, ללא חיות מחמד, כניסה בתאריך המתאים."',
            ),
        }),
        execute: async ({ summary }) => {
          // Update conversation status to 'approved'
          await serviceClient
            .from('bot_conversations')
            .update({ status: 'approved', rejection_reason: null })
            .eq('id', conversationId)

          // Insert lead row (idempotent via upsert)
          await serviceClient.from('leads').upsert(
            {
              user_id:         user.id,
              property_id:     propertyId,
              conversation_id: conversationId,
            },
            { onConflict: 'user_id,property_id' },
          )

          // Return the data the client needs to render the WhatsApp CTA
          return {
            approved:      true,
            summary,
            contact_phone: property.contact_phone ?? null,
            property_title: property.title,
          }
        },
      }),
    },

    // Save full message history to the conversation record on completion
    onFinish: async ({ response }) => {
      // Persist the messages array as JSON for analytics / future resume
      const rawMessages = response.messages.map((m) => ({
        role:      m.role,
        content:   Array.isArray(m.content)
          ? m.content.map((c: unknown) => {
              const part = c as Record<string, unknown>
              return typeof part.text === 'string' ? part.text : JSON.stringify(c)
            }).join('')
          : String(m.content),
        timestamp: new Date().toISOString(),
      }))

      await serviceClient
        .from('bot_conversations')
        .update({ messages: rawMessages as unknown as Json[], updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    },
  })

  return result.toUIMessageStreamResponse()
}
