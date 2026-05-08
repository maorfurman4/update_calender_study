'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, ImagePlus, Loader2 } from 'lucide-react'

const MAX_PHOTOS = 10
const MAX_MB = 10

interface UploadedPhoto {
  id: string            // client-only key
  publicUrl: string
  previewUrl: string    // local object URL for instant preview
  status: 'uploading' | 'done' | 'error'
  progress: number      // 0-100
  errorMsg?: string
}

interface ImageUploadProps {
  value: string[]                       // controlled: array of publicUrls
  onChange: (urls: string[]) => void   // notify parent
}

/**
 * ImageUpload — drag-and-drop / click zone.
 *
 * Flow:
 *   1. User selects / drops files
 *   2. For each file, call POST /api/upload → get signedUrl + publicUrl
 *   3. PUT file to signedUrl (Supabase Storage, binary never hits Next.js)
 *   4. On success, call onChange with updated publicUrl array
 *
 * Uses CSS Logical Properties throughout (no physical left/right).
 */
export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const t = useTranslations('owner')
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const canAdd = value.length + photos.filter((p) => p.status === 'uploading').length < MAX_PHOTOS

  // ── Upload a single File ──────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`הקובץ גדול מ-${MAX_MB}MB`)
        return
      }

      const clientId = `${Date.now()}-${Math.random()}`
      const previewUrl = URL.createObjectURL(file)

      // Optimistic add with progress 0
      setPhotos((prev) => [
        ...prev,
        { id: clientId, publicUrl: '', previewUrl, status: 'uploading', progress: 0 },
      ])

      try {
        // 1. Get signed URL from our API
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        })
        if (!res.ok) throw new Error('Failed to get upload URL')
        const { signedUrl, publicUrl } = (await res.json()) as {
          signedUrl: string
          publicUrl: string
        }

        // 2. PUT file directly to Supabase Storage via XHR (for progress tracking)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', signedUrl)
          xhr.setRequestHeader('Content-Type', file.type)

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              setPhotos((prev) =>
                prev.map((p) => (p.id === clientId ? { ...p, progress: pct } : p)),
              )
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed: ${xhr.status}`))
          }
          xhr.onerror = () => reject(new Error('Network error'))
          xhr.send(file)
        })

        // 3. Mark done and propagate publicUrl to parent
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === clientId ? { ...p, status: 'done', progress: 100, publicUrl } : p,
          ),
        )
        onChange([...value, publicUrl])
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === clientId ? { ...p, status: 'error', errorMsg: 'שגיאה בהעלאה' } : p,
          ),
        )
      }
    },
    [value, onChange],
  )

  // ── Handle file selection ─────────────────────────────────────────────────
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const allowed = Array.from(files).slice(0, MAX_PHOTOS - value.length)
      allowed.forEach(uploadFile)
    },
    [value.length, uploadFile],
  )

  // ── Remove a photo ────────────────────────────────────────────────────────
  const removePhoto = useCallback(
    (clientId: string) => {
      setPhotos((prev) => {
        const target = prev.find((p) => p.id === clientId)
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
        const next = prev.filter((p) => p.id !== clientId)
        if (target?.status === 'done') {
          onChange(value.filter((u) => u !== target.publicUrl))
        }
        return next
      })
    },
    [value, onChange],
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`
            w-full rounded-xl border-2 border-dashed transition-colors duration-150
            flex flex-col items-center justify-center gap-2 py-8 px-4
            ${isDragOver
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]'
            }
          `}
          aria-label={t('upload_photos')}
        >
          <ImagePlus
            size={32}
            className={isDragOver ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}
          />
          <span className="text-sm font-medium text-[var(--color-dark)]">{t('drag_photos')}</span>
          <span className="text-xs text-[var(--color-muted)]">{t('upload_hint')}</span>
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]"
            >
              {/* Preview image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="w-full h-full object-cover"
              />

              {/* Upload progress overlay */}
              {photo.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                  <Loader2 size={20} className="text-white animate-spin" />
                  <span className="text-white text-xs font-medium">{photo.progress}%</span>
                  {/* Progress bar */}
                  <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-200"
                      style={{ width: `${photo.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {photo.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                  <span className="text-white text-xs text-center px-1">{photo.errorMsg}</span>
                </div>
              )}

              {/* Remove button */}
              {photo.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 end-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 transition-colors"
                  aria-label="הסר תמונה"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-[var(--color-muted)] text-center">
        {value.length} / {MAX_PHOTOS} תמונות
      </p>
    </div>
  )
}
