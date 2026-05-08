'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

// ─── Validation schemas ───────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(60),
  phone: z.string().optional(),
  role: z.enum(['owner', 'renter', 'both'] as const).default('renter'),
})

const ForgotSchema = z.object({
  email: z.string().email(),
})

const ResetSchema = z.object({
  password: z.string().min(6),
})

// ─── Shared result type ───────────────────────────────────────────────────────

export interface AuthResult {
  error?: string
  success?: string
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'אימייל או סיסמה לא תקינים' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: 'האימייל או הסיסמה שגויים' }
  }

  // Read redirect destination from form (hidden input set by login page)
  const next = (formData.get('next') as string) || '/swipe'
  redirect(next.startsWith('/') ? next : '/swipe')
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
    role: (formData.get('role') as UserRole) || 'renter',
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message
    return { error: first ?? 'פרטים לא תקינים' }
  }

  const { email, password, name, phone, role } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone ?? null,
        role,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'כתובת האימייל כבר קיימת במערכת' }
    }
    return { error: 'שגיאה בהרשמה, נסה שוב' }
  }

  // Supabase sends a confirmation email; show success message
  return { success: 'נשלח אימייל אישור — בדוק את תיבת הדואר שלך' }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

type OAuthProvider = 'google' | 'apple' | 'facebook'

export async function oauthAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const provider = formData.get('provider') as OAuthProvider
  if (!provider) return { error: 'ספק לא ידוע' }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? ''

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return { error: 'שגיאה בהתחברות עם הספק הנבחר' }
  }

  redirect(data.url)
}

// ─── Forgot password ──────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const raw = { email: formData.get('email') as string }
  const parsed = ForgotSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'אימייל לא תקין' }
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? ''

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: 'שגיאה בשליחת מייל האיפוס' }
  }

  return { success: 'נשלח לינק לאיפוס סיסמה — בדוק את תיבת הדואר' }
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const raw = { password: formData.get('password') as string }
  const parsed = ResetSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: 'שגיאה באיפוס הסיסמה' }
  }

  redirect('/swipe')
}
