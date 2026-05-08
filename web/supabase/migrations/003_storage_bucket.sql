-- Migration: 003_storage_bucket
-- P1-8: property-photos bucket with public read, auth upload, owner delete

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public)
CREATE POLICY "property_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

-- Authenticated users may upload into their own folder: {user_id}/filename
CREATE POLICY "property_photos_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may only update/delete their own files
CREATE POLICY "property_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
