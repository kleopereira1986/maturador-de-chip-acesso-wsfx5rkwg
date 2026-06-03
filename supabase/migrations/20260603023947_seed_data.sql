DO $func$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kleopereira1986@gmail.com') THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'kleopereira1986@gmail.com', crypt('Skip@Pass', gen_salt('bf')), now(),
      now(), now(), '{"provider": "email", "providers": ["email"]}', '{"name": "Admin Master"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', '', '', '', NULL
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, 'kleopereira1986@gmail.com', 'Administrador Master', 'master');
  END IF;
END;
$func$;
