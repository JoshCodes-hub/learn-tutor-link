
-- Re-add tutor profile visibility but rely on column-level grants to hide email
CREATE POLICY "Authenticated users can view tutor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id
      AND ur.role = 'tutor'::app_role
  )
);

-- Revoke column-level SELECT on email from anon and authenticated
-- so even if a row is readable, the email column is not selectable.
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- Re-grant SELECT on every other column explicitly to authenticated and anon
GRANT SELECT (
  id, full_name, avatar_url, profile_image_url, cover_photo_url,
  tutor_code, department, tutor_specialization, academic_path,
  academic_metadata, tutor_match_prefs, onboarding_completed,
  referral_code, referred_by, created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Service role retains full access (default)
GRANT SELECT ON public.profiles TO service_role;
