-- 1. Add new tracking columns to video_generations
ALTER TABLE public.video_generations
  ADD COLUMN IF NOT EXISTS provider_task_id text,
  ADD COLUMN IF NOT EXISTS poll_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_polled_at timestamptz,
  ADD COLUMN IF NOT EXISTS negative_prompt text,
  ADD COLUMN IF NOT EXISTS voiceover_url text,
  ADD COLUMN IF NOT EXISTS bgm_url text,
  ADD COLUMN IF NOT EXISTS subtitle_srt text;

-- 2. Extend video_provider enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'geminigen' AND enumtypid = 'video_provider'::regtype) THEN
    ALTER TYPE video_provider ADD VALUE 'geminigen';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'poyo' AND enumtypid = 'video_provider'::regtype) THEN
    ALTER TYPE video_provider ADD VALUE 'poyo';
  END IF;
END$$;

-- 3. Index for poller scan (status='processing', ordered by oldest poll)
CREATE INDEX IF NOT EXISTS idx_video_generations_pending_poll
  ON public.video_generations (last_polled_at NULLS FIRST)
  WHERE status = 'processing';

-- 4. Enable Realtime publication for video_generations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'video_generations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generations;
  END IF;
END$$;

-- Ensure REPLICA IDENTITY FULL so realtime emits old + new rows
ALTER TABLE public.video_generations REPLICA IDENTITY FULL;