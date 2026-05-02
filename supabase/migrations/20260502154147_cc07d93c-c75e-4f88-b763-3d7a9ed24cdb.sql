CREATE TABLE IF NOT EXISTS public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  source_content_id UUID NOT NULL REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  url TEXT NOT NULL,
  similarity NUMERIC,
  status TEXT NOT NULL DEFAULT 'approved',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_content_id, target_content_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_links_source ON public.internal_links(source_content_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_org ON public.internal_links(organization_id);

ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read internal_links"
  ON public.internal_links FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = internal_links.organization_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members insert internal_links"
  ON public.internal_links FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = internal_links.organization_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members update internal_links"
  ON public.internal_links FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = internal_links.organization_id AND om.user_id = auth.uid()
  ));

CREATE POLICY "Members delete internal_links"
  ON public.internal_links FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = internal_links.organization_id AND om.user_id = auth.uid()
  ));

CREATE TRIGGER trg_internal_links_updated_at
  BEFORE UPDATE ON public.internal_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();