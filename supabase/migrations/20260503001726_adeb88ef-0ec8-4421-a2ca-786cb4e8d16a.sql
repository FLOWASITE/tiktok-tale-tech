-- 1) Migrate keyword_clusters (cũ) sang seo_clusters (Pillars) — tránh trùng tên
INSERT INTO public.seo_clusters (organization_id, name, description, color, status)
SELECT 
  kc.organization_id,
  kc.name || CASE WHEN EXISTS (
    SELECT 1 FROM public.seo_clusters sc 
    WHERE sc.organization_id = kc.organization_id AND sc.name = kc.name
  ) THEN ' (auto)' ELSE '' END,
  kc.description,
  COALESCE(kc.color, '#6B7280'),
  'planning'
FROM public.keyword_clusters kc;

-- 2) Drop bảng cũ (FK seo_keywords.cluster_id đã trỏ vào seo_clusters, không ảnh hưởng)
DROP TABLE IF EXISTS public.keyword_clusters CASCADE;

-- 3) Indexes tăng tốc
CREATE INDEX IF NOT EXISTS idx_seo_keywords_org_status_priority 
  ON public.seo_keywords (organization_id, status, priority_score DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword_trgm 
  ON public.seo_keywords USING gin (keyword gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_seo_clusters_org_status 
  ON public.seo_clusters (organization_id, status);

-- 4) Trigger auto-link content → landing page khi multichannel published
CREATE OR REPLACE FUNCTION public.auto_assign_landing_page_to_keywords()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
BEGIN
  -- Chỉ chạy khi status đổi sang published và có target_keyword_ids
  IF NEW.status = 'published' 
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.target_keyword_ids IS NOT NULL 
     AND array_length(NEW.target_keyword_ids, 1) > 0 THEN
    
    -- Ưu tiên website_url, fallback published_url chung
    v_url := COALESCE(
      NEW.website_published_url, 
      NEW.blogger_published_url, 
      NEW.wordpress_published_url
    );
    
    IF v_url IS NOT NULL THEN
      UPDATE public.seo_keywords
      SET assigned_landing_page_id = NEW.id,
          tracking_url = v_url,
          status = CASE WHEN status IN ('new','researching','planned') THEN 'published'::text ELSE status END
      WHERE id = ANY(NEW.target_keyword_ids)
        AND organization_id = NEW.organization_id
        AND assigned_landing_page_id IS NULL; -- không đè nếu đã gán bài khác
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_landing_page ON public.multi_channel_contents;
CREATE TRIGGER trg_auto_assign_landing_page
  AFTER UPDATE OF status ON public.multi_channel_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_landing_page_to_keywords();