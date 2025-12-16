-- Create team_challenges table
CREATE TABLE public.team_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'quizzes_completed', 'total_score', 'accuracy'
  goal_value INTEGER NOT NULL,
  reward_tokens INTEGER NOT NULL DEFAULT 50,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_challenge_progress table
CREATE TABLE public.team_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.team_challenges(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, team_id)
);

-- Enable RLS
ALTER TABLE public.team_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Policies for team_challenges
CREATE POLICY "Anyone can view active challenges"
ON public.team_challenges FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage challenges"
ON public.team_challenges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for team_challenge_progress
CREATE POLICY "Anyone can view challenge progress"
ON public.team_challenge_progress FOR SELECT
USING (true);

CREATE POLICY "System can manage challenge progress"
ON public.team_challenge_progress FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update challenge progress"
ON public.team_challenge_progress FOR UPDATE
USING (true);

-- Function to update team challenge progress when a quiz is completed
CREATE OR REPLACE FUNCTION public.update_team_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team_id UUID;
  challenge_record RECORD;
  current_val INTEGER;
BEGIN
  -- Only process completed quiz attempts
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find user's team
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = NEW.user_id;

  IF user_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update progress for all active challenges
  FOR challenge_record IN 
    SELECT * FROM team_challenges 
    WHERE is_active = true 
    AND now() BETWEEN starts_at AND ends_at
  LOOP
    -- Ensure progress record exists
    INSERT INTO team_challenge_progress (challenge_id, team_id, current_progress)
    VALUES (challenge_record.id, user_team_id, 0)
    ON CONFLICT (challenge_id, team_id) DO NOTHING;

    -- Calculate progress based on goal type
    IF challenge_record.goal_type = 'quizzes_completed' THEN
      UPDATE team_challenge_progress
      SET current_progress = current_progress + 1,
          completed = (current_progress + 1) >= challenge_record.goal_value,
          completed_at = CASE WHEN (current_progress + 1) >= challenge_record.goal_value AND completed_at IS NULL THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE challenge_id = challenge_record.id AND team_id = user_team_id;
    ELSIF challenge_record.goal_type = 'total_score' THEN
      UPDATE team_challenge_progress
      SET current_progress = current_progress + NEW.score,
          completed = (current_progress + NEW.score) >= challenge_record.goal_value,
          completed_at = CASE WHEN (current_progress + NEW.score) >= challenge_record.goal_value AND completed_at IS NULL THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE challenge_id = challenge_record.id AND team_id = user_team_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger for challenge progress updates
CREATE TRIGGER on_quiz_complete_update_challenge
AFTER UPDATE ON public.quiz_attempts
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_team_challenge_progress();