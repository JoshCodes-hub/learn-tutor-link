-- Create tutor_communities table (each tutor can have one community)
CREATE TABLE public.tutor_communities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create community_members table
CREATE TABLE public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.tutor_communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create community_shared_quizzes table (quizzes shared to a community)
CREATE TABLE public.community_shared_quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.tutor_communities(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  shared_at timestamp with time zone NOT NULL DEFAULT now(),
  message text,
  UNIQUE(community_id, quiz_id)
);

-- Enable RLS on all tables
ALTER TABLE public.tutor_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_shared_quizzes ENABLE ROW LEVEL SECURITY;

-- Function to generate community invite code
CREATE OR REPLACE FUNCTION public.generate_community_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'COM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM tutor_communities WHERE invite_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate invite code
CREATE OR REPLACE FUNCTION public.assign_community_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_community_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_community_code
  BEFORE INSERT ON public.tutor_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_community_code();

-- RLS Policies for tutor_communities
CREATE POLICY "Anyone can view active communities"
ON public.tutor_communities
FOR SELECT
USING (is_active = true);

CREATE POLICY "Tutors can create their own community"
ON public.tutor_communities
FOR INSERT
WITH CHECK (auth.uid() = tutor_id AND has_role(auth.uid(), 'tutor'::app_role));

CREATE POLICY "Tutors can update their own community"
ON public.tutor_communities
FOR UPDATE
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete their own community"
ON public.tutor_communities
FOR DELETE
USING (auth.uid() = tutor_id);

-- RLS Policies for community_members
CREATE POLICY "Anyone can view community members"
ON public.community_members
FOR SELECT
USING (true);

CREATE POLICY "Users can join communities"
ON public.community_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
ON public.community_members
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for community_shared_quizzes
CREATE POLICY "Community members can view shared quizzes"
ON public.community_shared_quizzes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = community_shared_quizzes.community_id
    AND community_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_shared_quizzes.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can share quizzes to their community"
ON public.community_shared_quizzes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_shared_quizzes.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can remove shared quizzes"
ON public.community_shared_quizzes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_shared_quizzes.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

-- Enable realtime for community features
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_shared_quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;