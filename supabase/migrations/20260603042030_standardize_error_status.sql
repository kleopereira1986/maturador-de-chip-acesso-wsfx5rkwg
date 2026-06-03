DO $$
BEGIN
  -- Standardize all previous FAILED statuses to ERROR to match the new behavior consistently
  UPDATE public.dispatch_queue
  SET status = 'ERROR'
  WHERE status = 'FAILED';
END $$;
