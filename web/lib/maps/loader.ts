import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let initialized = false

/**
 * Initialize the Google Maps JS API loader (idempotent, browser-only).
 * Uses @googlemaps/js-api-loader v2 functional API.
 * Note v2 changed: 'key' (not 'apiKey'), 'v' (not 'version').
 */
export function initMapsLoader() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    v: 'weekly',
    libraries: ['places'],
    language: 'he',
    region: 'IL',
  })
}

/**
 * Load a specific Google Maps library.
 * Wraps importLibrary() with automatic init. Safe to call multiple times.
 */
export async function loadMapsLibrary(
  name: Parameters<typeof importLibrary>[0],
) {
  initMapsLoader()
  return importLibrary(name)
}
