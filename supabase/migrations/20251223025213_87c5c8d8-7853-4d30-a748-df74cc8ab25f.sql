-- =============================================
-- PHASE 1: Industry Memory Lock-in Database Schema
-- =============================================

-- 1. Create industry_memory_versions table to store version history
CREATE TABLE public.industry_memory_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_template_id uuid NOT NULL REFERENCES public.industry_templates(id) ON DELETE CASCADE,
  version text NOT NULL,
  compliance_rules jsonb DEFAULT '[]'::jsonb,
  forbidden_terms text[] DEFAULT '{}'::text[],
  claim_restrictions jsonb DEFAULT '[]'::jsonb,
  brand_voice jsonb DEFAULT '{}'::jsonb,
  changed_by uuid,
  change_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on industry_memory_versions
ALTER TABLE public.industry_memory_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view version history
CREATE POLICY "Anyone can view industry memory versions"
ON public.industry_memory_versions
FOR SELECT
USING (true);

-- Only admins can manage versions
CREATE POLICY "Admins can manage industry memory versions"
ON public.industry_memory_versions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_industry_memory_versions_template 
ON public.industry_memory_versions(industry_template_id, created_at DESC);

-- 2. Add industry_memory_snapshot column to approval_logs
ALTER TABLE public.approval_logs 
ADD COLUMN industry_memory_snapshot jsonb DEFAULT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.approval_logs.industry_memory_snapshot IS 
'Stores Industry Memory context at time of approval: { industry_template_id, industry_name, version, compliance_passed, checklist, reviewer_confirmed, rejected_rules }';