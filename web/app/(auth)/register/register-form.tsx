'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
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
          {/* Success banner */}
          {state?.success && (
            <div
              role="status"
              className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 text-center"
            >
              {state.success}
            </div>
          )}

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
