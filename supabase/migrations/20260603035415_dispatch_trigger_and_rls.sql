CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Ensure RLS on dispatch_queue for update/select
DROP POLICY IF EXISTS "DispatchQueue Master/Gerente all" ON public.dispatch_queue;
CREATE POLICY "DispatchQueue Master/Gerente all" ON public.dispatch_queue
  FOR ALL TO authenticated 
  USING (public.get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]))
  WITH CHECK (public.get_my_role() = ANY (ARRAY['master'::text, 'gerente'::text]));

-- Trigger function to dispatch messages
CREATE OR REPLACE FUNCTION public.trigger_dispatch_messages()
RETURNS trigger AS $function$
BEGIN
  IF NEW.status = 'DISPARANDO' AND (OLD.status IS NULL OR OLD.status != 'DISPARANDO') THEN
    BEGIN
      PERFORM net.http_post(
        url := COALESCE(
          current_setting('app.settings.supabase_url', true),
          'https://uidafexgwtplfnjrgoyi.supabase.co'
        ) || '/functions/v1/dispatch-messages',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('campaign_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to invoke edge function: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS on_campaign_start_dispatch ON public.campaigns;
CREATE TRIGGER on_campaign_start_dispatch
  AFTER UPDATE OF status ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trigger_dispatch_messages();

-- Ensure lock_and_get_queue is robust for idempotency
CREATE OR REPLACE FUNCTION public.lock_and_get_queue(p_campaign_id uuid, p_limit integer)
RETURNS SETOF dispatch_queue
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.dispatch_queue
  SET status = 'PROCESSING'
  WHERE id IN (
    SELECT id
    FROM public.dispatch_queue
    WHERE campaign_id = p_campaign_id
      AND status = 'PENDING'
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$function$;
