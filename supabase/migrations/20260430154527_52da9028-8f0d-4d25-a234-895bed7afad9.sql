ALTER TABLE public.lecture_notes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

CREATE OR REPLACE FUNCTION public.increment_lecture_note_download(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lecture_notes
  SET download_count = download_count + 1
  WHERE id = p_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_lecture_note_view(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lecture_notes
  SET view_count = view_count + 1
  WHERE id = p_note_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_lecture_note_download(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_lecture_note_view(uuid) TO anon, authenticated;