DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'usage_type' AND e.enumlabel = 'video_generation'
  ) THEN
    ALTER TYPE public.usage_type ADD VALUE 'video_generation';
  END IF;
END$$;