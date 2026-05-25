CREATE INDEX IF NOT EXISTS idx_user_resources_content_hash
  ON public.user_resources (((meta->>'content_hash')));

CREATE OR REPLACE FUNCTION public.get_course_snapshots(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.last_opened_at DESC NULLS LAST, t.code), '[]'::jsonb)
  FROM (
    SELECT
      c.id,
      c.code,
      c.name,
      c.department,
      c.level,
      (
        SELECT count(*)::int FROM public.tutor_announcements ta
        WHERE ta.course_id = c.id
          AND ta.created_at > coalesce(
            (SELECT opened_at FROM public.recently_opened_courses
              WHERE user_id = _user_id AND course_id = c.id),
            'epoch'::timestamptz
          )
      ) AS unread_updates,
      (SELECT opened_at FROM public.recently_opened_courses
        WHERE user_id = _user_id AND course_id = c.id) AS last_opened_at
    FROM public.student_courses sc
    JOIN public.courses c ON c.id = sc.course_id
    WHERE sc.student_id = _user_id
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_snapshots(uuid) TO authenticated;