-- Allow anyone to view tutor profiles (users who have tutor role)
CREATE POLICY "Anyone can view tutor profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'tutor'
  )
);