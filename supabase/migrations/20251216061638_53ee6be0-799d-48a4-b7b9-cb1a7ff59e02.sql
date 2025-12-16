-- Study streaks table
CREATE TABLE public.study_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  daily_goal_quizzes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Achievements/badges table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements (earned badges)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Student discussions/community
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discussion replies
CREATE TABLE public.discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

-- Study streaks policies
CREATE POLICY "Users can view their own streaks" ON public.study_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streaks" ON public.study_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.study_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies (viewable by all)
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User achievements policies
CREATE POLICY "Users can view all user achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Discussions policies
CREATE POLICY "Anyone can view discussions" ON public.discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE USING (auth.uid() = user_id);

-- Discussion replies policies
CREATE POLICY "Anyone can view replies" ON public.discussion_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can reply" ON public.discussion_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies" ON public.discussion_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON public.discussion_replies FOR DELETE USING (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first quiz', 'trophy', 'milestone', 'quizzes_completed', 1),
('Quiz Master', 'Complete 10 quizzes', 'award', 'milestone', 'quizzes_completed', 10),
('Scholar', 'Complete 50 quizzes', 'graduation-cap', 'milestone', 'quizzes_completed', 50),
('Perfect Score', 'Get 100% on a quiz', 'star', 'performance', 'perfect_scores', 1),
('Streak Starter', 'Maintain a 3-day streak', 'flame', 'streak', 'streak_days', 3),
('Week Warrior', 'Maintain a 7-day streak', 'zap', 'streak', 'streak_days', 7),
('Month Master', 'Maintain a 30-day streak', 'crown', 'streak', 'streak_days', 30),
('Speed Demon', 'Complete a quiz in under 5 minutes', 'clock', 'performance', 'fast_completion', 1),
('Community Helper', 'Post 5 discussions', 'message-circle', 'community', 'discussions_posted', 5),
('Top Scorer', 'Reach the weekly leaderboard', 'medal', 'competition', 'leaderboard_rank', 1);

-- Function to update streak on quiz completion
CREATE OR REPLACE FUNCTION public.update_study_streak()
RETURNS TRIGGER AS $$
DECLARE
  streak_record RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get or create streak record
  SELECT * INTO streak_record FROM public.study_streaks WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.study_streaks (user_id, current_streak, last_activity_date)
    VALUES (NEW.user_id, 1, today);
  ELSE
    IF streak_record.last_activity_date = today - 1 THEN
      -- Consecutive day, increment streak
      UPDATE public.study_streaks 
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF streak_record.last_activity_date < today - 1 THEN
      -- Streak broken, reset to 1
      UPDATE public.study_streaks 
      SET current_streak = 1,
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF streak_record.last_activity_date IS NULL THEN
      -- First activity
      UPDATE public.study_streaks 
      SET current_streak = 1,
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for streak updates
CREATE TRIGGER on_quiz_completed
  AFTER UPDATE ON public.quiz_attempts
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
  EXECUTE FUNCTION public.update_study_streak();

-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;