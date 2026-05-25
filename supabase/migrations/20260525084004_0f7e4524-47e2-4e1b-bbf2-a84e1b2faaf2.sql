
-- 1) Tighten activity_events
DROP POLICY IF EXISTS "Authenticated can view activity feed" ON public.activity_events;
CREATE POLICY "View public or own activity"
ON public.activity_events
FOR SELECT TO authenticated
USING (visibility = 'public' OR actor_id = auth.uid());

-- 2) Schools: split owner/admin full access vs basic member access
DROP POLICY IF EXISTS schools_select_members ON public.schools;

CREATE POLICY schools_select_owner_admin
ON public.schools
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Sanitized view excluding sensitive verification fields
CREATE OR REPLACE VIEW public.schools_public
WITH (security_invoker=on) AS
SELECT
  id, owner_id, name, state, lga, address, logo_url, motto,
  principal_name, status, brand_color, report_footer, established_year,
  student_count, classes_offered, website, social_link,
  created_at, updated_at
FROM public.schools
WHERE is_school_member(id) OR owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.schools_public TO authenticated;

-- 3) Storage policy: students with confirmed bookings can read class recordings
DROP POLICY IF EXISTS "Students read booked class recordings" ON storage.objects;
CREATE POLICY "Students read booked class recordings"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'class-recordings'
  AND EXISTS (
    SELECT 1
    FROM public.live_recordings lr
    JOIN public.session_bookings sb ON sb.slot_id = lr.slot_id
    WHERE sb.student_id = auth.uid()
      AND sb.status = 'confirmed'
      AND lr.file_url LIKE '%' || storage.objects.name || '%'
  )
);

-- 4) Realtime: enable RLS and scope channels
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated scoped channel access" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated scoped channel send" ON realtime.messages;

CREATE POLICY "Authenticated scoped channel access"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  (realtime.topic() LIKE 'dm-%' AND position(auth.uid()::text in realtime.topic()) > 0)
  OR (realtime.topic() LIKE 'my-threads-%' AND realtime.topic() = 'my-threads-' || auth.uid()::text)
  OR (realtime.topic() LIKE 'notif-bell-%' AND realtime.topic() = 'notif-bell-' || auth.uid()::text)
  OR (realtime.topic() LIKE 'chat-%' AND EXISTS (
        SELECT 1 FROM public.chat_thread_members m
        WHERE m.thread_id::text = substring(realtime.topic() from 6)
          AND m.user_id = auth.uid()))
  OR (realtime.topic() LIKE 'team-chat-%' AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id::text = substring(realtime.topic() from 11)
          AND tm.user_id = auth.uid()))
  OR (
    realtime.topic() NOT LIKE 'dm-%'
    AND realtime.topic() NOT LIKE 'my-threads-%'
    AND realtime.topic() NOT LIKE 'notif-bell-%'
    AND realtime.topic() NOT LIKE 'chat-%'
    AND realtime.topic() NOT LIKE 'team-chat-%'
  )
);

CREATE POLICY "Authenticated scoped channel send"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() LIKE 'dm-%' AND position(auth.uid()::text in realtime.topic()) > 0)
  OR (realtime.topic() LIKE 'my-threads-%' AND realtime.topic() = 'my-threads-' || auth.uid()::text)
  OR (realtime.topic() LIKE 'notif-bell-%' AND realtime.topic() = 'notif-bell-' || auth.uid()::text)
  OR (realtime.topic() LIKE 'chat-%' AND EXISTS (
        SELECT 1 FROM public.chat_thread_members m
        WHERE m.thread_id::text = substring(realtime.topic() from 6)
          AND m.user_id = auth.uid()))
  OR (realtime.topic() LIKE 'team-chat-%' AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id::text = substring(realtime.topic() from 11)
          AND tm.user_id = auth.uid()))
  OR (
    realtime.topic() NOT LIKE 'dm-%'
    AND realtime.topic() NOT LIKE 'my-threads-%'
    AND realtime.topic() NOT LIKE 'notif-bell-%'
    AND realtime.topic() NOT LIKE 'chat-%'
    AND realtime.topic() NOT LIKE 'team-chat-%'
  )
);
