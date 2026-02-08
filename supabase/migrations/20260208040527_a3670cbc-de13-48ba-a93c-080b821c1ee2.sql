-- Create enum for video generation status
CREATE TYPE public.video_generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for video provider
CREATE TYPE public.video_provider AS ENUM ('lovable', 'minimax', 'runway');

-- Create video_generations table
CREATE TABLE public.video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  storyboard_id UUID,
  scene_number INTEGER, -- null for full video, number for specific scene
  
  -- Provider info
  provider public.video_provider NOT NULL DEFAULT 'lovable',
  model_used TEXT,
  
  -- Input
  prompt TEXT NOT NULL,
  starting_frame_url TEXT, -- optional image to animate from
  duration_seconds INTEGER DEFAULT 5,
  aspect_ratio TEXT DEFAULT '16:9',
  resolution TEXT DEFAULT '1080p',
  
  -- Output
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Status tracking
  status public.video_generation_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  
  -- Metadata
  cost_estimate DECIMAL(10, 6),
  generation_time_ms INTEGER,
  
  -- Ownership
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own video generations"
ON public.video_generations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create video generations"
ON public.video_generations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own video generations"
ON public.video_generations FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own video generations"
ON public.video_generations FOR DELETE
USING (user_id = auth.uid());

-- Org members can view shared videos
CREATE POLICY "Org members can view org video generations"
ON public.video_generations FOR SELECT
USING (
  organization_id IS NOT NULL 
  AND public.is_org_member(auth.uid(), organization_id)
);

-- Indexes
CREATE INDEX idx_video_generations_script ON public.video_generations(script_id);
CREATE INDEX idx_video_generations_user ON public.video_generations(user_id);
CREATE INDEX idx_video_generations_status ON public.video_generations(status);
CREATE INDEX idx_video_generations_storyboard_scene ON public.video_generations(storyboard_id, scene_number);

-- Update trigger
CREATE TRIGGER update_video_generations_updated_at
BEFORE UPDATE ON public.video_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();