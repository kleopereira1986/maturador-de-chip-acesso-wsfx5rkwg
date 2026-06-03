DO $func$
DECLARE
  v_user_id UUID;
BEGIN
  -- Fix RLS for configuracoes_api to allow Corretor to read global API keys
  DROP POLICY IF EXISTS "Configuracoes API authenticated select" ON public.configuracoes_api;
  CREATE POLICY "Configuracoes API authenticated select" ON public.configuracoes_api
    FOR SELECT TO authenticated USING (true);

  -- Campaigns Policies for Corretor
  DROP POLICY IF EXISTS "Campaigns Corretor all own" ON public.campaigns;
  CREATE POLICY "Campaigns Corretor all own" ON public.campaigns
    FOR ALL TO authenticated
    USING (get_my_role() = 'corretor' AND created_by = auth.uid())
    WITH CHECK (get_my_role() = 'corretor' AND created_by = auth.uid());

  DROP POLICY IF EXISTS "Campaigns Corretor select participating" ON public.campaigns;
  CREATE POLICY "Campaigns Corretor select participating" ON public.campaigns
    FOR SELECT TO authenticated
    USING (get_my_role() = 'corretor' AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.whatsapp_instances wi
        WHERE wi.owner_id = auth.uid() AND wi.id = ANY(instance_ids)
      )
    ));

  -- DispatchQueue Policies for Corretor
  DROP POLICY IF EXISTS "DispatchQueue Corretor all own" ON public.dispatch_queue;
  CREATE POLICY "DispatchQueue Corretor all own" ON public.dispatch_queue
    FOR ALL TO authenticated
    USING (get_my_role() = 'corretor' AND campaign_id IN (SELECT id FROM public.campaigns WHERE created_by = auth.uid()))
    WITH CHECK (get_my_role() = 'corretor' AND campaign_id IN (SELECT id FROM public.campaigns WHERE created_by = auth.uid()));

  -- Seed Data
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
    VALUES (v_user_id, 'kleopereira1986@gmail.com', 'Administrador Master', 'master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$func$;
