
-- 1. Make application-documents bucket private (PII: gov IDs, certificates)
UPDATE storage.buckets SET public = false WHERE id = 'application-documents';

-- 2. Replace public report_card_verifications SELECT with scoped access.
-- Keep verification possible only via direct verification_id lookup (handled by edge function), school members, or owning student/parent.
DROP POLICY IF EXISTS rcv_public_select ON public.report_card_verifications;

CREATE POLICY rcv_school_member_select
  ON public.report_card_verifications
  FOR SELECT
  USING (
    public.is_school_member(school_id)
    OR EXISTS (
      SELECT 1 FROM public.school_students s
      WHERE s.id = report_card_verifications.student_id
        AND (s.user_id = auth.uid() OR s.parent_user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Remove direct UPDATE on token_wallets — balance must only change via SECURITY DEFINER funcs / service role
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.token_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.token_wallets;
DROP POLICY IF EXISTS "Users update their own wallet" ON public.token_wallets;
DROP POLICY IF EXISTS "Users update own wallet" ON public.token_wallets;

-- 4. Tighten question-images SELECT — require authenticated user
DROP POLICY IF EXISTS "Public read question image files" ON storage.objects;
CREATE POLICY "Authenticated read question image files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'question-images'
    AND auth.uid() IS NOT NULL
  );

-- 5. Restrict school-logos write policies to the owning school's owner/admin
DROP POLICY IF EXISTS school_logos_auth_insert ON storage.objects;
DROP POLICY IF EXISTS school_logos_auth_update ON storage.objects;
DROP POLICY IF EXISTS school_logos_auth_delete ON storage.objects;

CREATE POLICY school_logos_owner_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'school-logos'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_school_member((storage.foldername(name))[1]::uuid, 'owner')
      OR public.is_school_member((storage.foldername(name))[1]::uuid, 'admin')
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY school_logos_owner_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'school-logos'
    AND (
      public.is_school_member((storage.foldername(name))[1]::uuid, 'owner')
      OR public.is_school_member((storage.foldername(name))[1]::uuid, 'admin')
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY school_logos_owner_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'school-logos'
    AND (
      public.is_school_member((storage.foldername(name))[1]::uuid, 'owner')
      OR public.is_school_member((storage.foldername(name))[1]::uuid, 'admin')
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 6. Remove unauthenticated SELECT on tutor profiles (keep authenticated version)
DROP POLICY IF EXISTS "Anyone can view tutor profiles" ON public.profiles;
