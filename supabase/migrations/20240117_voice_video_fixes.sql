ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-attachments' AND auth.uid() = (owner)::uuid);
