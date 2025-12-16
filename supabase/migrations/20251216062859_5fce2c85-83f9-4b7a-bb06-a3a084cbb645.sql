-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update the streak update function to call milestone edge function
CREATE OR REPLACE FUNCTION public.update_study_streak()
RETURNS TRIGGER AS $$
DECLARE
  streak_record RECORD;
  today DATE := CURRENT_DATE;
  new_streak INTEGER;
BEGIN
  -- Get or create streak record
  SELECT * INTO streak_record FROM public.study_streaks WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.study_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.user_id, 1, 1, today);
    new_streak := 1;
  ELSE
    IF streak_record.last_activity_date = today - 1 THEN
      -- Consecutive day, increment streak
      new_streak := streak_record.current_streak + 1;
      UPDATE public.study_streaks 
      SET current_streak = new_streak,
          longest_streak = GREATEST(longest_streak, new_streak),
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF streak_record.last_activity_date < today - 1 THEN
      -- Streak broken, reset to 1
      new_streak := 1;
      UPDATE public.study_streaks 
      SET current_streak = 1,
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF streak_record.last_activity_date = today THEN
      -- Already studied today, no change
      new_streak := streak_record.current_streak;
    ELSIF streak_record.last_activity_date IS NULL THEN
      -- First activity
      new_streak := 1;
      UPDATE public.study_streaks 
      SET current_streak = 1,
          longest_streak = GREATEST(longest_streak, 1),
          last_activity_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      new_streak := streak_record.current_streak;
    END IF;
  END IF;

  -- Check for milestone achievements (3, 7, 14, 30, 60, 100 days)
  IF new_streak IN (3, 7, 14, 30, 60, 100) THEN
    -- Call the streak milestone edge function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/streak-milestone',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object('user_id', NEW.user_id, 'streak_days', new_streak)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;