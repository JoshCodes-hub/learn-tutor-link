-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id),
  UNIQUE(user_id) -- One team per user
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update their teams"
ON public.teams FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Team creators can delete their teams"
ON public.teams FOR DELETE
USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Anyone can view team members"
ON public.team_members FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join teams"
ON public.team_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams"
ON public.team_members FOR DELETE
USING (auth.uid() = user_id);

-- Function to generate unique team code
CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'TEAM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    SELECT EXISTS(SELECT 1 FROM teams WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-assign team code
CREATE OR REPLACE FUNCTION public.assign_team_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_team_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
BEFORE INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.assign_team_code();

-- Auto-add creator as team member
CREATE OR REPLACE FUNCTION public.add_creator_to_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created_add_member
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_to_team();