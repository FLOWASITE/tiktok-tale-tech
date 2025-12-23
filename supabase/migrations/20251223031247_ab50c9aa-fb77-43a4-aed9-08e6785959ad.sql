-- Phase 1: Add missing columns to industry_templates
-- Add version column to track current version
ALTER TABLE public.industry_templates 
ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0';

-- Add compliance_rules (JSONB for flexibility)
ALTER TABLE public.industry_templates 
ADD COLUMN IF NOT EXISTS compliance_rules jsonb DEFAULT '[]'::jsonb;

-- Add claim_restrictions (JSONB array)
ALTER TABLE public.industry_templates 
ADD COLUMN IF NOT EXISTS claim_restrictions jsonb DEFAULT '[]'::jsonb;

-- Add forbidden_terms (text array for simple terms)
ALTER TABLE public.industry_templates 
ADD COLUMN IF NOT EXISTS forbidden_terms text[] DEFAULT '{}'::text[];

-- Phase 2: Create function to auto-increment version
CREATE OR REPLACE FUNCTION public.increment_industry_version(current_version text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  major int;
  minor int;
  parts text[];
BEGIN
  -- Parse version like "1.0" or "2.3"
  parts := string_to_array(current_version, '.');
  
  IF array_length(parts, 1) = 2 THEN
    major := parts[1]::int;
    minor := parts[2]::int;
    minor := minor + 1;
    RETURN major::text || '.' || minor::text;
  ELSE
    -- Default if format is wrong
    RETURN '1.0';
  END IF;
END;
$$;

-- Phase 3: Create trigger function to auto-create version snapshot
CREATE OR REPLACE FUNCTION public.on_industry_template_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version text;
  has_compliance_change boolean;
BEGIN
  -- Check if compliance-related fields changed
  has_compliance_change := (
    OLD.compliance_rules IS DISTINCT FROM NEW.compliance_rules OR
    OLD.claim_restrictions IS DISTINCT FROM NEW.claim_restrictions OR
    OLD.forbidden_terms IS DISTINCT FROM NEW.forbidden_terms OR
    OLD.brand_voice IS DISTINCT FROM NEW.brand_voice
  );
  
  -- Only create version if compliance fields changed
  IF has_compliance_change THEN
    -- Increment version
    new_version := increment_industry_version(COALESCE(OLD.version, '1.0'));
    NEW.version := new_version;
    
    -- Create version snapshot in industry_memory_versions
    INSERT INTO public.industry_memory_versions (
      industry_template_id,
      version,
      compliance_rules,
      claim_restrictions,
      forbidden_terms,
      brand_voice,
      changed_by,
      change_notes
    ) VALUES (
      NEW.id,
      new_version,
      NEW.compliance_rules,
      NEW.claim_restrictions,
      NEW.forbidden_terms,
      NEW.brand_voice,
      NEW.updated_by,
      'Auto-created on template update'
    );
    
    RAISE NOTICE 'Industry Memory version created: % -> %', COALESCE(OLD.version, '1.0'), new_version;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Phase 4: Create the trigger
DROP TRIGGER IF EXISTS trigger_industry_template_version ON public.industry_templates;

CREATE TRIGGER trigger_industry_template_version
  BEFORE UPDATE ON public.industry_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.on_industry_template_update();

-- Phase 5: Initialize version for existing templates that don't have one
UPDATE public.industry_templates 
SET version = '1.0' 
WHERE version IS NULL;