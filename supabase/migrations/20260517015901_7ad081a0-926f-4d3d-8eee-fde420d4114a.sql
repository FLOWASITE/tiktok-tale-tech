CREATE OR REPLACE FUNCTION public.claim_pipeline_stage(
  p_pipeline_id uuid,
  p_expected_stage text DEFAULT NULL,
  p_stale_seconds int DEFAULT 300
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := gen_random_uuid()::text;
  v_updated int;
BEGIN
  UPDATE public.agent_pipelines
     SET stage_claim_token = v_token,
         stage_claim_at = now()
   WHERE id = p_pipeline_id
     AND (p_expected_stage IS NULL OR current_stage::text = p_expected_stage)
     AND (stage_claim_token IS NULL OR stage_claim_at < now() - make_interval(secs => p_stale_seconds));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated > 0 THEN RETURN v_token; END IF;
  RETURN NULL;
END;
$$;