-- =============================================
-- PROMPT MANAGEMENT SYSTEM - Phase 1: Database Schema
-- =============================================

-- 1. Main prompts table
CREATE TABLE public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Identity
  function_name TEXT NOT NULL,
  prompt_key TEXT NOT NULL, -- e.g., 'system', 'user', 'outline', 'compile'
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('system', 'user', 'template', 'component')),
  
  -- Content
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  
  -- Template variables: [{name: 'brandName', required: true, default: ''}]
  variables JSONB DEFAULT '[]'::jsonb,
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System default, cannot be deleted
  
  -- Metadata
  category_id UUID REFERENCES public.ai_function_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per function/key/version/org
  UNIQUE(function_name, prompt_key, version, organization_id)
);

-- 2. Prompt history for versioning and audit trail
CREATE TABLE public.ai_prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Snapshot
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  variables JSONB,
  
  -- Change tracking
  changed_by UUID,
  change_reason TEXT,
  change_type TEXT DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'rollback', 'clone')),
  
  -- Performance metrics at this version
  avg_quality_score NUMERIC(5,2),
  usage_count INTEGER DEFAULT 0,
  avg_generation_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. A/B testing for prompts
CREATE TABLE public.ai_prompt_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Test info
  name TEXT NOT NULL,
  description TEXT,
  function_name TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  
  -- Variants
  variant_a_id UUID REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  variant_b_id UUID REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  
  -- Traffic split (percentage for variant A, rest goes to B)
  variant_a_weight INTEGER DEFAULT 50 CHECK (variant_a_weight >= 0 AND variant_a_weight <= 100),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  winner_variant TEXT CHECK (winner_variant IN ('a', 'b', NULL)),
  
  -- Metrics
  variant_a_impressions INTEGER DEFAULT 0,
  variant_a_avg_score NUMERIC(5,2),
  variant_a_avg_time_ms INTEGER,
  variant_b_impressions INTEGER DEFAULT 0,
  variant_b_avg_score NUMERIC(5,2),
  variant_b_avg_time_ms INTEGER,
  
  -- Statistical significance
  confidence_level NUMERIC(5,2),
  min_sample_size INTEGER DEFAULT 100,
  
  -- Timeline
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

-- ai_prompts indexes
CREATE INDEX idx_ai_prompts_function_key ON public.ai_prompts(function_name, prompt_key);
CREATE INDEX idx_ai_prompts_org ON public.ai_prompts(organization_id);
CREATE INDEX idx_ai_prompts_active ON public.ai_prompts(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_prompts_default ON public.ai_prompts(is_default) WHERE is_default = true;
CREATE INDEX idx_ai_prompts_category ON public.ai_prompts(category_id);

-- ai_prompt_history indexes
CREATE INDEX idx_ai_prompt_history_prompt ON public.ai_prompt_history(prompt_id);
CREATE INDEX idx_ai_prompt_history_org ON public.ai_prompt_history(organization_id);
CREATE INDEX idx_ai_prompt_history_created ON public.ai_prompt_history(created_at DESC);

-- ai_prompt_ab_tests indexes
CREATE INDEX idx_ai_prompt_ab_tests_org ON public.ai_prompt_ab_tests(organization_id);
CREATE INDEX idx_ai_prompt_ab_tests_function ON public.ai_prompt_ab_tests(function_name, prompt_key);
CREATE INDEX idx_ai_prompt_ab_tests_status ON public.ai_prompt_ab_tests(status) WHERE status = 'running';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_ab_tests ENABLE ROW LEVEL SECURITY;

-- ai_prompts policies
CREATE POLICY "Users can view prompts for their organization or global defaults"
ON public.ai_prompts FOR SELECT
USING (
  organization_id IS NULL 
  OR organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create prompts for their organization"
ON public.ai_prompts FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can update prompts for their organization"
ON public.ai_prompts FOR UPDATE
USING (
  is_default = false AND
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can delete non-default prompts for their organization"
ON public.ai_prompts FOR DELETE
USING (
  is_default = false AND
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- ai_prompt_history policies
CREATE POLICY "Users can view prompt history for their organization"
ON public.ai_prompt_history FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert prompt history"
ON public.ai_prompt_history FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- ai_prompt_ab_tests policies
CREATE POLICY "Users can view AB tests for their organization"
ON public.ai_prompt_ab_tests FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage AB tests for their organization"
ON public.ai_prompt_ab_tests FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_prompt_ab_tests_updated_at
  BEFORE UPDATE ON public.ai_prompt_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create history on prompt update
CREATE OR REPLACE FUNCTION public.log_prompt_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.ai_prompt_history (
      prompt_id,
      organization_id,
      content,
      version,
      variables,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.content,
      OLD.version,
      OLD.variables,
      auth.uid(),
      'update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_prompt_change
  AFTER UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_prompt_change();

-- =============================================
-- EXTEND ai_metrics FOR PROMPT TRACKING
-- =============================================

ALTER TABLE public.ai_metrics 
  ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.ai_prompts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prompt_version INTEGER,
  ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES public.ai_prompt_ab_tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_test_variant TEXT CHECK (ab_test_variant IN ('a', 'b', NULL));

CREATE INDEX IF NOT EXISTS idx_ai_metrics_prompt ON public.ai_metrics(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_ab_test ON public.ai_metrics(ab_test_id);