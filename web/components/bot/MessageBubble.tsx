'use client'

import type { UIMessage } from 'ai'
import { isToolUIPart, isTextUIPart } from 'ai'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface MessageBubbleProps {
  message: UIMessage
}

/**
 * MessageBubble — renders a single chat message.
 *
 * Handles two part types from the AI SDK v6 UIMessage:
 *   - text parts → standard chat bubble
 *   - tool-invocation parts (approve_candidate) → approval card
 *
 * RTL: user messages are on the inline-end (right in RTL/LTR agnostic).
 * CSS Logical Properties used throughout.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`
          max-w-[80%] flex flex-col gap-2
          ${isUser ? 'items-end' : 'items-start'}
        `}
      >
        {message.parts?.map((part, i) => {
          // ── Text part ────────────────────────────────────────────────────
          if (isTextUIPart(part)) {
            if (!part.text) return null
            return (
              <div
                key={i}
                className={`
                  rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${isUser
                    ? 'bg-[var(--color-primary)] text-white rounded-se-sm'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-dark)] rounded-ss-sm'
                  }
                `}
              >
                {part.text}
                {part.state === 'streaming' && (
                  <span className="inline-block w-1.5 h-4 ms-0.5 bg-current opacity-70 animate-pulse rounded-sm align-middle" />
                )}
              </div>
            )
          }

          // ── Tool-invocation part (approve_candidate) ─────────────────────
          if (isToolUIPart(part)) {
            if (part.state === 'input-streaming' || part.state === 'input-available') {
              // Tool is being called — show a small spinner
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                  <span className="text-xs text-[var(--color-muted)]">מעבד...</span>
                </div>
              )
            }

            interface ApproveToolOutput {
              approved: boolean
              summary: string
              contact_phone: string | null
              property_title: string
            }
            const toolPart = part as unknown as { output?: ApproveToolOutput }
            if (part.state === 'output-available' && toolPart.output?.approved) {
              const output = toolPart.output

              return (
                <ApprovalCard key={i} output={output} />
              )
            }
          }

          return null
        })}
      </div>
    </div>
  )
}

// ─── Approval card (shown after approve_candidate tool fires) ─────────────────

function ApprovalCard({
  output,
}: {
  output: {
    approved: boolean
    summary: string
    contact_phone: string | null
    property_title: string
  }
}) {
  const whatsappText = encodeURIComponent(
    `שלום, ראיתי את המודעה "${output.property_title}" בנדלן ועברתי את תהליך הסינון. אשמח לדבר!`,
  )
  const whatsappUrl = output.contact_phone
    ? `https://wa.me/${output.contact_phone.replace(/\D/g, '')}?text=${whatsappText}`
    : null

  return (
    <div className="w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
        <span className="font-bold text-emerald-700 text-sm">! מאושר — נמצאה התאמה</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-emerald-700/80 leading-relaxed">{output.summary}</p>

      {/* WhatsApp CTA */}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1ebe5d] transition-colors"
        >
          {/* WhatsApp icon inline SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          פנה לבעל הנכס בוואטסאפ
        </a>
      ) : (
        <p className="text-xs text-emerald-700 text-center">
          פרטי הקשר יועברו אליך בקרוב.
        </p>
      )}
    </div>
  )
}
