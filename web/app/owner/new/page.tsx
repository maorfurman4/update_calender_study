import type { Metadata } from 'next'
import { PageShell } from '@/components/shared/PageShell'
import { NewPropertyForm } from './new-property-form'

export const metadata: Metadata = {
  title: 'פרסם נכס — נדל״ן',
}

/**
 * P3-3: Owner — Publish new property.
 * Server Component shell; all form logic is in NewPropertyForm (Client Component).
 */
export default function NewPropertyPage() {
  return (
    <PageShell>
      <NewPropertyForm />
    </PageShell>
  )
}
