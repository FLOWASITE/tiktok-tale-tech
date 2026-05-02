// Public dynamic sitemap.xml generator for flowa.one
// No JWT required - serves XML to crawlers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://flowa.one";

const STATIC_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/pricing", changefreq: "weekly", priority: "0.95" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/careers", changefreq: "monthly", priority: "0.6" },
  { loc: "/blog", changefreq: "weekly", priority: "0.9" },
  { loc: "/terms", changefreq: "yearly", priority: "0.4" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.4" },
];

// Hardcoded landing blog posts (legacy)
const LEGACY_BLOG_SLUGS = [
  "flowa-content-marketing-da-kenh",
  "cach-tao-content-da-kenh",
  "ai-content-marketing-huong-dan",
  "content-repurposing-chien-luoc",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c] as string));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull public blog posts from DB (best-effort, ignore errors)
    let dbPosts: Array<{ slug: string; updated_at: string }> = [];
    try {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("is_public", true)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(500);
      if (data) dbPosts = data.map((p: any) => ({ slug: p.slug, updated_at: p.updated_at || p.published_at }));
    } catch (e) {
      console.warn("[generate-sitemap] DB pull failed:", e);
    }

    const today = new Date().toISOString().split("T")[0];

    const urls: string[] = [];

    // Static pages
    for (const u of STATIC_URLS) {
      urls.push(`  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`);
    }

    // Legacy hardcoded blog
    for (const slug of LEGACY_BLOG_SLUGS) {
      urls.push(`  <url>
    <loc>${SITE_URL}/blog/${escapeXml(slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // DB blog posts (skip duplicates with legacy)
    const seen = new Set(LEGACY_BLOG_SLUGS);
    for (const p of dbPosts) {
      if (!p.slug || seen.has(p.slug)) continue;
      seen.add(p.slug);
      const lastmod = p.updated_at ? p.updated_at.split("T")[0] : today;
      urls.push(`  <url>
    <loc>${SITE_URL}/blog/${escapeXml(p.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[generate-sitemap] error:", err);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});
