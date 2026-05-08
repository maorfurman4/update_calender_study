import { getRequestConfig } from 'next-intl/server'

// Single-language setup: Hebrew only.
// No locale routing — 'he' is always the active locale.
export default getRequestConfig(async () => {
  const locale = 'he'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
