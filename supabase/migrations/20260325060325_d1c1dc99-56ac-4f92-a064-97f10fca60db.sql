-- PHASE 0: Database Restructure for 6-stage pipeline

-- 0.1 Add new columns to agent_pipelines
ALTER TABLE public.agent_pipelines 
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'multichannel',
  ADD COLUMN IF NOT EXISTS quality_scores JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overall_quality_score INTEGER DEFAULT NULL;

ALTER TABLE public.agent_pipelines
  ADD CONSTRAINT agent_pipelines_content_type_check 
  CHECK (content_type IN ('multichannel', 'video_script', 'carousel'));

-- 0.2 Add strategy_summary to campaign_content_plans
ALTER TABLE public.campaign_content_plans
  ADD COLUMN IF NOT EXISTS strategy_summary TEXT DEFAULT NULL;

-- 0.4 Create new enum with 6 stages
CREATE TYPE public.agent_pipeline_stage_v2 AS ENUM (
  'strategy', 'create', 'quality', 'approval', 'publish', 'analyze'
);

-- Add new column with new enum type
ALTER TABLE public.agent_pipelines 
  ADD COLUMN current_stage_new public.agent_pipeline_stage_v2;

-- Migrate existing data
UPDATE public.agent_pipelines SET current_stage_new = CASE current_stage::text
  WHEN 'research' THEN 'strategy'::agent_pipeline_stage_v2
  WHEN 'creation' THEN 'create'::agent_pipeline_stage_v2
  WHEN 'optimization' THEN 'create'::agent_pipeline_stage_v2
  WHEN 'expansion' THEN 'create'::agent_pipeline_stage_v2
  WHEN 'compliance' THEN 'quality'::agent_pipeline_stage_v2
  WHEN 'approval' THEN 'approval'::agent_pipeline_stage_v2
  WHEN 'scheduled' THEN 'publish'::agent_pipeline_stage_v2
  WHEN 'published' THEN 'publish'::agent_pipeline_stage_v2
  WHEN 'analyzing' THEN 'analyze'::agent_pipeline_stage_v2
END;

-- Set default for new column
ALTER TABLE public.agent_pipelines 
  ALTER COLUMN current_stage_new SET DEFAULT 'strategy'::agent_pipeline_stage_v2;

-- Drop old column and rename new
ALTER TABLE public.agent_pipelines DROP COLUMN current_stage;
ALTER TABLE public.agent_pipelines RENAME COLUMN current_stage_new TO current_stage;

-- Make NOT NULL
ALTER TABLE public.agent_pipelines ALTER COLUMN current_stage SET NOT NULL;

-- Drop old enum and rename new to original name
DROP TYPE public.agent_pipeline_stage;
ALTER TYPE public.agent_pipeline_stage_v2 RENAME TO agent_pipeline_stage;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_pipelines_stage ON public.agent_pipelines(current_stage);
CREATE INDEX IF NOT EXISTS idx_agent_pipelines_content_type ON public.agent_pipelines(content_type);
CREATE INDEX IF NOT EXISTS idx_agent_pipelines_quality ON public.agent_pipelines(overall_quality_score);