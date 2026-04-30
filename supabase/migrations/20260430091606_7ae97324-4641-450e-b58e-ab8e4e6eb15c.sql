ALTER TABLE public.audio_assets
  ADD COLUMN IF NOT EXISTS script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audio_assets_script_type_created
  ON public.audio_assets (script_id, asset_type, created_at DESC);