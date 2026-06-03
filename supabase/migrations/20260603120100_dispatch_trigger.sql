CREATE OR REPLACE FUNCTION public.lock_and_get_queue(p_campaign_id uuid, p_limit int)
RETURNS SETOF public.dispatch_queue AS $$
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
$$ LANGUAGE plpgsql;

DO $outer$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_net not available: %', SQLERRM;
END $outer$;

CREATE OR REPLACE FUNCTION public.trigger_dispatch_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DISPARANDO' AND (OLD.status IS NULL OR OLD.status != 'DISPARANDO') THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://uidafexgwtplfnjrgoyi.supabase.co/functions/v1/dispatch-messages',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('campaign_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to invoke edge function: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_campaign_start_dispatch ON public.campaigns;

CREATE TRIGGER on_campaign_start_dispatch
  AFTER UPDATE OF status ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_dispatch_messages();

DO $outer$
BEGIN
  PERFORM cron.unschedule('dispatch-messages-cron');
  PERFORM cron.schedule(
    'dispatch-messages-cron',
    '* * * * *',
    $$
      SELECT net.http_post(
          url := 'https://uidafexgwtplfnjrgoyi.supabase.co/functions/v1/dispatch-messages',
          headers := '{"Content-Type": "application/json"}'::jsonb
      );
    $$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or error scheduling: %', SQLERRM;
END $outer$;
