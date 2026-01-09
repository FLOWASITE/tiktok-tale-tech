-- =============================================
-- Phase 1: Channel Optimization Config Schema
-- =============================================

-- Add optimization fields to existing ai_channel_model_configs
ALTER TABLE public.ai_channel_model_configs
ADD COLUMN IF NOT EXISTS quality_mode_default TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS prompt_style TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS hook_intensity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS cost_priority TEXT DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS preferred_hook_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allow_user_override BOOLEAN DEFAULT true;

COMMENT ON COLUMN ai_channel_model_configs.quality_mode_default IS 'Default quality mode: fast, balanced, quality';
COMMENT ON COLUMN ai_channel_model_configs.prompt_style IS 'Prompt optimization style: default, concise, detailed, creative';
COMMENT ON COLUMN ai_channel_model_configs.hook_intensity IS 'Hook strength: soft, medium, strong, viral';
COMMENT ON COLUMN ai_channel_model_configs.cost_priority IS 'Cost optimization priority: economy, balanced, quality';
COMMENT ON COLUMN ai_channel_model_configs.preferred_hook_types IS 'Preferred hook framework types for this channel';
COMMENT ON COLUMN ai_channel_model_configs.allow_user_override IS 'Whether users can override this config at brand/content level';

-- Create brand-level channel optimization overrides table
CREATE TABLE IF NOT EXISTS public.brand_channel_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  
  -- Quality Mode Override
  quality_mode TEXT DEFAULT 'balanced',
  
  -- Prompt Optimization
  prompt_style TEXT DEFAULT 'default',
  
  -- Token/Cost Optimization
  max_tokens_override INTEGER,
  cost_priority TEXT DEFAULT 'balanced',
  
  -- Hook Optimization
  preferred_hook_types TEXT[] DEFAULT '{}',
  hook_intensity TEXT DEFAULT 'medium',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(brand_template_id, channel)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_channel_opt_brand ON public.brand_channel_optimizations(brand_template_id);
CREATE INDEX IF NOT EXISTS idx_brand_channel_opt_channel ON public.brand_channel_optimizations(channel);

-- Enable RLS
ALTER TABLE public.brand_channel_optimizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view brand channel optimizations in their org"
  ON public.brand_channel_optimizations FOR SELECT
  USING (
    brand_template_id IN (
      SELECT bt.id FROM public.brand_templates bt
      JOIN public.organization_members om ON bt.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage brand channel optimizations in their org"
  ON public.brand_channel_optimizations FOR ALL
  USING (
    brand_template_id IN (
      SELECT bt.id FROM public.brand_templates bt
      JOIN public.organization_members om ON bt.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_brand_channel_optimizations_updated_at
  BEFORE UPDATE ON public.brand_channel_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();