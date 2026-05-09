'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { registerAction } from '@/lib/auth/actions'

const ROLE_OPTIONS = [
  { value: 'renter', labelKey: 'role_renter' as const },
  { value: 'owner', labelKey: 'role_owner' as const },
  { value: 'both', labelKey: 'role_both' as const },
] as const

export function RegisterForm() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const [state, formAction, isPending] = useActionState(registerAction, null)

  // Hard-navigate after successful registration so new session cookies are
  // flushed before the next page renders (same pattern as login).
  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo
    }
  }, [state?.redirectTo])

  // ── Premium "check your inbox" success screen ──────────────────────────
  if (state?.success === 'confirm_email') {
    return (
      <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
        {/* Decorative top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)]" />

        <CardContent className="flex flex-col items-center gap-5 pt-8 pb-8 text-center" dir="rtl">
          {/* Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Mail className="w-9 h-9 text-[var(--color-primary)]" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-[var(--color-dark)]">
              {t('confirm_email_title')}
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-[240px]">
              {t('confirm_email_body')}
            </p>
          </div>

          {/* Steps */}
          <div className="w-full rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)] text-right">
            {[
              { n: '1', label: t('confirm_step_1') },
              { n: '2', label: t('confirm_step_2') },
              { n: '3', label: t('confirm_step_3') },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
                  {n}
                </span>
                <span className="text-sm text-[var(--color-dark)]">{label}</span>
              </div>
            ))}
          </div>

          {/* Back to login */}
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--color-primary)] hover:underline underline-offset-2"
          >
            {t('back_to_login')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="text-3xl font-black text-[var(--color-primary)] mb-1">נדל״ן</div>
        <CardTitle className="text-xl font-bold text-[var(--color-dark)]">
          {t('register')}
        </CardTitle>
        <CardDescription className="text-[var(--color-muted)]">
          {t('have_account')}{' '}
          <Link
            href="/login"
            className="text-[var(--color-primary)] font-semibold underline-offset-2 hover:underline"
          >
            {t('login')}
          </Link>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          {/* Error banner */}
          {state?.error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-center"
            >
              {state.error}
            </div>
          )}

          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-[var(--color-dark)] text-sm font-medium">
              {t('full_name')}
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-[var(--color-dark)] text-sm font-medium">
              {t('email')}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('email_placeholder')}
              required
              className="border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-[var(--color-dark)] text-sm font-medium">
              {t('password')}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('password_placeholder')}
              required
              className="border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          {/* Phone (optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-[var(--color-dark)] text-sm font-medium">
              {t('phone')}{' '}
              <span className="text-[var(--color-muted)] font-normal text-xs">(אופציונלי)</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              dir="ltr"
              className="border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          {/* Role selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[var(--color-dark)] text-sm font-medium">{t('role_label')}</span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('role_label')}>
              {ROLE_OPTIONS.map(({ value, labelKey }) => (
                <label
                  key={value}
                  className="relative cursor-pointer"
                  aria-label={t(labelKey)}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    defaultChecked={value === 'renter'}
                    className="peer sr-only"
                  />
                  <div
                    className="
                      rounded-lg border border-[var(--color-border)]
                      bg-[var(--color-bg)] px-2 py-2.5 text-center text-xs font-medium
                      text-[var(--color-muted)] transition-all
                      peer-checked:border-[var(--color-primary)]
                      peer-checked:bg-[var(--color-primary)]
                      peer-checked:text-white
                      hover:border-[var(--color-primary)]
                    "
                  >
                    {t(labelKey)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-[var(--color-muted)]">{t('terms')}</p>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full mt-1 bg-[var(--color-primary)] hover:bg-[var(--color-dark)] text-white font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-2" />
                {tCommon('loading')}
              </>
            ) : (
              t('register')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
