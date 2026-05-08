'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginAction, oauthAction, type AuthResult } from '@/lib/auth/actions'

// ─── OAuth provider button config ────────────────────────────────────────────

const OAUTH_PROVIDERS = [
  {
    provider: 'google' as const,
    labelKey: 'login_with_google' as const,
    // Google G logo (inline SVG — no external dependency)
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    provider: 'apple' as const,
    labelKey: 'login_with_apple' as const,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    ),
  },
  {
    provider: 'facebook' as const,
    labelKey: 'login_with_facebook' as const,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
] as const

// ─── OAuthButton ─────────────────────────────────────────────────────────────

function OAuthButton({
  provider,
  icon,
  label,
}: {
  provider: string
  icon: React.ReactNode
  label: string
}) {
  const [, formAction, isPending] = useActionState(oauthAction, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="provider" value={provider} />
      <Button
        type="submit"
        variant="outline"
        className="w-full gap-2 border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-dark)]"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        <span>{label}</span>
      </Button>
    </form>
  )
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const [state, formAction, isPending] = useActionState(loginAction, null)

  return (
    <Card className="w-full max-w-sm border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
      <CardHeader className="text-center pb-2">
        {/* App wordmark — no letter-spacing on Hebrew */}
        <div className="text-3xl font-black text-[var(--color-primary)] mb-1">נדל״ן</div>
        <CardTitle className="text-xl font-bold text-[var(--color-dark)]">
          {t('login')}
        </CardTitle>
        <CardDescription className="text-[var(--color-muted)]">
          {t('no_account')}{' '}
          <Link
            href="/register"
            className="text-[var(--color-primary)] font-semibold underline-offset-2 hover:underline"
          >
            {t('register')}
          </Link>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* OAuth buttons */}
        <div className="flex flex-col gap-2">
          {OAUTH_PROVIDERS.map(({ provider, labelKey, icon }) => (
            <OAuthButton
              key={provider}
              provider={provider}
              icon={icon}
              label={t(labelKey)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-muted)]">{tCommon('or')}</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* Email / password form */}
        <form action={formAction} className="flex flex-col gap-3">
          {/* Preserve the redirect destination */}
          <input type="hidden" name="next" value={next} />

          {/* Error banner */}
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[var(--color-dark)] text-sm font-medium">
                {t('password')}
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[var(--color-primary)] hover:underline underline-offset-2"
              >
                {t('forgot_password')}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('password_placeholder')}
              required
              className="border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-primary)]"
            />
          </div>

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
              t('login')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
