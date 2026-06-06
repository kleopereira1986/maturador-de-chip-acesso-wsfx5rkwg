-- Add remote_jid to whatsapp_messages to explicitly store the JID
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS remote_jid text;
