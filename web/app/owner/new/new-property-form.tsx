'use client'

import { useState, useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { AddressAutocomplete } from '@/components/owner/AddressAutocomplete'
import {
  PropertySchema,
  type PropertyFormData,
  createPropertyAction,
} from '@/lib/properties/actions'

const TOTAL_STEPS = 4

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEP_LABELS = ['סוג וכותרת', 'מיקום ומחיר', 'תמונות', 'פרטים נוספים']

// ─── Category options ─────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: 'rental', label: 'להשכרה' },
  { value: 'sale', label: 'למכירה' },
  { value: 'roommates', label: 'שותפים' },
] as const

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i < current
              ? 'bg-[var(--color-primary)]'
              : 'bg-[var(--color-border)]'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Reusable field wrapper ───────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
  optional,
}: {
  label: string
  error?: string
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-[var(--color-dark)]">
        {label}
        {optional && (
          <span className="ms-1 text-xs font-normal text-[var(--color-muted)]">(אופציונלי)</span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Shared input class ───────────────────────────────────────────────────────
const inputCls =
  'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus-visible:ring-[var(--color-primary)]'

// ─── Toggle checkbox ──────────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => e.key === ' ' && onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
            checked ? 'end-1' : 'start-1'
          }`}
        />
      </div>
      <span className="text-sm text-[var(--color-dark)]">{label}</span>
    </label>
  )
}

// ─── NewPropertyForm ──────────────────────────────────────────────────────────

export function NewPropertyForm() {
  const t = useTranslations('owner')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  // @hookform/resolvers@5.2.2 has a type inference gap with Zod v4 schemas.
  // The cast through `unknown` is safe: the runtime behaviour is correct.
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(PropertySchema) as unknown as Resolver<PropertyFormData>,
    defaultValues: {
      category: 'rental',
      title: '',
      description: '',
      price: '' as unknown as number,    // empty string renders empty input; Zod rejects on submit
      address: '',
      lat: '' as unknown as number,
      lng: '' as unknown as number,
      arnona: 0,
      vaad: 0,
      entry_date: '',
      photos: [],
      rooms: undefined,
      size_sqm: undefined,
      floor: undefined,
      pets_allowed: false,
      parking: false,
      storage: false,
      contact_phone: '',
      contact_hours: '',
    },
  })

  const { register, formState: { errors }, watch, setValue, trigger } = form

  // ── Step navigation ─────────────────────────────────────────────────────────
  const STEP_FIELDS: (keyof PropertyFormData)[][] = [
    ['category', 'title', 'description'],
    ['address', 'lat', 'lng', 'price', 'arnona', 'vaad', 'entry_date'],
    ['photos'],
    ['rooms', 'size_sqm', 'floor', 'contact_phone', 'contact_hours'],
  ]

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step - 1])
    if (valid) setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  const goPrev = () => setStep((s) => Math.max(s - 1, 1))

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = form.handleSubmit((data) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createPropertyAction(data)
      if (result.error) {
        setServerError(result.error)
      } else {
        setSubmitted(true)
        setTimeout(() => router.push(`/owner/listings`), 1500)
      }
    })
  })

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <CheckCircle2 size={56} className="text-green-500" />
        <p className="text-lg font-bold text-[var(--color-dark)]">הנכס פורסם בהצלחה!</p>
        <p className="text-sm text-[var(--color-muted)]">מעביר אותך לדף הנכסים...</p>
      </div>
    )
  }

  const photos = watch('photos')
  const category = watch('category')
  const petsAllowed = watch('pets_allowed')
  const parking = watch('parking')
  const storage = watch('storage')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[var(--color-dark)] mb-1">{t('publish_title')}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-4">
        שלב {step} מתוך {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
      </p>

      <StepBar current={step} total={TOTAL_STEPS} />

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[var(--color-dark)]">
            {STEP_LABELS[step - 1]}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>

            {/* ── Step 1: Category + basics ─────────────────────────────── */}
            {step === 1 && (
              <>
                {/* Category radio */}
                <Field label={t('step_basic')} error={errors.category?.message}>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup">
                    {CATEGORY_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="cursor-pointer">
                        <input
                          type="radio"
                          value={value}
                          {...register('category')}
                          className="peer sr-only"
                        />
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 text-center text-sm font-medium text-[var(--color-muted)] transition-all peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:text-white hover:border-[var(--color-primary)]">
                          {label}
                        </div>
                      </label>
                    ))}
                  </div>
                </Field>

                {/* Title */}
                <Field label={t('title_label')} error={errors.title?.message}>
                  <Input
                    {...register('title')}
                    placeholder={t('title_placeholder')}
                    className={inputCls}
                  />
                </Field>

                {/* Description */}
                <Field label={t('description_label')} error={errors.description?.message} optional>
                  <textarea
                    {...register('description')}
                    placeholder={t('description_placeholder')}
                    rows={3}
                    className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${inputCls}`}
                  />
                </Field>
              </>
            )}

            {/* ── Step 2: Location + pricing ────────────────────────────── */}
            {step === 2 && (
              <>
                {/* Address via Google Maps */}
                <Field label={t('address_label')} error={errors.address?.message}>
                  <AddressAutocomplete
                    value={watch('address')}
                    onPlaceSelect={({ address, lat, lng }) => {
                      setValue('address', address, { shouldValidate: true })
                      setValue('lat', lat, { shouldValidate: true })
                      setValue('lng', lng, { shouldValidate: true })
                    }}
                    error={errors.address?.message ?? (errors.lat ? 'יש לבחור כתובת מהרשימה' : undefined)}
                  />
                </Field>

                {/* Price */}
                <Field
                  label={`${t('price_label')} (₪)`}
                  error={errors.price?.message}
                >
                  <Input
                    type="number"
                    min={0}
                    {...register('price', { valueAsNumber: true })}
                    className={`${inputCls} [direction:ltr] text-start`}
                    placeholder="0"
                  />
                </Field>

                {/* Arnona + Vaad side-by-side — only for rentals */}
                {category === 'rental' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`${t('arnona_label')} (₪)`} error={errors.arnona?.message}>
                      <Input
                        type="number"
                        min={0}
                        {...register('arnona', { valueAsNumber: true })}
                        className={`${inputCls} [direction:ltr] text-start`}
                        placeholder="0"
                      />
                    </Field>
                    <Field label={`${t('vaad_label')} (₪)`} error={errors.vaad?.message}>
                      <Input
                        type="number"
                        min={0}
                        {...register('vaad', { valueAsNumber: true })}
                        className={`${inputCls} [direction:ltr] text-start`}
                        placeholder="0"
                      />
                    </Field>
                  </div>
                )}

                {/* Entry date */}
                <Field label={t('entry_label')} error={errors.entry_date?.message} optional>
                  <Input
                    type="date"
                    {...register('entry_date')}
                    className={`${inputCls} [direction:ltr] text-start`}
                  />
                </Field>
              </>
            )}

            {/* ── Step 3: Photos ─────────────────────────────────────────── */}
            {step === 3 && (
              <Field label={t('upload_photos')} error={errors.photos?.message}>
                <ImageUpload
                  value={photos}
                  onChange={(urls) => setValue('photos', urls, { shouldValidate: true })}
                />
              </Field>
            )}

            {/* ── Step 4: Details ───────────────────────────────────────── */}
            {step === 4 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label={t('rooms_label')} error={errors.rooms?.message} optional>
                    <Input
                      type="number"
                      min={1}
                      step={0.5}
                      {...register('rooms', { valueAsNumber: true })}
                      className={`${inputCls} [direction:ltr] text-start`}
                      placeholder="3"
                    />
                  </Field>
                  <Field label={t('size_label')} error={errors.size_sqm?.message} optional>
                    <Input
                      type="number"
                      min={1}
                      {...register('size_sqm', { valueAsNumber: true })}
                      className={`${inputCls} [direction:ltr] text-start`}
                      placeholder="80"
                    />
                  </Field>
                  <Field label={t('floor_label')} error={errors.floor?.message} optional>
                    <Input
                      type="number"
                      {...register('floor', { valueAsNumber: true })}
                      className={`${inputCls} [direction:ltr] text-start`}
                      placeholder="2"
                    />
                  </Field>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-3 py-1">
                  <Toggle
                    label={t('pets_label')}
                    checked={petsAllowed}
                    onChange={(v) => setValue('pets_allowed', v)}
                  />
                  <Toggle
                    label={t('parking_label')}
                    checked={parking}
                    onChange={(v) => setValue('parking', v)}
                  />
                  <Toggle
                    label={t('storage_label')}
                    checked={storage}
                    onChange={(v) => setValue('storage', v)}
                  />
                </div>

                {/* Contact */}
                <Field label={t('contact_phone_label')} error={errors.contact_phone?.message} optional>
                  <Input
                    type="tel"
                    {...register('contact_phone')}
                    className={`${inputCls} [direction:ltr] text-start`}
                    placeholder="05X-XXXXXXX"
                  />
                </Field>
                <Field label={t('contact_hours_label')} error={errors.contact_hours?.message} optional>
                  <Input
                    {...register('contact_hours')}
                    className={inputCls}
                    placeholder="ראשון-חמישי 9:00-20:00"
                  />
                </Field>

                {/* Server error */}
                {serverError && (
                  <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-center">
                    {serverError}
                  </div>
                )}
              </>
            )}

            {/* ── Navigation ────────────────────────────────────────────── */}
            <div className={`flex gap-3 pt-2 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrev}
                  className="gap-1 border-[var(--color-border)] text-[var(--color-dark)]"
                >
                  <ChevronRight size={16} />
                  {tCommon('back')}
                </Button>
              )}

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="gap-1 bg-[var(--color-primary)] hover:bg-[var(--color-dark)] text-white"
                >
                  {tCommon('next')}
                  <ChevronLeft size={16} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-1 bg-[var(--color-primary)] hover:bg-[var(--color-dark)] text-white font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {tCommon('loading')}
                    </>
                  ) : (
                    t('publish_cta')
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
