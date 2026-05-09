'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches any runtime crash inside the Google Maps subtree and renders a
 * safe fallback instead of a blank page.
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MapErrorBoundary] caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg)] gap-3 px-6 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm font-semibold text-[var(--color-dark)]">
            שגיאה בטעינת המפה
          </p>
          <p className="text-xs text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-xs break-all">
            {this.state.error.message}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            פתח F12 → Console לפרטים נוספים
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
