CREATE OR REPLACE FUNCTION public.update_pipeline_content_id(
  p_pipeline_id UUID,
  p_content_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_pipelines
  SET content_id = p_content_id,
      updated_at = NOW()
  WHERE id = p_pipeline_id;
END;
$$;