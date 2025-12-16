-- Drop the existing policy that might not be working correctly
DROP POLICY IF EXISTS "Anyone can view tutor profiles" ON public.profiles;

-- Create a new permissive policy that allows authenticated users to view tutor profiles
CREATE POLICY "Authenticated users can view tutor profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'tutor'::app_role
  )
);