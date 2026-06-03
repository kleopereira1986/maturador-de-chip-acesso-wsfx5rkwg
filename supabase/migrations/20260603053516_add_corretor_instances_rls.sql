DO $$
BEGIN
  -- Corretor SELECT policy
  DROP POLICY IF EXISTS "Instances Corretor select self" ON public.whatsapp_instances;
  CREATE POLICY "Instances Corretor select self" ON public.whatsapp_instances
    FOR SELECT TO authenticated
    USING (get_my_role() = 'corretor' AND owner_id = auth.uid());

  -- Corretor INSERT policy
  DROP POLICY IF EXISTS "Instances Corretor insert self" ON public.whatsapp_instances;
  CREATE POLICY "Instances Corretor insert self" ON public.whatsapp_instances
    FOR INSERT TO authenticated
    WITH CHECK (get_my_role() = 'corretor' AND owner_id = auth.uid());

  -- Corretor UPDATE policy
  DROP POLICY IF EXISTS "Instances Corretor update self" ON public.whatsapp_instances;
  CREATE POLICY "Instances Corretor update self" ON public.whatsapp_instances
    FOR UPDATE TO authenticated
    USING (get_my_role() = 'corretor' AND owner_id = auth.uid())
    WITH CHECK (get_my_role() = 'corretor' AND owner_id = auth.uid());

  -- Corretor DELETE policy
  DROP POLICY IF EXISTS "Instances Corretor delete self" ON public.whatsapp_instances;
  CREATE POLICY "Instances Corretor delete self" ON public.whatsapp_instances
    FOR DELETE TO authenticated
    USING (get_my_role() = 'corretor' AND owner_id = auth.uid());
END $$;
