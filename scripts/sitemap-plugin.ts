import type { Plugin } from "vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const SITE_URL = "https://flowa.one";
const SUPABASE_URL = "https://rllyipiyuptkibqinotz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbHlpcGl5dXB0a2licWlub3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzE2NjMsImV4cCI6MjA4MTg0NzY2M30.mxEDfftc7aKZxQv63L4kLQpOtyyjtHaV18WEMWTp7-w";

const STATIC_URLS = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/pricing", changefreq: "weekly", priority: "0.95" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/careers", changefreq: "monthly", priority: "0.6" },
  { loc: "/blog", changefreq: "weekly", priority: "0.9" },
  { loc: "/sitemap", changefreq: "weekly", priority: "0.5" },
  { loc: "/terms", changefreq: "yearly", priority: "0.4" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.4" },
];

const LEGACY_BLOG_SLUGS = [
  "flowa-content-marketing-da-kenh",
  "cach-tao-content-da-kenh",
  "ai-content-marketing-huong-dan",
  "content-repurposing-chien-luoc",
];

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string),
  );
}

interface DBPost {
  slug: string;
  title?: string | null;
  cover_image?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
}

async function fetchDbPosts(): Promise<DBPost[]> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,cover_image,updated_at,published_at&is_public=eq.true&status=eq.published&order=published_at.desc&limit=500`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] DB fetch failed: ${res.status}`);
      return [];
    }
    return (await res.json()) as DBPost[];
  } catch (err) {
    console.warn("[sitemap] DB fetch error:", err);
    return [];
  }
}

function buildXml(posts: DBPost[]): string {
  const today = new Date().toISOString().split("T")[0];
  const hreflangFor = (loc: string) =>
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`;

  const urls: string[] = [];

  for (const u of STATIC_URLS) {
    const loc = `${SITE_URL}${u.loc}`;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${hreflangFor(loc)}
  </url>`);
  }

  for (const slug of LEGACY_BLOG_SLUGS) {
    const loc = `${SITE_URL}/blog/${escapeXml(slug)}`;
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${hreflangFor(loc)}
  </url>`);
  }

  const seen = new Set(LEGACY_BLOG_SLUGS);
  for (const p of posts) {
    if (!p.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    const lastmod = (p.updated_at || p.published_at || "").split("T")[0] || today;
    const loc = `${SITE_URL}/blog/${escapeXml(p.slug)}`;
    const imageBlock = p.cover_image
      ? `\n    <image:image>
      <image:loc>${escapeXml(p.cover_image)}</image:loc>
      ${p.title ? `<image:title>${escapeXml(p.title)}</image:title>` : ""}
    </image:image>`
      : "";
    urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
${hreflangFor(loc)}${imageBlock}
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;
}

/**
 * Vite plugin: generate sitemap.xml at build time, merging static landing pages
 * with published blog posts from the Supabase DB. Output written to dist/sitemap.xml.
 *
 * Why build-time: Lovable hosting is static SPA — no server-side rewrite/proxy.
 * Google Search Console requires sitemap on same domain (flowa.one), so we
 * cannot point GSC directly at the Supabase edge function URL.
 */
export function sitemapPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "flowa-sitemap-generator",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir || "dist";
    },
    async closeBundle() {
      console.log("[sitemap] generating sitemap.xml...");
      const posts = await fetchDbPosts();
      const xml = buildXml(posts);
      const target = resolve(process.cwd(), outDir, "sitemap.xml");
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, xml, "utf-8");
      console.log(
        `[sitemap] wrote ${target} (${STATIC_URLS.length} static + ${LEGACY_BLOG_SLUGS.length} legacy + ${posts.length} db posts)`,
      );
    },
  };
}
