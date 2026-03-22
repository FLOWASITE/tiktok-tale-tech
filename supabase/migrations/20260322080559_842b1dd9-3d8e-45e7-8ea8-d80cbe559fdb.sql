-- Materialized View: Flattened compliance rules from jurisdiction profiles
-- Pre-computes key compliance fields from resolved_rules JSONB for fast lookups

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resolved_compliance_rules AS
SELECT
  ijp.id AS jurisdiction_profile_id,
  ijp.global_pack_id,
  igp.industry_code,
  ijp.jurisdiction_code,
  ijp.validity_status,
  ijp.disclaimer,
  ijp.resolved_rules,
  -- Extract key fields from resolved_rules JSONB for fast access
  ijp.resolved_rules->'terminology'->'forbidden_terms' AS forbidden_terms,
  ijp.resolved_rules->'terminology'->'forbidden_words_local' AS forbidden_words_local,
  ijp.resolved_rules->'compliance_rules' AS compliance_rules,
  ijp.resolved_rules->'claim_restrictions' AS claim_restrictions,
  ijp.resolved_rules->'tone_guidelines' AS tone_guidelines,
  ijp.updated_at
FROM industry_jurisdiction_profiles ijp
JOIN industry_global_packs igp ON igp.id = ijp.global_pack_id
WHERE igp.is_active = true;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_rules_pk 
ON mv_resolved_compliance_rules (jurisdiction_profile_id);

-- Common lookup indexes
CREATE INDEX IF NOT EXISTS idx_mv_compliance_industry_code 
ON mv_resolved_compliance_rules (industry_code);

CREATE INDEX IF NOT EXISTS idx_mv_compliance_jurisdiction 
ON mv_resolved_compliance_rules (jurisdiction_code);

CREATE INDEX IF NOT EXISTS idx_mv_compliance_pack_jurisdiction
ON mv_resolved_compliance_rules (global_pack_id, jurisdiction_code);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_compliance_rules_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resolved_compliance_rules;
END;
$$;