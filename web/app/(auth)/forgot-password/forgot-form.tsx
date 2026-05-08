'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { forgotPasswordAction } from '@/lib/auth/actions'

export function ForgotForm() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null)

  return (
    <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="text-3xl font-black text-[var(--color-primary)] mb-1">נדל״ן</div>
        <CardTitle className="text-xl font-bold text-[var(--color-dark)]">
          {t('forgot_password')}
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
          {state?.success && (
            <div
              role="status"
              className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 text-center"
            >
              {state.success}
            </div>
          )}
          {state?.error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-center"
            >
              {state.error}
            </div>
          )}

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

          <Button
            type="submit"
            disabled={isPending || !!state?.success}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-dark)] text-white font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-2" />
                {tCommon('loading')}
              </>
            ) : (
              tCommon('submit')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
