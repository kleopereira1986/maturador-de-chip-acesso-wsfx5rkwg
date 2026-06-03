DO $$
BEGIN
  -- Add new columns for campaigns feature
  ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS min_delay INTEGER NOT NULL DEFAULT 10;
  ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_delay INTEGER NOT NULL DEFAULT 30;
  ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS instance_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
  
  -- Add column for maturador toggle per instance
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS is_maturador_active BOOLEAN NOT NULL DEFAULT false;
END $$;

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed Master Admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kleopereira1986@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'kleopereira1986@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Master Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, 'kleopereira1986@gmail.com', 'Master Admin', 'master')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Seed initial maturador config if empty
  IF NOT EXISTS (SELECT 1 FROM public.maturador_configs) THEN
    INSERT INTO public.maturador_configs (dialogue_tree, is_active, min_delay, max_delay)
    VALUES ('{"phrases": ["Oi, tudo bem?", "Olá, como vai?", "Bom dia!", "Boa tarde!", "Opa, tranquilo?"]}'::jsonb, false, 40, 90);
  END IF;
END $$;
