-- Ensure the SELECT policy exists for authenticated users
DROP POLICY IF EXISTS "Configuracoes API authenticated select" ON public.configuracoes_api;
CREATE POLICY "Configuracoes API authenticated select" ON public.configuracoes_api
  FOR SELECT TO authenticated
  USING (true);

-- Seed an initial record if empty
INSERT INTO public.configuracoes_api (url_servidor, global_api_key)
SELECT 'https://api.primaziainvestimentos.com', '429683C4C977415CAAFCCE10F7D57E11'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_api)
ON CONFLICT DO NOTHING;
