import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LandingNav, FooterSection, PublicPageLayout } from "@/landing/components";
import { SEOHead } from "@/components/SEOHead";
import { useSeoLandingPage, type SeoLandingPageRow } from "@/landing/hooks/useSeoLandingPage";
import { TLDRBox, KeyStats, ComparisonTable, SeoFAQ } from "@/landing/components/seo";
import { Button } from "@/components/ui/button";

interface DynamicLandingPageProps {
  pageType: SeoLandingPageRow["page_type"];
  routePrefix: string; // e.g. "/giai-phap", "/so-sanh", "/cong-cu"
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Đang tải...</div>
    </div>
  );
}

/**
 * Renders SEO landing pages from `seo_landing_pages` DB table.
 * One component handles industry / comparison / use_case / feature / tool variants.
 *
 * Routes that use it:
 *   /giai-phap/:slug      → industry pages
 *   /so-sanh/:slug        → comparison pages
 *   /cong-cu/:slug        → free tool pages
 *   /tinh-nang/:slug      → feature pages
 *   /lp/:slug             → generic fallback
 */
export default function DynamicLandingPage({ pageType, routePrefix }: DynamicLandingPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = useSeoLandingPage(slug, pageType);

  if (isLoading) return <LoadingState />;
  if (error || !page) return <Navigate to="/" replace />;

  const canonicalPath = `${routePrefix}/${page.slug}`;
  const ctaLabel = page.cta_label || "Dùng thử miễn phí";
  const ctaUrl = page.cta_url || "/auth?mode=signup";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={page.title}
        description={page.meta_description}
        canonicalPath={canonicalPath}
        ogImage={page.og_image || page.hero_image || undefined}
        ogType={pageType === "comparison" ? "article" : "website"}
        breadcrumbs={[
          { name: "Trang chủ", url: "/" },
          { name: routeLabel(pageType), url: routePrefix },
          { name: page.h1, url: canonicalPath },
        ]}
      />
      <LandingNav />
      <PublicPageLayout>
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <header className="py-12 sm:py-16">
            {page.keywords && page.keywords.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {page.keywords.slice(0, 3).map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {page.h1}
            </h1>
            {page.intro_html && (
              <div
                className="mt-6 text-lg leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: page.intro_html }}
              />
            )}
            {page.hero_image && (
              <img
                src={page.hero_image}
                alt={page.h1}
                loading="eager"
                className="mt-8 w-full rounded-2xl border border-border"
              />
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={ctaUrl}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">Xem bảng giá</Link>
              </Button>
            </div>
          </header>

          {/* TL;DR — answer engine block */}
          {page.tldr?.bullets?.length ? <TLDRBox bullets={page.tldr.bullets} /> : null}

          {/* Key stats */}
          {page.key_stats?.length ? <KeyStats stats={page.key_stats} /> : null}

          {/* Comparison table (for vs- pages) */}
          {page.comparison_table ? (
            <ComparisonTable
              headers={page.comparison_table.headers}
              rows={page.comparison_table.rows}
              title={page.competitor_name ? `Flowa vs ${page.competitor_name}` : undefined}
            />
          ) : null}

          {/* Body sections */}
          {page.sections?.length ? (
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              {page.sections.map((s, i) => (
                <section key={i} className="my-10">
                  {s.heading && <h2 className="text-2xl font-semibold sm:text-3xl">{s.heading}</h2>}
                  {s.image_url && (
                    <img
                      src={s.image_url}
                      alt={s.heading || ""}
                      loading="lazy"
                      className="my-6 w-full rounded-xl border border-border"
                    />
                  )}
                  {s.body_html && (
                    <div
                      className="mt-4 leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: s.body_html }}
                    />
                  )}
                </section>
              ))}
            </div>
          ) : null}

          {/* FAQ — emits FAQPage schema */}
          {page.faqs?.length ? <SeoFAQ faqs={page.faqs} /> : null}

          {/* Related */}
          {page.related_slugs && page.related_slugs.length > 0 && (
            <section className="my-12 border-t border-border pt-8">
              <h2 className="mb-4 text-xl font-semibold">Có thể bạn quan tâm</h2>
              <ul className="space-y-2">
                {page.related_slugs.map((rs) => (
                  <li key={rs}>
                    <Link
                      to={`${routePrefix}/${rs}`}
                      className="text-primary hover:underline"
                    >
                      → {rs.replace(/-/g, " ")}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Bottom CTA */}
          <section className="my-16 rounded-2xl border border-border bg-muted/20 p-8 text-center">
            <h2 className="text-2xl font-semibold">Sẵn sàng tự động hoá content marketing?</h2>
            <p className="mt-2 text-muted-foreground">
              Setup 5 phút — không cần thẻ tín dụng.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link to={ctaUrl}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </article>
      </PublicPageLayout>
      <FooterSection />
    </div>
  );
}

function routeLabel(t: SeoLandingPageRow["page_type"]): string {
  switch (t) {
    case "industry": return "Giải pháp theo ngành";
    case "comparison": return "So sánh";
    case "use_case": return "Use cases";
    case "feature": return "Tính năng";
    case "tool": return "Công cụ miễn phí";
    default: return "Landing";
  }
}
