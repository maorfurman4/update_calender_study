import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'property-photos'
const MAX_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

/**
 * POST /api/upload
 * Body: { fileName: string; contentType: string }
 *
 * Returns a Supabase Storage signed upload URL plus the resulting public URL.
 * The client uses the signedUrl to PUT the file directly to Storage,
 * keeping the binary off our Next.js server.
 *
 * Storage path: {userId}/{uuid}-{originalFileName}
 * This satisfies the RLS policy: (storage.foldername(name))[1] = auth.uid()
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.fileName || !body?.contentType) {
    return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 })
  }

  const { fileName, contentType } = body as { fileName: string; contentType: string }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  // Scoped path — satisfies the RLS foldername check
  const storagePath = `${user.id}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false })

  if (error || !data) {
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  // Derive the public URL for the file once uploaded
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl: publicData.publicUrl,
    maxMB: MAX_MB,
  })
}
