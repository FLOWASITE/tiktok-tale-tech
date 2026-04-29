ALTER TABLE public.video_render_jobs
  ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_render_jobs_script
  ON public.video_render_jobs(script_id, created_at DESC)
  WHERE script_id IS NOT NULL;