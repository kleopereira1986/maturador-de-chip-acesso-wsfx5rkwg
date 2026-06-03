-- Update existing campaigns statuses
UPDATE public.campaigns SET status = 'AGUARDANDO' WHERE status = 'WAITING';
UPDATE public.campaigns SET status = 'DISPARANDO' WHERE status = 'SENDING';
UPDATE public.campaigns SET status = 'PAUSADO' WHERE status = 'PAUSED';
UPDATE public.campaigns SET status = 'CONCLUIDO' WHERE status = 'COMPLETED';

-- Alter campaigns status default
ALTER TABLE public.campaigns ALTER COLUMN status SET DEFAULT 'AGUARDANDO'::text;

-- Update existing whatsapp_instances statuses
UPDATE public.whatsapp_instances SET status = 'CONECTADO' WHERE status = 'CONNECTED';
UPDATE public.whatsapp_instances SET status = 'DESCONECTADO' WHERE status = 'DISCONNECTED';
UPDATE public.whatsapp_instances SET status = 'PAUSADO' WHERE status = 'PAUSED';

-- Alter whatsapp_instances status default
ALTER TABLE public.whatsapp_instances ALTER COLUMN status SET DEFAULT 'DESCONECTADO'::text;

-- Fix RLS for profiles so Corretores can update their own profile
DROP POLICY IF EXISTS "Corretor can update self" ON public.profiles;
CREATE POLICY "Corretor can update self" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Ensure correct RLS for dialer_queue as per AC
DROP POLICY IF EXISTS "DialerQueue All Corretor read, Master/Gerente all" ON public.dialer_queue;

DROP POLICY IF EXISTS "DialerQueue Master/Gerente ALL" ON public.dialer_queue;
CREATE POLICY "DialerQueue Master/Gerente ALL" ON public.dialer_queue
  FOR ALL TO authenticated USING (public.get_my_role() IN ('master', 'gerente'));

DROP POLICY IF EXISTS "DialerQueue Corretor SELECT" ON public.dialer_queue;
CREATE POLICY "DialerQueue Corretor SELECT" ON public.dialer_queue
  FOR SELECT TO authenticated USING (public.get_my_role() = 'corretor');
