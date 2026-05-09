'use client'

import { useActionState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resetPasswordAction } from '@/lib/auth/actions'

export function ResetForm() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

  const [state, formAction, isPending] = useActionState(resetPasswordAction, null)

  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo
  }, [state?.redirectTo])

  return (
    <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="text-3xl font-black text-[var(--color-primary)] mb-1">נדל״ן</div>
        <CardTitle className="text-xl font-bold text-[var(--color-dark)]">
          {t('reset_password')}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          {state?.error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-center"
            >
              {state.error}
            </div>
          )}

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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-dark)] text-white font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin me-2" />
                {tCommon('loading')}
              </>
            ) : (
              tCommon('confirm')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
