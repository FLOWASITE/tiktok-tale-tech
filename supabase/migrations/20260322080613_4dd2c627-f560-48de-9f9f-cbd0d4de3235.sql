-- Revoke public API access to the materialized view (security fix)
REVOKE ALL ON mv_resolved_compliance_rules FROM anon, authenticated;

-- Grant access only via service role (edge functions)
GRANT SELECT ON mv_resolved_compliance_rules TO service_role;