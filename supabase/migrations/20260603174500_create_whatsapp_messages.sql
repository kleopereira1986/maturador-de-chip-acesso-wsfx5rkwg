CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  is_responded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_phone ON public.whatsapp_messages(contact_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id ON public.whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_is_responded ON public.whatsapp_messages(is_responded);

DROP POLICY IF EXISTS "Messages Master/Gerente all" ON public.whatsapp_messages;
CREATE POLICY "Messages Master/Gerente all" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]));

DROP POLICY IF EXISTS "Messages Corretor select" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor select" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'corretor' AND
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Messages Corretor insert" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor insert" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'corretor' AND
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Messages Corretor update" ON public.whatsapp_messages;
CREATE POLICY "Messages Corretor update" ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'corretor' AND
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    public.get_my_role() = 'corretor' AND
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE owner_id = auth.uid())
  );
