
-- 1. QUESTION-IMAGES STORAGE
DROP POLICY IF EXISTS "Tutors can delete their question images" ON storage.objects;
DROP POLICY IF EXISTS "Tutors can update their question images" ON storage.objects;
DROP POLICY IF EXISTS "Owners or admins can delete question images" ON storage.objects;
DROP POLICY IF EXISTS "Owners or admins can update question images" ON storage.objects;

CREATE POLICY "Owners or admins can delete question images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'question-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Owners or admins can update question images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'question-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- 2. PROFILES
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile info"    ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view safe profile fields" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated can view safe profile fields"
ON public.profiles FOR SELECT TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, full_name, avatar_url, profile_image_url, department, tutor_code,
  academic_path, tutor_specialization, onboarding_completed, cover_photo_url,
  level, bio, linkedin_handle, x_handle, study_interests, hobbies,
  created_at, updated_at
) ON public.profiles TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 3. TOKEN_TRANSACTIONS
DROP POLICY IF EXISTS "Users can create transactions for their wallet" ON public.token_transactions;

CREATE OR REPLACE FUNCTION public.claim_team_challenge_reward(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_challenge RECORD;
  v_progress RECORD;
  v_wallet RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT team_id INTO v_team_id FROM public.team_members WHERE user_id = v_uid LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION 'not on a team'; END IF;

  SELECT * INTO v_challenge FROM public.team_challenges WHERE id = _challenge_id;
  IF v_challenge IS NULL THEN RAISE EXCEPTION 'challenge not found'; END IF;

  SELECT * INTO v_progress
    FROM public.team_challenge_progress
   WHERE challenge_id = _challenge_id AND team_id = v_team_id
   FOR UPDATE;
  IF v_progress IS NULL OR NOT v_progress.completed THEN
    RAISE EXCEPTION 'challenge not completed';
  END IF;
  IF v_progress.reward_claimed THEN
    RAISE EXCEPTION 'reward already claimed';
  END IF;

  UPDATE public.team_challenge_progress
     SET reward_claimed = true
   WHERE challenge_id = _challenge_id AND team_id = v_team_id;

  SELECT * INTO v_wallet FROM public.token_wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_wallet IS NULL THEN
    INSERT INTO public.token_wallets (user_id, balance, total_earned)
      VALUES (v_uid, v_challenge.reward_tokens, v_challenge.reward_tokens)
      RETURNING * INTO v_wallet;
  ELSE
    UPDATE public.token_wallets
       SET balance = balance + v_challenge.reward_tokens,
           total_earned = total_earned + v_challenge.reward_tokens,
           updated_at = now()
     WHERE id = v_wallet.id;
  END IF;

  INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
    VALUES (v_wallet.id, v_challenge.reward_tokens, 'challenge_reward',
            'Team challenge reward: ' || v_challenge.title, _challenge_id);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_team_challenge_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_team_challenge_reward(uuid) TO authenticated;

-- 4. AFFILIATE_LINKS
DROP POLICY IF EXISTS "Public can resolve link by slug" ON public.affiliate_links;

CREATE OR REPLACE FUNCTION public.resolve_affiliate_slug(_slug text)
RETURNS TABLE(id uuid, destination text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_dest text;
BEGIN
  SELECT a.id, a.destination INTO v_id, v_dest
    FROM public.affiliate_links a
   WHERE a.slug = _slug
   LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;

  UPDATE public.affiliate_links
     SET clicks = COALESCE(clicks, 0) + 1
   WHERE affiliate_links.id = v_id;

  id := v_id;
  destination := v_dest;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_affiliate_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_slug(text) TO anon, authenticated;
