-- Create prompt_analytics table for tracking prompt performance
CREATE TABLE IF NOT EXISTS public.prompt_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  function_name TEXT NOT NULL, -- 'generate-topic-suggestions', 'generate-script', etc.
  content_id UUID, -- Reference to created content
  
  -- Context used
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Prompt quality metrics
  context_richness_score INTEGER CHECK (context_richness_score >= 0 AND context_richness_score <= 100),
  learning_data_score INTEGER CHECK (learning_data_score >= 0 AND learning_data_score <= 100),
  
  -- Execution metrics
  execution_time_ms INTEGER,
  token_count INTEGER,
  model_used TEXT DEFAULT 'google/gemini-2.5-flash',
  
  -- Output quality
  output_accepted BOOLEAN DEFAULT true, -- User used the output?
  user_edited BOOLEAN DEFAULT false, -- User modified the output?
  edit_percentage REAL CHECK (edit_percentage >= 0 AND edit_percentage <= 100), -- 0-100: How much was edited
  
  -- Performance tracking
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100), -- Post-publish performance
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_prompt_analytics_function ON prompt_analytics(function_name);
CREATE INDEX idx_prompt_analytics_brand ON prompt_analytics(brand_template_id);
CREATE INDEX idx_prompt_analytics_org ON prompt_analytics(organization_id);
CREATE INDEX idx_prompt_analytics_created ON prompt_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.prompt_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only authenticated users can view their organization's analytics
CREATE POLICY "Users can view their organization's prompt analytics"
ON public.prompt_analytics
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage prompt analytics"
ON public.prompt_analytics
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.prompt_analytics IS 'Tracks AI prompt performance for continuous improvement';