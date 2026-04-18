-- Auto-bump industry_templates.version when any compliance rule field changes.
-- This complements the existing invalidate_cache_on_industry_update trigger
-- (which only fires when version changes) by guaranteeing version DOES change
-- whenever rules are edited, even if the admin forgot to bump it manually.
--
-- Strategy: append a timestamp suffix (.YYYYMMDDHHMMSS) so the new version is
-- always different from the old one and lexicographically greater.
-- This cascades into ai_response_cache invalidation via the existing trigger.

CREATE OR REPLACE FUNCTION public.auto_bump_industry_version_on_rules_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rules_changed boolean := false;
  base_version text;
  ts_suffix text;
BEGIN
  -- Detect any rule-relevant field change
  IF OLD.compliance_rules   IS DISTINCT FROM NEW.compliance_rules
     OR OLD.claim_restrictions IS DISTINCT FROM NEW.claim_restrictions
     OR OLD.forbidden_terms    IS DISTINCT FROM NEW.forbidden_terms
     OR OLD.argument_patterns  IS DISTINCT FROM NEW.argument_patterns
     OR OLD.system_rules       IS DISTINCT FROM NEW.system_rules
     OR OLD.brand_voice        IS DISTINCT FROM NEW.brand_voice
  THEN
    rules_changed := true;
  END IF;

  -- Only act if rules changed AND admin did NOT also manually bump version
  IF rules_changed AND OLD.version IS NOT DISTINCT FROM NEW.version THEN
    -- Strip any prior auto-suffix so we don't keep stacking timestamps
    base_version := regexp_replace(COALESCE(NEW.version, '1.0'), '\.\d{14}$', '');
    ts_suffix    := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
    NEW.version  := base_version || '.' || ts_suffix;
    RAISE NOTICE 'auto_bump_industry_version: % -> %', OLD.version, NEW.version;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_bump_industry_version ON public.industry_templates;

-- Run BEFORE the existing invalidation trigger so the version change cascades
CREATE TRIGGER trg_auto_bump_industry_version
BEFORE UPDATE ON public.industry_templates
FOR EACH ROW
EXECUTE FUNCTION public.auto_bump_industry_version_on_rules_change();