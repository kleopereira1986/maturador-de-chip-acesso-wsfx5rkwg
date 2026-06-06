DO $$
BEGIN
  ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS message_id text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_message_id_idx ON public.whatsapp_messages(message_id) WHERE message_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'webhook_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;
  END IF;
END $$;
