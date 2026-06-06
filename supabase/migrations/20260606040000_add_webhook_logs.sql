CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Webhook logs select master gerente" ON public.webhook_logs;
CREATE POLICY "Webhook logs select master gerente" ON public.webhook_logs
    FOR SELECT TO authenticated 
    USING (get_my_role() IN ('master', 'gerente'));
