-- Allow anyone to check if a user has the tutor role
-- This is needed for the "Anyone can view tutor profiles" policy to work correctly
CREATE POLICY "Anyone can check tutor role" 
ON public.user_roles 
FOR SELECT 
USING (role = 'tutor'::app_role);