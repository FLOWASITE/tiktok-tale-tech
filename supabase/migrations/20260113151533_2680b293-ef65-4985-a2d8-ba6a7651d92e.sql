-- Create detailed quality stats function for monitoring
CREATE OR REPLACE FUNCTION get_detailed_quality_stats()
RETURNS jsonb 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_regulations', COUNT(*) FILTER (WHERE node_type = 'regulation'),
    'with_full_text', COUNT(*) FILTER (WHERE node_type = 'regulation' AND full_text IS NOT NULL AND LENGTH(full_text) > 100),
    'with_quality_score', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score IS NOT NULL),
    'excellent_90_plus', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 90),
    'good_80_to_89', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 80 AND content_quality_score < 90),
    'acceptable_70_to_79', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 70 AND content_quality_score < 80),
    'poor_below_70', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score < 70),
    'pending_parse', COUNT(*) FILTER (WHERE node_type = 'regulation' AND (parse_status = 'pending' OR parse_status IS NULL)),
    'failed_parse', COUNT(*) FILTER (WHERE node_type = 'regulation' AND parse_status = 'failed'),
    'needs_ai_clean', COUNT(*) FILTER (
      WHERE node_type = 'regulation' 
      AND content_quality_score IS NOT NULL 
      AND content_quality_score < 85
      AND (quality_breakdown->>'artifact_penalty')::int > 15
    ),
    'with_artifacts', COUNT(*) FILTER (
      WHERE node_type = 'regulation'
      AND full_text IS NOT NULL
      AND (
        full_text LIKE '%Turn on more accessible%'
        OR full_text LIKE '%[![%'
        OR full_text LIKE '%| --- |%'
        OR full_text LIKE '%Đăng nhập%Đăng ký%'
        OR full_text LIKE '%Văn bản liên quan%Xem thêm%'
      )
    ),
    'avg_quality_score', ROUND(AVG(content_quality_score) FILTER (WHERE node_type = 'regulation' AND content_quality_score IS NOT NULL)),
    'avg_text_length', ROUND(AVG(LENGTH(full_text)) FILTER (WHERE node_type = 'regulation' AND full_text IS NOT NULL)),
    'quality_distribution', jsonb_build_object(
      '0-49', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 0 AND 49),
      '50-69', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 50 AND 69),
      '70-79', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 70 AND 79),
      '80-89', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 80 AND 89),
      '90-100', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 90 AND 100)
    )
  )
  INTO result
  FROM industry_knowledge_nodes;
  
  RETURN result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_detailed_quality_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_detailed_quality_stats() TO service_role;