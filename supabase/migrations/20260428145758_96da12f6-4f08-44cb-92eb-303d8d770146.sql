-- Revoke anon EXECUTE on internal SECURITY DEFINER helpers.
-- These are called by triggers/RLS, not by client SDK calls.
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
    'add_school_owner_member()',
    'is_school_member(uuid,text)',
    'has_role(uuid,app_role)',
    'get_user_role(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, public', fn);
    EXCEPTION WHEN OTHERS THEN
      -- skip missing signatures gracefully
      NULL;
    END;
  END LOOP;
END $$;

-- Move pg_net out of public if present (extension-in-public lint)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      CREATE SCHEMA IF NOT EXISTS extensions;
      EXECUTE 'ALTER EXTENSION pg_net SET SCHEMA extensions';
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;