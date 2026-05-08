'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { initMapsLoader } from '@/lib/maps/loader'

interface PlaceResult {
  address: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  value: string
  onPlaceSelect: (result: PlaceResult) => void
  error?: string
}

/**
 * AddressAutocomplete — Google Maps Places Autocomplete input.
 *
 * On place_changed:
 *   - Extracts geometry.location → lat() / lng()
 *   - Calls onPlaceSelect({ address, lat, lng })
 *   - Parent stores lat/lng in hidden RHF fields for PostGIS conversion
 *
 * Uses @googlemaps/js-api-loader v2 importLibrary('places').
 */
export function AddressAutocomplete({ value, onPlaceSelect, error }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        initMapsLoader()
        const { importLibrary } = await import('@googlemaps/js-api-loader')
        const { Autocomplete } = (await importLibrary('places')) as google.maps.PlacesLibrary

        if (cancelled || !inputRef.current) return

        autocompleteRef.current = new Autocomplete(inputRef.current, {
          // Bias to Israel; accept any worldwide address too
          componentRestrictions: { country: 'il' },
          fields: ['geometry', 'formatted_address'],
          types: ['geocode', 'establishment'],
        })

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current!.getPlace()
          const location = place.geometry?.location
          if (!location || !place.formatted_address) return

          onPlaceSelect({
            address: place.formatted_address,
            lat: location.lat(),
            lng: location.lng(),
          })
        })

        setReady(true)
      } catch (err) {
        console.warn('Google Maps failed to load:', err)
        // Graceful degradation — input still works as plain text
        setReady(true)
      }
    }

    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center">
        <MapPin size={16} className="text-[var(--color-muted)]" />
      </div>

      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder="הקלד כתובת..."
        disabled={!ready}
        autoComplete="off"
        className={`
          w-full rounded-md border px-3 py-2 ps-9 text-sm
          bg-[var(--color-bg)] text-[var(--color-dark)]
          placeholder:text-[var(--color-muted)]
          outline-none transition-shadow
          focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0
          disabled:opacity-50
          ${error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-[var(--color-border)]'
          }
        `}
        aria-invalid={!!error}
        aria-describedby={error ? 'address-error' : undefined}
      />

      {error && (
        <p id="address-error" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
