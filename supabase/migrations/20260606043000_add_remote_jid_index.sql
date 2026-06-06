CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_phone ON public.whatsapp_messages USING btree (contact_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON public.whatsapp_messages USING btree (remote_jid);
