
-- 1) Remove broad tutor profile exposure (which leaked emails)
DROP POLICY IF EXISTS "Authenticated users can view tutor profiles" ON public.profiles;

-- Create a safe public view for tutor profiles WITHOUT email/sensitive fields
CREATE OR REPLACE VIEW public.tutor_public_profiles
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.profile_image_url,
  p.cover_photo_url,
  p.tutor_code,
  p.department,
  p.tutor_specialization,
  p.academic_path,
  p.created_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'tutor'::app_role
);

GRANT SELECT ON public.tutor_public_profiles TO anon, authenticated;

-- Re-add a SELECT policy on profiles for tutors that EXCLUDES email exposure path:
-- Authenticated users can read tutor rows but the recommended access is via the view.
-- To preserve current app reads of profiles for tutors WITHOUT exposing email broadly,
-- we keep no broad policy and instead encourage view usage. Owners and admins can still read full profile.

-- 2) Restrict tutor_communities SELECT - hide invite_code from non-members
DROP POLICY IF EXISTS "Anyone can view active communities" ON public.tutor_communities;

-- Public can see active communities EXCEPT invite_code via a safe view
CREATE OR REPLACE VIEW public.tutor_communities_public
WITH (security_invoker = true) AS
SELECT id, tutor_id, name, description, is_active, created_at, updated_at
FROM public.tutor_communities
WHERE is_active = true;

GRANT SELECT ON public.tutor_communities_public TO anon, authenticated;

-- Direct table SELECT (including invite_code) restricted to: owning tutor, members, or admins
CREATE POLICY "Tutor owner can view own community"
ON public.tutor_communities
FOR SELECT
USING (auth.uid() = tutor_id);

CREATE POLICY "Members can view their community"
ON public.tutor_communities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = tutor_communities.id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all communities"
ON public.tutor_communities
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
