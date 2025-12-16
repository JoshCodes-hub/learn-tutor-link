-- Remove unique constraint on course code (multiple tutors can create same course)
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_code_key;

-- Add tutor_code to profiles for unique tutor identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutor_code TEXT UNIQUE;

-- Create function to generate unique tutor code
CREATE OR REPLACE FUNCTION public.generate_tutor_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like TUT-XXXX (4 random alphanumeric chars)
    new_code := 'TUT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE tutor_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger to auto-assign tutor code when user becomes a tutor
CREATE OR REPLACE FUNCTION public.assign_tutor_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'tutor' THEN
    UPDATE public.profiles 
    SET tutor_code = generate_tutor_code()
    WHERE id = NEW.user_id AND tutor_code IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_tutor_role_assigned ON public.user_roles;
CREATE TRIGGER on_tutor_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_tutor_code();

-- Assign tutor codes to existing tutors who don't have one
UPDATE public.profiles p
SET tutor_code = public.generate_tutor_code()
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'tutor'
) AND p.tutor_code IS NULL;