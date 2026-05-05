
CREATE TABLE public.external_link_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  brand_template_id uuid,
  source_type text NOT NULL CHECK (source_type IN ('wordpress','blogger','wordpress_com','sitemap','manual')),
  source_ref_id text,
  domain text NOT NULL,
  url text NOT NULL,
  title text,
  excerpt text,
  keywords text[] DEFAULT '{}',
  published_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, url)
);

CREATE INDEX idx_els_org_domain ON public.external_link_sources(organization_id, domain);
CREATE INDEX idx_els_org_source ON public.external_link_sources(organization_id, source_type);
CREATE INDEX idx_els_brand ON public.external_link_sources(brand_template_id);
CREATE INDEX idx_els_keywords ON public.external_link_sources USING GIN(keywords);
CREATE INDEX idx_els_title_trgm ON public.external_link_sources USING GIN (title gin_trgm_ops);

ALTER TABLE public.external_link_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select els" ON public.external_link_sources
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "org members insert els" ON public.external_link_sources
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "org members update els" ON public.external_link_sources
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "org members delete els" ON public.external_link_sources
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE TRIGGER trg_els_updated_at
  BEFORE UPDATE ON public.external_link_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
