UPDATE public.agent_pipelines
SET is_flagged = true,
    flag_reason = 'Auto-flagged: metadata lost during recovery, target_channels empty — fixed in code update'
WHERE completed_at IS NULL
  AND is_flagged = false
  AND id::text LIKE 'b92c2b08%';

UPDATE public.agent_pipelines
SET is_flagged = true,
    flag_reason = 'Auto-flagged: exceeded max retry or stuck with empty metadata'
WHERE completed_at IS NULL
  AND is_flagged = false
  AND current_stage = 'create'
  AND updated_at < now() - interval '1 hour'
  AND (
    pipeline_state::jsonb->'metadata'->'target_channels' IS NULL
    OR jsonb_array_length(COALESCE(pipeline_state::jsonb->'metadata'->'target_channels', '[]'::jsonb)) = 0
  );