-- Create storage bucket for deliverable files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliverable-files',
  'deliverable-files',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
        'video/mp4','video/webm','video/quicktime',
        'application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip','application/x-rar-compressed',
        'audio/mpeg','audio/wav','audio/ogg','audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
DROP POLICY IF EXISTS "Public Read deliverable-files" ON storage.objects;
CREATE POLICY "Public Read deliverable-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deliverable-files');

-- Allow authenticated insert
DROP POLICY IF EXISTS "Auth Insert deliverable-files" ON storage.objects;
CREATE POLICY "Auth Insert deliverable-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deliverable-files');

-- Allow authenticated update
DROP POLICY IF EXISTS "Auth Update deliverable-files" ON storage.objects;
CREATE POLICY "Auth Update deliverable-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'deliverable-files');

-- Allow authenticated delete
DROP POLICY IF EXISTS "Auth Delete deliverable-files" ON storage.objects;
CREATE POLICY "Auth Delete deliverable-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'deliverable-files');
