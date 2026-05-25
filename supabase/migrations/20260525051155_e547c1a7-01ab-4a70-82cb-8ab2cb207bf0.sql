CREATE OR REPLACE FUNCTION public.get_public_profile_stats(_user_id uuid)
RETURNS TABLE (
  quizzes_taken int,
  quiz_accuracy int,
  cards_reviewed int,
  current_streak int,
  longest_streak int,
  ai_activity int,
  engagement int,
  uploads_count int,
  students_impacted int,
  followers_count int,
  avg_rating numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT COUNT(*) FROM quiz_attempts WHERE user_id = _user_id AND completed_at IS NOT NULL), 0)::int AS quizzes_taken,
    COALESCE((
      SELECT ROUND(AVG(CASE WHEN total_questions > 0 THEN (correct_answers::numeric / total_questions) * 100 END))
      FROM quiz_attempts WHERE user_id = _user_id AND completed_at IS NOT NULL
    ), 0)::int AS quiz_accuracy,
    COALESCE((SELECT COUNT(*) FROM srs_reviews WHERE user_id = _user_id), 0)::int AS cards_reviewed,
    COALESCE((SELECT current_streak FROM study_streaks WHERE user_id = _user_id), 0)::int AS current_streak,
    COALESCE((SELECT longest_streak FROM study_streaks WHERE user_id = _user_id), 0)::int AS longest_streak,
    COALESCE((SELECT SUM(count)::int FROM ai_usage_daily WHERE user_id = _user_id AND day >= CURRENT_DATE - INTERVAL '30 days'), 0) AS ai_activity,
    COALESCE((SELECT COUNT(*) FROM course_chat_messages WHERE user_id = _user_id AND COALESCE(is_ai, false) = false AND created_at >= NOW() - INTERVAL '30 days'), 0)::int AS engagement,
    (
      COALESCE((SELECT COUNT(*) FROM quizzes WHERE tutor_id = _user_id AND is_active = true), 0)
      + COALESCE((SELECT COUNT(*) FROM lecture_notes WHERE tutor_id = _user_id), 0)
    )::int AS uploads_count,
    COALESCE((
      SELECT COUNT(DISTINCT qa.user_id)
      FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
      WHERE q.tutor_id = _user_id
    ), 0)::int AS students_impacted,
    COALESCE((SELECT COUNT(*) FROM tutor_follows WHERE tutor_id = _user_id), 0)::int AS followers_count,
    (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM tutor_ratings WHERE tutor_id = _user_id
    ) AS avg_rating;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_stats(uuid) TO authenticated;