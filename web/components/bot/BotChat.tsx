'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Send, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { MessageBubble } from './MessageBubble'
import { isToolUIPart } from 'ai'
import type { Property } from '@/lib/supabase/types'

interface BotChatProps {
  property: Property
  /**
   * The bot's opening message shown before the user types anything.
   * Generated server-side from the property category.
   */
  greeting: string
}

/**
 * BotChat — client-side AI chat UI.
 *
 * Uses useChat from @ai-sdk/react v3 (paired with AI SDK v6).
 *
 * Approval detection:
 *   Scans the messages array for a part with type 'tool-approve_candidate'
 *   and state 'output-available'. When found, the WhatsApp CTA is surfaced
 *   inside the MessageBubble (ApprovalCard) — no extra state needed.
 *
 * sendMessage (v6 API replaces append from v3/v4).
 */
export function BotChat({ property, greeting }: BotChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    api: '/api/chat',
    // Extra body fields merged into every request
    body: { propertyId: property.id },
    // Seed the chat with the bot's opening greeting as a synthetic assistant message
    initialMessages: [
      {
        id:    'greeting',
        role:  'assistant',
        parts: [{ type: 'text', text: greeting }],
        createdAt: new Date(),
      },
    ],
  })

  // ── Auto-scroll to latest message ─────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Detect approval (for disabling the input after approval) ──────────────
  const isApproved = messages.some((m) =>
    m.parts?.some(
      (p) =>
        isToolUIPart(p) &&
        p.type === 'tool-approve_candidate' &&
        p.state === 'output-available' &&
        (p as any).output?.approved === true,
    ),
  )

  const isStreaming = status === 'streaming' || status === 'submitted'

  // ── Send handler ───────────────────────────────────────────────────────────
  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = inputRef.current
    if (!input || !input.value.trim() || isStreaming || isApproved) return

    sendMessage({ role: 'user', parts: [{ type: 'text', text: input.value.trim() }] })
    input.value = ''
    input.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Property context header ─────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Link
          href="/swipe"
          className="text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
          aria-label="חזרה לגלישה"
        >
          <ArrowRight size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-dark)] line-clamp-1">
            {property.title}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            ₪{property.price.toLocaleString('he-IL')} · {property.address}
          </p>
        </div>
        {/* Category pill */}
        <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
          {property.category === 'rental'
            ? 'השכרה'
            : property.category === 'sale'
            ? 'מכירה'
            : 'שותפים'}
        </span>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator */}
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-ss-sm bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-xs text-red-500 py-2">
            שגיאה בחיבור. נסה שוב.
          </p>
        )}

        {/* After approval: disable prompt, show return CTA */}
        {isApproved && (
          <div className="mt-4 text-center">
            <Link
              href="/swipe"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors"
            >
              חזרה לגלישה
            </Link>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className={`
          shrink-0 flex items-center gap-2 px-3 py-3
          border-t border-[var(--color-border)] bg-[var(--color-bg)]
          ${isApproved ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={isStreaming || isApproved}
          placeholder={isApproved ? 'השיחה הסתיימה' : 'כתוב תשובה...'}
          className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-60"
          dir="auto"
        />
        <button
          type="submit"
          disabled={isStreaming || isApproved}
          className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white hover:bg-[var(--color-dark)] transition-colors disabled:opacity-50"
          aria-label="שלח"
        >
          {isStreaming ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  )
}
