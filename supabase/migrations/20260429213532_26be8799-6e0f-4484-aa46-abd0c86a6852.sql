-- Phase 4-6: Storyboard stitching, Audio Studio, Quota tracking

-- 1. Render jobs (Creatomate stitching multi-scene + subtitle burn-in)
CREATE TABLE IF NOT EXISTS public.video_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  storyboard_id UUID,
  source_clip_ids UUID[] NOT NULL DEFAULT '{}',
  voiceover_url TEXT,
  bgm_url TEXT,
  subtitle_srt TEXT,
  burn_subtitles BOOLEAN NOT NULL DEFAULT true,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  output_url TEXT,
  thumbnail_url TEXT,
  provider TEXT NOT NULL DEFAULT 'creatomate',
  provider_render_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  poll_attempts INTEGER NOT NULL DEFAULT 0,
  last_polled_at TIMESTAMPTZ,
  error_message TEXT,
  cost_estimate NUMERIC(10,6),
  duration_seconds NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON public.video_render_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_pending ON public.video_render_jobs(last_polled_at NULLS FIRST) WHERE status = 'processing';

ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own render jobs" ON public.video_render_jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Org members view org render jobs" ON public.video_render_jobs FOR SELECT USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users create render jobs" ON public.video_render_jobs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own render jobs" ON public.video_render_jobs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own render jobs" ON public.video_render_jobs FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_render_jobs_updated_at BEFORE UPDATE ON public.video_render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_render_jobs;

-- 2. Audio assets (voiceover TTS, music, subtitles)
CREATE TABLE IF NOT EXISTS public.audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('voiceover','music','sfx','subtitle')),
  source_text TEXT,
  prompt TEXT,
  voice_id TEXT,
  language TEXT DEFAULT 'vi',
  duration_seconds NUMERIC(10,2),
  audio_url TEXT,
  srt_content TEXT,
  vtt_content TEXT,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  cost_estimate NUMERIC(10,6),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_user ON public.audio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_type ON public.audio_assets(asset_type);

ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audio" ON public.audio_assets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Org members view org audio" ON public.audio_assets FOR SELECT USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users create audio" ON public.audio_assets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own audio" ON public.audio_assets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own audio" ON public.audio_assets FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_audio_assets_updated_at BEFORE UPDATE ON public.audio_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage buckets cho audio + final renders
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-assets', 'audio-assets', true), ('video-renders', 'video-renders', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Audio publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'audio-assets');
CREATE POLICY "Users upload own audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own audio" ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Renders publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'video-renders');
CREATE POLICY "Users upload own renders" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-renders' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own renders" ON storage.objects FOR DELETE
  USING (bucket_id = 'video-renders' AND auth.uid()::text = (storage.foldername(name))[1]);