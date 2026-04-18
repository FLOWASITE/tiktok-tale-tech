-- Enable realtime for carousels table so frontend can pick up new rows
-- inserted by background edge function calls
ALTER TABLE public.carousels REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'carousels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.carousels;
  END IF;
END $$;