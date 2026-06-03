CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master', 'gerente', 'corretor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role securely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $func$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$func$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies
DROP POLICY IF EXISTS "Master can do all" ON public.profiles;
CREATE POLICY "Master can do all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'master')
  WITH CHECK (public.get_my_role() = 'master');

DROP POLICY IF EXISTS "Gerente can read all" ON public.profiles;
CREATE POLICY "Gerente can read all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'gerente');

DROP POLICY IF EXISTS "Gerente can manage corretor" ON public.profiles;
CREATE POLICY "Gerente can manage corretor" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'gerente' AND role = 'corretor')
  WITH CHECK (public.get_my_role() = 'gerente' AND role = 'corretor');

DROP POLICY IF EXISTS "Corretor can read self" ON public.profiles;
CREATE POLICY "Corretor can read self" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin Function: Create User
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
) RETURNS UUID AS $func$
DECLARE
  v_user_id UUID;
  v_my_role TEXT;
BEGIN
  v_my_role := public.get_my_role();
  
  -- Permission checks
  IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
    RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can create users.';
  END IF;
  
  IF v_my_role = 'gerente' AND p_role != 'corretor' THEN
    RAISE EXCEPTION 'Unauthorized: Gerentes can only create corretores.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Um usuário com este email já existe.';
  END IF;

  v_user_id := gen_random_uuid();
  
  -- Insert into Auth schema
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token, phone
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', p_email, crypt(p_password, gen_salt('bf')), now(),
    now(), now(), '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', p_full_name),
    false, 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', '', NULL
  );

  -- Insert into Profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_user_id, p_email, p_full_name, p_role);

  RETURN v_user_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Update User
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS VOID AS $func$
DECLARE
  v_my_role TEXT;
  v_target_role TEXT;
BEGIN
  v_my_role := public.get_my_role();
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Permission checks
  IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
    RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can update users.';
  END IF;

  IF v_my_role = 'gerente' THEN
    IF v_target_role != 'corretor' OR p_role != 'corretor' THEN
       RAISE EXCEPTION 'Unauthorized: Gerentes can only update corretores.';
    END IF;
  END IF;

  -- Update Profile
  UPDATE public.profiles 
  SET full_name = p_full_name, role = p_role, updated_at = now() 
  WHERE id = p_user_id;

  -- Update Password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() 
    WHERE id = p_user_id;
  END IF;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
) RETURNS VOID AS $func$
DECLARE
  v_my_role TEXT;
  v_target_role TEXT;
BEGIN
  v_my_role := public.get_my_role();
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;

  -- Permission checks
  IF v_my_role IS NULL OR v_my_role = 'corretor' THEN
    RAISE EXCEPTION 'Unauthorized: Only Master or Gerente can delete users.';
  END IF;

  IF v_my_role = 'gerente' AND v_target_role != 'corretor' THEN
     RAISE EXCEPTION 'Unauthorized: Gerentes can only delete corretores.';
  END IF;

  -- Delete from Auth schema (will cascade to profiles)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
