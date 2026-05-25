
DO $$
DECLARE
  v_admin_id uuid;
  v_tutor_id uuid;
  v_student_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@overraprep.test';
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'admin@overraprep.test', crypt('Admin@12345', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','OverraPrep Admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@overraprep.test', 'email_verified', true),
      'email', v_admin_id::text, now(), now(), now());
  END IF;

  SELECT id INTO v_tutor_id FROM auth.users WHERE email = 'tutor@overraprep.test';
  IF v_tutor_id IS NULL THEN
    v_tutor_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_tutor_id, 'authenticated', 'authenticated',
      'tutor@overraprep.test', crypt('Tutor@12345', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','OverraPrep Tutor'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_tutor_id,
      jsonb_build_object('sub', v_tutor_id::text, 'email', 'tutor@overraprep.test', 'email_verified', true),
      'email', v_tutor_id::text, now(), now(), now());
  END IF;

  SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@overraprep.test';
  IF v_student_id IS NULL THEN
    v_student_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated',
      'student@overraprep.test', crypt('Student@12345', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','OverraPrep Student'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_student_id,
      jsonb_build_object('sub', v_student_id::text, 'email', 'student@overraprep.test', 'email_verified', true),
      'email', v_student_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_tutor_id, 'tutor') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_student_id, 'student') ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.tutor_applications WHERE user_id = v_tutor_id) THEN
    INSERT INTO public.tutor_applications (
      user_id, status, full_name, email, qualifications, experience, courses_to_teach, reviewed_at
    ) VALUES (
      v_tutor_id, 'approved', 'OverraPrep Tutor', 'tutor@overraprep.test',
      'B.Sc Computer Science', '5+ years tutoring experience', ARRAY['Mathematics','Computer Science'],
      now()
    );
  ELSE
    UPDATE public.tutor_applications
       SET status = 'approved', reviewed_at = COALESCE(reviewed_at, now())
     WHERE user_id = v_tutor_id AND status <> 'approved';
  END IF;
END $$;
