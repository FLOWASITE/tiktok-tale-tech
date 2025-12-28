-- =============================================
-- GIAI ĐOẠN 1: NỀN TẢNG KỸ THUẬT
-- 1. GIN Indexes cho JSONB columns
-- 2. Soft Delete cho industry_templates và brand_templates
-- 3. Cập nhật RLS policies
-- =============================================

-- =============================================
-- 1. GIN INDEXES CHO JSONB COLUMNS
-- Tối ưu hiệu suất query cho các trường JSONB phức tạp
-- =============================================

CREATE INDEX IF NOT EXISTS idx_industry_templates_compliance_rules 
  ON public.industry_templates USING GIN (compliance_rules);

CREATE INDEX IF NOT EXISTS idx_industry_templates_brand_voice 
  ON public.industry_templates USING GIN (brand_voice);

CREATE INDEX IF NOT EXISTS idx_industry_templates_argument_patterns 
  ON public.industry_templates USING GIN (argument_patterns);

CREATE INDEX IF NOT EXISTS idx_industry_templates_system_rules 
  ON public.industry_templates USING GIN (system_rules);

CREATE INDEX IF NOT EXISTS idx_industry_templates_claim_restrictions 
  ON public.industry_templates USING GIN (claim_restrictions);

-- =============================================
-- 2. SOFT DELETE COLUMNS
-- Cho phép khôi phục dữ liệu đã xóa
-- =============================================

-- Add soft delete columns to industry_templates
ALTER TABLE public.industry_templates 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.industry_templates 
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add soft delete columns to brand_templates
ALTER TABLE public.brand_templates 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.brand_templates 
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.industry_templates.deleted_at IS 'Timestamp when record was soft deleted. NULL means active.';
COMMENT ON COLUMN public.industry_templates.deleted_by IS 'User who performed the soft delete.';
COMMENT ON COLUMN public.brand_templates.deleted_at IS 'Timestamp when record was soft deleted. NULL means active.';
COMMENT ON COLUMN public.brand_templates.deleted_by IS 'User who performed the soft delete.';

-- =============================================
-- 3. CẬP NHẬT RLS POLICIES
-- Filter out deleted records cho SELECT
-- =============================================

-- Drop existing policies that need updating for brand_templates
DROP POLICY IF EXISTS "Users can view own brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Users can view org brand_templates" ON public.brand_templates;

-- Recreate with soft delete filter
CREATE POLICY "Users can view own brand_templates" 
  ON public.brand_templates 
  FOR SELECT 
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view org brand_templates" 
  ON public.brand_templates 
  FOR SELECT 
  USING (
    organization_id IS NOT NULL 
    AND is_org_member(auth.uid(), organization_id) 
    AND deleted_at IS NULL
  );

-- Add policy for admins to view deleted brand_templates (for restoration)
CREATE POLICY "Org admins can view deleted brand_templates" 
  ON public.brand_templates 
  FOR SELECT 
  USING (
    organization_id IS NOT NULL 
    AND is_org_admin(auth.uid(), organization_id) 
    AND deleted_at IS NOT NULL
  );

-- Drop existing policies for industry_templates
DROP POLICY IF EXISTS "Anyone can view active industry templates" ON public.industry_templates;

-- Recreate with soft delete filter
CREATE POLICY "Anyone can view active industry templates" 
  ON public.industry_templates 
  FOR SELECT 
  USING (is_active = true AND deleted_at IS NULL);

-- Add policy for admins to view deleted industry_templates (for restoration)
CREATE POLICY "Admins can view deleted industry templates" 
  ON public.industry_templates 
  FOR SELECT 
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND deleted_at IS NOT NULL
  );

-- =============================================
-- 4. INDEXES CHO SOFT DELETE QUERIES
-- Tối ưu query filter deleted records
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brand_templates_deleted_at 
  ON public.brand_templates (deleted_at) 
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_industry_templates_deleted_at 
  ON public.industry_templates (deleted_at) 
  WHERE deleted_at IS NOT NULL;