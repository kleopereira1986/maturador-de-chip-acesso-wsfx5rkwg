ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS proxy_host text,
ADD COLUMN IF NOT EXISTS proxy_port text,
ADD COLUMN IF NOT EXISTS proxy_user text,
ADD COLUMN IF NOT EXISTS proxy_password text;
