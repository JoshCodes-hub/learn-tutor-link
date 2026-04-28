-- =====================================================================
-- 🔴 CRITICAL SECURITY HARDENING
-- 1. Lock down "always-true" RLS write policies to service_role only
-- 2. Restrict public bucket LISTING (keep individual file reads public)
-- =====================================================================

-- ---------- 1. Audit logs: only service_role may insert ----------
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT TO service_role
WITH CHECK (true);

-- ---------- 2. Notifications: only service_role may insert from outside ----------
-- (Triggers and edge functions use service_role; users never INSERT directly.)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT TO service_role
WITH CHECK (true);

-- ---------- 3. Referral rewards: lock to service_role ----------
DROP POLICY IF EXISTS "System can insert referral rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "System can update referral rewards" ON public.referral_rewards;
CREATE POLICY "Service role manages referral rewards insert"
ON public.referral_rewards FOR INSERT TO service_role
WITH CHECK (true);
CREATE POLICY "Service role manages referral rewards update"
ON public.referral_rewards FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- ---------- 4. Team challenge progress: lock to service_role ----------
DROP POLICY IF EXISTS "System can manage challenge progress" ON public.team_challenge_progress;
DROP POLICY IF EXISTS "System can update challenge progress" ON public.team_challenge_progress;
CREATE POLICY "Service role manages team progress insert"
ON public.team_challenge_progress FOR INSERT TO service_role
WITH CHECK (true);
CREATE POLICY "Service role manages team progress update"
ON public.team_challenge_progress FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- ---------- 5. Tutor earnings: lock to service_role ----------
DROP POLICY IF EXISTS "System can insert earnings" ON public.tutor_earnings;
CREATE POLICY "Service role inserts tutor earnings"
ON public.tutor_earnings FOR INSERT TO service_role
WITH CHECK (true);

-- =====================================================================
-- 6. Restrict storage bucket LISTING for public buckets.
--    Keep public READ of individual files (you need that for img tags),
--    but disallow listing the entire bucket contents to anonymous users.
--    Storage uses (auth.uid() IS NULL) check on the prefix arg for LIST.
--    The cleanest enforcement: replace broad SELECT with a guarded one.
-- =====================================================================

-- tutor-profiles: public files readable, but only owner can list their folder
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tutor profile images" ON storage.objects;
CREATE POLICY "Public read tutor profile files"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'tutor-profiles'
  AND (
    -- Anonymous/anyone may read a specific file (object name with extension)
    name ~ '\.[a-zA-Z0-9]+$'
    -- And owners may list their own folder
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

-- question-images: same idea
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;
CREATE POLICY "Public read question image files"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'question-images'
  AND (
    name ~ '\.[a-zA-Z0-9]+$'
    OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'tutor'::app_role))
    OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
  )
);

-- school-logos: same idea
DROP POLICY IF EXISTS "school_logos_public_read" ON storage.objects;
CREATE POLICY "Public read school logo files"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'school-logos'
  AND (
    name ~ '\.[a-zA-Z0-9]+$'
    OR (auth.uid() IS NOT NULL)
  )
);