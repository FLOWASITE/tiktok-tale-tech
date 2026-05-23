
-- Revoke column-level SELECT on `prompt` from regular authenticated/anon users.
-- Service role + postgres still have full access (used by edge functions).
REVOKE SELECT (prompt) ON public.channel_image_history FROM authenticated;
REVOKE SELECT (prompt) ON public.channel_image_history FROM anon;

-- Admin-only RPC to read a single prompt
CREATE OR REPLACE FUNCTION public.get_image_prompt(p_image_id uuid)
RETURNS TABLE(id uuid, prompt text, model text, channel text, aspect_ratio text, version integer, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT h.id, h.prompt, NULL::text AS model, h.channel, h.aspect_ratio, h.version, h.created_at
  FROM public.channel_image_history h
  WHERE h.id = p_image_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_image_prompt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_image_prompt(uuid) TO authenticated;
