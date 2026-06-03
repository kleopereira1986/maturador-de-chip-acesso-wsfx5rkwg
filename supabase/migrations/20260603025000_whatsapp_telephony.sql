-- Seed Master User (Idempotent)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
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
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Kleo Pereira"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, 'kleopereira1986@gmail.com', 'Kleo Pereira', 'master')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create New Tables
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'DISCONNECTED',
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_text text NOT NULL,
  media_url text,
  media_type text NOT NULL DEFAULT 'TEXT',
  status text NOT NULL DEFAULT 'WAITING',
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispatch_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  lead_name text,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maturador_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogue_tree jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  min_delay int NOT NULL DEFAULT 40,
  max_delay int NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dialer_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name text,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Setup RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Instances Master/Gerente all" ON public.whatsapp_instances;
CREATE POLICY "Instances Master/Gerente all" ON public.whatsapp_instances
  FOR ALL TO authenticated USING (public.get_my_role() IN ('master', 'gerente')) WITH CHECK (public.get_my_role() IN ('master', 'gerente'));

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns Master/Gerente all" ON public.campaigns;
CREATE POLICY "Campaigns Master/Gerente all" ON public.campaigns
  FOR ALL TO authenticated USING (public.get_my_role() IN ('master', 'gerente')) WITH CHECK (public.get_my_role() IN ('master', 'gerente'));

ALTER TABLE public.dispatch_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DispatchQueue Master/Gerente all" ON public.dispatch_queue;
CREATE POLICY "DispatchQueue Master/Gerente all" ON public.dispatch_queue
  FOR ALL TO authenticated USING (public.get_my_role() IN ('master', 'gerente')) WITH CHECK (public.get_my_role() IN ('master', 'gerente'));

ALTER TABLE public.maturador_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Maturador Master/Gerente all" ON public.maturador_configs;
CREATE POLICY "Maturador Master/Gerente all" ON public.maturador_configs
  FOR ALL TO authenticated USING (public.get_my_role() IN ('master', 'gerente')) WITH CHECK (public.get_my_role() IN ('master', 'gerente'));

ALTER TABLE public.dialer_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DialerQueue All Corretor read, Master/Gerente all" ON public.dialer_queue;
CREATE POLICY "DialerQueue All Corretor read, Master/Gerente all" ON public.dialer_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (public.get_my_role() IN ('master', 'gerente'));

-- Create storage bucket for campaign media
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-media', 'campaign-media', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "CampaignMedia Select" ON storage.objects;
CREATE POLICY "CampaignMedia Select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'campaign-media');

DROP POLICY IF EXISTS "CampaignMedia Insert" ON storage.objects;
CREATE POLICY "CampaignMedia Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-media' AND public.get_my_role() IN ('master', 'gerente'));
