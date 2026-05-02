import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeoLandingPageRow {
  id: string;
  slug: string;
  page_type: "industry" | "comparison" | "use_case" | "feature" | "tool";
  locale: string;
  title: string;
  meta_description: string;
  h1: string;
  keywords: string[] | null;
  intro_html: string | null;
  tldr: { bullets: string[] } | null;
  sections: Array<{
    heading?: string;
    body_html?: string;
    image_url?: string;
    schema_type?: string;
  }> | null;
  faqs: Array<{ question: string; answer: string }> | null;
  key_stats: Array<{ label: string; value: string; source?: string }> | null;
  comparison_table: { headers: string[]; rows: Array<{ feature: string; values: Array<string | boolean> }> } | null;
  cta_label: string | null;
  cta_url: string | null;
  related_slugs: string[] | null;
  competitor_name: string | null;
  feature_key: string | null;
  hero_image: string | null;
  og_image: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
}

/**
 * Fetches a published SEO landing page by slug.
 * Returns null if not found / not published. RLS already filters unpublished rows for anon users.
 */
export function useSeoLandingPage(slug: string | undefined, pageType?: SeoLandingPageRow["page_type"]) {
  return useQuery({
    queryKey: ["seo-landing-page", slug, pageType],
    enabled: !!slug,
    queryFn: async (): Promise<SeoLandingPageRow | null> => {
      let q = supabase
        .from("seo_landing_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .limit(1);

      if (pageType) q = q.eq("page_type", pageType);

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as SeoLandingPageRow | null;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
