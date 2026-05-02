-- SEO Landing Pages: programmatic SEO infrastructure
-- Public-facing landing pages (industry/comparison/use_case/feature) generated for organic traffic.

CREATE TABLE IF NOT EXISTS public.seo_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('industry', 'comparison', 'use_case', 'feature', 'tool')),
  locale text NOT NULL DEFAULT 'vi',

  -- SEO meta
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  keywords text[],

  -- Content blocks
  intro_html text,
  tldr jsonb,                     -- {bullets: string[]}
  sections jsonb DEFAULT '[]'::jsonb,  -- [{heading, body_html, image_url, schema_type}]
  faqs jsonb DEFAULT '[]'::jsonb,      -- [{question, answer}]
  key_stats jsonb DEFAULT '[]'::jsonb, -- [{label, value, source}]
  comparison_table jsonb,         -- {headers, rows} for comparison pages
  cta_label text DEFAULT 'Dùng thử miễn phí',
  cta_url text DEFAULT '/auth?mode=signup',

  -- Linking
  related_slugs text[] DEFAULT ARRAY[]::text[],
  industry_id uuid,               -- nullable FK reference to industry profiles (loose link)
  competitor_name text,           -- for comparison pages
  feature_key text,               -- for use_case/feature pages

  -- Visuals
  hero_image text,
  og_image text,

  -- Lifecycle
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  last_seo_score int,
  ai_generated boolean DEFAULT false,
  generation_prompt_version text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_seo_landing_pages_slug ON public.seo_landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_seo_landing_pages_type ON public.seo_landing_pages(page_type) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_seo_landing_pages_published ON public.seo_landing_pages(is_published, published_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_seo_landing_pages_updated_at ON public.seo_landing_pages;
CREATE TRIGGER trg_seo_landing_pages_updated_at
  BEFORE UPDATE ON public.seo_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.seo_landing_pages ENABLE ROW LEVEL SECURITY;

-- Public can read only published pages (for SSR/sitemap/anonymous landing visits)
CREATE POLICY "Public can view published SEO pages"
  ON public.seo_landing_pages
  FOR SELECT
  USING (is_published = true);

-- Admins can do everything (uses existing has_role helper)
CREATE POLICY "Admins can manage SEO pages"
  ON public.seo_landing_pages
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
