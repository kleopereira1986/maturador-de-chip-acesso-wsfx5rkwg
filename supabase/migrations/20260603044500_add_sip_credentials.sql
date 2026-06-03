ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sip_extension TEXT,
ADD COLUMN IF NOT EXISTS sip_password TEXT,
ADD COLUMN IF NOT EXISTS sip_domain TEXT;

DO $func$
BEGIN
  UPDATE public.profiles
  SET 
    sip_extension = '1001',
    sip_password = 'dummy_password_123',
    sip_domain = 'rtc.imobixcrm.com'
  WHERE email = 'kleopereira1986@gmail.com';
END;
$func$;
