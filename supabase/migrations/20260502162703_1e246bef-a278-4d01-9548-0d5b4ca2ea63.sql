-- Function to recompute SEO cluster status based on coverage and pillar content
CREATE OR REPLACE FUNCTION public.refresh_cluster_status(_cluster_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kw_total int;
  _kw_covered int;
  _has_pillar boolean;
  _new_status text;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE assigned_landing_page_id IS NOT NULL)
  INTO _kw_total, _kw_covered
  FROM public.seo_keywords
  WHERE cluster_id = _cluster_id;

  SELECT (pillar_content_id IS NOT NULL) INTO _has_pillar
  FROM public.seo_clusters WHERE id = _cluster_id;

  IF _kw_total = 0 THEN
    _new_status := 'planning';
  ELSIF _has_pillar AND (_kw_covered::numeric / NULLIF(_kw_total, 0)::numeric) >= 0.8 THEN
    _new_status := 'completed';
  ELSIF _kw_covered > 0 THEN
    _new_status := 'active';
  ELSE
    _new_status := 'planning';
  END IF;

  UPDATE public.seo_clusters
  SET status = _new_status, updated_at = now()
  WHERE id = _cluster_id AND status <> 'archived';

  RETURN _new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_cluster_status(uuid) TO authenticated;