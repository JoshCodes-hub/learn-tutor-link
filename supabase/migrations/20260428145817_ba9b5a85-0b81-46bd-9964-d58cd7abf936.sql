-- Revoke EXECUTE from authenticated for trigger-only functions.
-- Keep has_role / is_school_member / get_user_role accessible (RLS policies use them).
DO $$
DECLARE
  fn TEXT;
  fns TEXT[] := ARRAY[
    'assign_tutor_code()',
    'assign_community_code()',
    'assign_team_code()',
    'generate_tutor_code()',
    'generate_community_code()',
    'generate_referral_code()',
    'generate_team_code()',
    'update_study_streak()',
    'handle_new_user_wallet()',
    'add_creator_to_team()',
    'update_updated_at_column()',
    'handle_new_user()',
    'log_admin_action(uuid,text,text,uuid,jsonb,jsonb)',
    'update_team_challenge_progress()',
    'complete_referral_reward()',
    'add_school_owner_member()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', fn);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;