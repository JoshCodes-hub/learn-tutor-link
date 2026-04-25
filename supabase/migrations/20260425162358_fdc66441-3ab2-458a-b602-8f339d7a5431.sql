
-- Recreate the trigger that creates profile + assigns student role on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate the trigger that creates a token wallet on signup
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Trigger to assign tutor_code when a user is given the tutor role
DROP TRIGGER IF EXISTS on_user_role_inserted ON public.user_roles;
CREATE TRIGGER on_user_role_inserted
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.assign_tutor_code();

-- Trigger to auto-assign team / community codes
DROP TRIGGER IF EXISTS on_team_insert_assign_code ON public.teams;
CREATE TRIGGER on_team_insert_assign_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.assign_team_code();

DROP TRIGGER IF EXISTS on_team_created_add_creator ON public.teams;
CREATE TRIGGER on_team_created_add_creator
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.add_creator_to_team();

DROP TRIGGER IF EXISTS on_community_insert_assign_code ON public.tutor_communities;
CREATE TRIGGER on_community_insert_assign_code
  BEFORE INSERT ON public.tutor_communities
  FOR EACH ROW EXECUTE FUNCTION public.assign_community_code();

-- Trigger to update study streaks and team challenges on quiz completion
DROP TRIGGER IF EXISTS on_quiz_attempt_streak ON public.quiz_attempts;
CREATE TRIGGER on_quiz_attempt_streak
  AFTER INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_study_streak();

DROP TRIGGER IF EXISTS on_quiz_attempt_team_challenge ON public.quiz_attempts;
CREATE TRIGGER on_quiz_attempt_team_challenge
  AFTER INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_team_challenge_progress();

DROP TRIGGER IF EXISTS on_quiz_attempt_referral ON public.quiz_attempts;
CREATE TRIGGER on_quiz_attempt_referral
  AFTER INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.complete_referral_reward();

-- updated_at triggers on key tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: create profile, role, and wallet for existing auth users that don't have them
INSERT INTO public.profiles (id, email, full_name, referral_code)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', ''), public.generate_referral_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

INSERT INTO public.token_wallets (user_id, balance)
SELECT u.id, 50
FROM auth.users u
LEFT JOIN public.token_wallets w ON w.user_id = u.id
WHERE w.user_id IS NULL;
