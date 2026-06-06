DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user
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
      '{"name": "Kleo Pereira"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, 'kleopereira1986@gmail.com', 'Kleo Pereira', 'master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Ensure robust RLS policies for whatsapp_messages
DROP POLICY IF EXISTS "Messages Corretor select" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor select" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('master', 'gerente') OR 
    (get_my_role() = 'corretor' AND instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Messages Corretor update" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor update" ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('master', 'gerente') OR 
    (get_my_role() = 'corretor' AND instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    get_my_role() IN ('master', 'gerente') OR 
    (get_my_role() = 'corretor' AND instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Messages Corretor insert" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor insert" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('master', 'gerente') OR 
    (get_my_role() = 'corretor' AND instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid()))
  );
