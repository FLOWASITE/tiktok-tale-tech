UPDATE public.agent_pipelines
SET is_flagged = false,
    flag_reason = NULL,
    current_stage = 'create',
    pipeline_state = jsonb_set(
      pipeline_state,
      '{stages,create}',
      '{"status":"pending","retry_count":0}'::jsonb
    ),
    stage_started_at = now(),
    stage_claim_token = NULL,
    stage_claim_at = NULL
WHERE id = 'b737ab70-0e25-44f9-92a1-72fa63fbf69e';