-- Phase 3: Personal Resource Library

-- 1) Enum for resource kinds
DO $$ BEGIN
  CREATE TYPE public.resource_kind AS ENUM (
    'pdf', 'image', 'note', 'flashcard', 'study_pack', 'audio'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Resources table
CREATE TABLE IF NOT EXISTS public.user_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.resource_kind NOT NULL,
  title TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'General',
  storage_path TEXT NOT NULL,
  mime TEXT,
  size_bytes BIGINT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_resources_user_id ON public.user_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resources_user_folder ON public.user_resources(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_user_resources_user_kind ON public.user_resources(user_id, kind);

ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their resources" ON public.user_resources;
CREATE POLICY "Owners can view their resources"
  ON public.user_resources FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert their resources" ON public.user_resources;
CREATE POLICY "Owners can insert their resources"
  ON public.user_resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their resources" ON public.user_resources;
CREATE POLICY "Owners can update their resources"
  ON public.user_resources FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their resources" ON public.user_resources;
CREATE POLICY "Owners can delete their resources"
  ON public.user_resources FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_resources_updated_at ON public.user_resources;
CREATE TRIGGER trg_user_resources_updated_at
  BEFORE UPDATE ON public.user_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-resources', 'user-resources', false)
ON CONFLICT (id) DO NOTHING;

-- 4) Storage policies — folder-per-user
DROP POLICY IF EXISTS "Users can list own resources" ON storage.objects;
CREATE POLICY "Users can list own resources"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own resources" ON storage.objects;
CREATE POLICY "Users can upload own resources"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own resources" ON storage.objects;
CREATE POLICY "Users can update own resources"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own resources" ON storage.objects;
CREATE POLICY "Users can delete own resources"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );