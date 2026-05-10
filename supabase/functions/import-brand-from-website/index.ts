// import-brand-from-website
// Scrapes a website (homepage + optional sub-pages) via Firecrawl,
// then asks the AI to extract a structured brand suggestion blob.
//
// Auth: standard JWT.
// Body: { url, extra_paths?, organization_id?, locale?, stream? }
// If stream=true → SSE event stream (progress + result/error).

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { extractBrandSuggestions } from "../_shared/brand-extractor.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createBrandImportSSE } from "../_shared/brand-import-stream.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface FirecrawlScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: any;
  links?: string[];
  error?: string;
}

async function firecrawlScrape(url: string, formats: string[] = ["markdown"]): Promise<FirecrawlScrapeResult> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { success: false, error: "FIRECRAWL_API_KEY not configured" };

  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats, onlyMainContent: !formats.includes("rawHtml"), waitFor: 1500 }),
    });
    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data?.error || `HTTP ${resp.status}` };
    const payload = data.data ?? data;
    return {
      success: true,
      markdown: payload?.markdown,
      html: payload?.html ?? payload?.rawHtml,
      metadata: payload?.metadata,
      links: payload?.links,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "scrape failed" };
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function normalizeHex(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  // #rgb → expand
  const short = s.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const long = s.match(/^#?([0-9a-f]{6})$/);
  if (long) return `#${long[1]}`;
  // rgb(r,g,b)
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    const r = Math.min(255, parseInt(rgb[1])), g = Math.min(255, parseInt(rgb[2])), b = Math.min(255, parseInt(rgb[3]));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return null;
}

interface LogoCandidate { url: string; source: string; score: number }
interface VisualSignals {
  logo_url: string | null;
  logo_candidates: LogoCandidate[];
  theme_color: string | null;
}

function parseJsonLdBlocks(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === "object") {
        if (Array.isArray((parsed as any)["@graph"])) out.push(...(parsed as any)["@graph"]);
        else out.push(parsed);
      }
    } catch { /* ignore malformed */ }
  }
  return out;
}

const TRACKING_URL_PATTERNS = /(1x1|pixel|tracking|gtag|gtm|googletagmanager|facebook\.com\/tr|google-analytics)/i;

function scoreLogo(url: string, source: string, ctx: { alt?: string; cls?: string; inHeader?: boolean }): number {
  let s = 0;
  if (source === "json-ld:logo") s += 50;
  if (source === "img.logo") s += 20;
  if (source === "header.img") s += 25;
  if (source === "apple-touch-icon") s += 15;
  if (source === "og:image") s += 10;
  if (source === "twitter:image") s += 8;
  if (source === "favicon") s += 5;
  if (source === "favicon-default") s += 3;
  if (source === "fanpage:avatar") s += 30;
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) s += 30;
  if (/logo/i.test(url)) s += 15;
  if (ctx.alt && /logo/i.test(ctx.alt)) s += 10;
  if (ctx.cls && /logo|brand|navbar|nav-/i.test(ctx.cls)) s += 10;
  if (ctx.inHeader) s += 8;
  if (/og[-_]?image|banner|cover|hero/i.test(url)) s -= 8;
  return s;
}

function extractVisualSignals(html: string | undefined, baseUrl: string): VisualSignals {
  const out: VisualSignals = { logo_url: null, logo_candidates: [], theme_color: null };
  if (!html) return out;

  const raw: LogoCandidate[] = [];
  const push = (href: string | undefined | null, source: string, ctx: { alt?: string; cls?: string; inHeader?: boolean } = {}) => {
    if (!href) return;
    const abs = resolveUrl(href, baseUrl);
    if (!abs) return;
    if (TRACKING_URL_PATTERNS.test(abs)) return;
    raw.push({ url: abs, source, score: scoreLogo(abs, source, ctx) });
  };

  // JSON-LD Organization.logo (highest priority)
  const ldBlocks = parseJsonLdBlocks(html);
  for (const node of ldBlocks) {
    const types = ([] as string[]).concat(node?.["@type"] || []).map(String);
    if (!types.some((t) => /Organization|LocalBusiness|WebSite/i.test(t))) continue;
    const logo = typeof node.logo === "string" ? node.logo : node.logo?.url;
    if (logo) push(logo, "json-ld:logo");
  }

  const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  push(apple?.[1], "apple-touch-icon");

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  push(ogImage?.[1], "og:image");

  const twImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  push(twImage?.[1], "twitter:image");

  // <header> img → likely site logo
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch) {
    for (const m of headerMatch[0].matchAll(/<img[^>]+>/gi)) {
      const tag = m[0];
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
      const cls = tag.match(/class=["']([^"']*)["']/i)?.[1];
      push(src, "header.img", { alt, cls, inHeader: true });
    }
  }

  // <img> với class/alt/id chứa "logo"
  const imgLogoRegex = /<img[^>]*>/gi;
  for (const m of html.matchAll(imgLogoRegex)) {
    const tag = m[0];
    if (!/(?:class|alt|id)=["'][^"']*logo[^"']*["']/i.test(tag)) continue;
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1];
    const cls = tag.match(/class=["']([^"']*)["']/i)?.[1];
    push(src, "img.logo", { alt, cls });
  }

  const iconRegex = /<link[^>]+rel=["'][^"']*(?:shortcut\s+)?icon[^"']*["'][^>]*>/gi;
  for (const m of html.matchAll(iconRegex)) {
    const tag = m[0];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    const sizes = tag.match(/sizes=["']([^"']+)["']/i)?.[1];
    // Skip very small favicons
    if (sizes && /^(?:16x16|32x32)$/i.test(sizes.trim())) {
      // still push but lower score handled by source
    }
    push(href, "favicon");
  }
  push("/favicon.ico", "favicon-default");

  // Dedupe by url, keep highest score
  const byUrl = new Map<string, LogoCandidate>();
  for (const c of raw) {
    const prev = byUrl.get(c.url);
    if (!prev || c.score > prev.score) byUrl.set(c.url, c);
  }
  out.logo_candidates = [...byUrl.values()].sort((a, b) => b.score - a.score);
  out.logo_url = out.logo_candidates[0]?.url || null;

  // === Theme color ===
  const tc = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
  if (tc) out.theme_color = normalizeHex(tc[1]);

  if (!out.theme_color) {
    const tile = html.match(/<meta[^>]+name=["']msapplication-TileColor["'][^>]+content=["']([^"']+)["']/i);
    if (tile) out.theme_color = normalizeHex(tile[1]);
  }

  if (!out.theme_color) {
    // CSS variables --primary / --brand / --accent in inline <style>
    const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
    const cssVar = styleBlocks.match(/--(?:primary|brand|brand-color|accent)\s*:\s*([^;}\n]+)/i);
    if (cssVar) out.theme_color = normalizeHex(cssVar[1].trim());
  }

  return out;
}

// ============================================================
// Subpage auto-discovery (About / Contact / Service)
// ============================================================
const SUBPAGE_KEYWORDS = [
  "about", "gioi-thieu", "gioi_thieu", "ve-chung-toi", "ve-chung-toi",
  "contact", "lien-he", "lienhe", "lien_he",
  "service", "services", "dich-vu", "dichvu", "san-pham", "sanpham", "product", "products",
];

function discoverSubpages(html: string | undefined, baseUrl: string, max = 3): string[] {
  if (!html) return [];
  const baseOrigin = (() => { try { return new URL(baseUrl).origin; } catch { return ""; } })();
  if (!baseOrigin) return [];

  // Restrict scan to header + nav blocks (where primary navigation lives)
  const navBlocks: string[] = [];
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch) navBlocks.push(headerMatch[0]);
  for (const m of html.matchAll(/<nav[\s\S]*?<\/nav>/gi)) navBlocks.push(m[0]);
  // Fallback: top 30% of body
  if (navBlocks.length === 0) {
    const body = html.match(/<body[\s\S]*?<\/body>/i)?.[0] || html;
    navBlocks.push(body.slice(0, Math.floor(body.length * 0.3)));
  }
  const scope = navBlocks.join("\n");

  const found = new Map<string, { url: string; rank: number }>();
  for (const m of scope.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    const linkText = stripHtml(m[2] || "").toLowerCase();
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const abs = resolveUrl(href, baseUrl);
    if (!abs) continue;
    let urlObj: URL;
    try { urlObj = new URL(abs); } catch { continue; }
    if (urlObj.origin !== baseOrigin) continue; // same-origin only
    const path = urlObj.pathname.toLowerCase();
    if (path === "/" || path === "") continue;

    // Match keyword in path or link text
    const haystack = `${path} ${linkText}`;
    let rank = -1;
    for (let i = 0; i < SUBPAGE_KEYWORDS.length; i++) {
      if (haystack.includes(SUBPAGE_KEYWORDS[i])) { rank = i; break; }
    }
    if (rank === -1) continue;

    // Strip query/hash to dedupe variants
    const clean = `${urlObj.origin}${urlObj.pathname}`;
    const prev = found.get(clean);
    if (!prev || rank < prev.rank) found.set(clean, { url: clean, rank });
  }

  return [...found.values()]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max)
    .map((x) => x.url);
}

// ============================================================
// Color palette extraction (primary / secondary / accent)
// ============================================================
export interface ColorPalette {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
  source: "css-vars" | "meta" | "frequency" | "mixed" | "none";
  candidates: string[];
}

function isNeutralColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return true;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  // Filter near-grayscale (low saturation) and near white/black
  if (max - min < 25) return true;
  if (max < 30) return true;       // near black
  if (min > 235) return true;      // near white
  return false;
}

function extractColorPalette(html: string | undefined): ColorPalette {
  const out: ColorPalette = { primary: null, secondary: null, accent: null, source: "none", candidates: [] };
  if (!html) return out;

  const sources: Array<{ source: string; hex: string }> = [];

  // 1) CSS custom properties in inline <style> blocks
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const cssVarRe = /--(?:primary|brand|brand-color|brand-\w+|accent|accent-\w+|secondary|color-primary|color-brand|color-accent)\s*:\s*([^;}\n]+)/gi;
  for (const m of styleBlocks.matchAll(cssVarRe)) {
    const hex = normalizeHex(m[1].trim());
    if (hex) sources.push({ source: "css-vars", hex });
  }

  // 2) <meta name="theme-color"> + msapplication-TileColor
  const tc = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
  if (tc) {
    const hex = normalizeHex(tc[1]);
    if (hex) sources.push({ source: "meta", hex });
  }
  const tile = html.match(/<meta[^>]+name=["']msapplication-TileColor["'][^>]+content=["']([^"']+)["']/i);
  if (tile) {
    const hex = normalizeHex(tile[1]);
    if (hex) sources.push({ source: "meta", hex });
  }

  // 3) Frequency of inline style="...color/background..." hex values
  const freq = new Map<string, number>();
  const inlineStyleRe = /style=["']([^"']+)["']/gi;
  for (const m of html.matchAll(inlineStyleRe)) {
    const decl = m[1];
    for (const c of decl.matchAll(/#[0-9a-f]{3,6}\b/gi)) {
      const hex = normalizeHex(c[0]);
      if (!hex) continue;
      freq.set(hex, (freq.get(hex) || 0) + 1);
    }
    for (const c of decl.matchAll(/rgba?\([^)]+\)/gi)) {
      const hex = normalizeHex(c[0]);
      if (!hex) continue;
      freq.set(hex, (freq.get(hex) || 0) + 1);
    }
  }
  const topFreq = [...freq.entries()]
    .filter(([hex]) => !isNeutralColor(hex))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([hex]) => hex);

  // Build deduped candidate list, preserving priority order: css-vars → meta → frequency
  const seen = new Set<string>();
  const candidates: string[] = [];
  const sourceTags = new Set<string>();
  for (const { source, hex } of sources) {
    if (isNeutralColor(hex)) continue;
    if (seen.has(hex)) continue;
    seen.add(hex);
    candidates.push(hex);
    sourceTags.add(source);
  }
  for (const hex of topFreq) {
    if (seen.has(hex)) continue;
    seen.add(hex);
    candidates.push(hex);
    sourceTags.add("frequency");
  }

  if (candidates.length === 0) return out;

  out.candidates = candidates.slice(0, 6);
  out.primary = out.candidates[0] || null;
  out.secondary = out.candidates[1] || null;
  out.accent = out.candidates[2] || null;
  out.source = sourceTags.size > 1 ? "mixed" : (sourceTags.values().next().value as ColorPalette["source"]) || "none";
  return out;
}

// ============================================================
// Footer / contact extraction
// ============================================================
export interface FooterInfo {
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_code: string | null;
  social_links: Record<string, string>;
}

const SOCIAL_DOMAIN_MAP: Array<{ key: string; re: RegExp }> = [
  { key: "facebook", re: /(?:^|\.)facebook\.com$/i },
  { key: "instagram", re: /(?:^|\.)instagram\.com$/i },
  { key: "youtube", re: /(?:^|\.)(?:youtube\.com|youtu\.be)$/i },
  { key: "tiktok", re: /(?:^|\.)tiktok\.com$/i },
  { key: "linkedin", re: /(?:^|\.)linkedin\.com$/i },
  { key: "twitter", re: /(?:^|\.)(?:twitter\.com|x\.com)$/i },
  { key: "threads", re: /(?:^|\.)threads\.net$/i },
  { key: "zalo", re: /(?:^|\.)(?:zalo\.me|zalo\.vn|zalo\.com)$/i },
  { key: "pinterest", re: /(?:^|\.)pinterest\.com$/i },
  { key: "telegram", re: /(?:^|\.)t\.me$/i },
];

const SOCIAL_NEGATIVE = /\/(?:sharer|share|intent|dialog|plugins|tr\?|v\d+\/dialog)/i;

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFooterSignals(html: string | undefined, baseUrl: string): FooterInfo {
  const out: FooterInfo = {
    company_name: null, address: null, phone: null, email: null,
    website: null, tax_code: null, social_links: {},
  };
  if (!html) return out;

  let footerHtml = "";
  const footers = [...html.matchAll(/<footer[\s\S]*?<\/footer>/gi)];
  if (footers.length) footerHtml = footers[footers.length - 1][0];
  if (!footerHtml) {
    const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i)?.[0] || html;
    footerHtml = bodyMatch.slice(Math.floor(bodyMatch.length * 0.7));
  }
  const footerText = stripHtml(footerHtml);

  const mailto = footerHtml.match(/href=["']mailto:([^"'?]+)/i)?.[1]
    || html.match(/href=["']mailto:([^"'?]+)/i)?.[1];
  if (mailto) out.email = mailto.trim().toLowerCase();
  if (!out.email) {
    const m = footerText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (m) out.email = m[0].toLowerCase();
  }

  const tel = footerHtml.match(/href=["']tel:([^"']+)/i)?.[1]
    || html.match(/href=["']tel:([^"']+)/i)?.[1];
  if (tel) out.phone = tel.replace(/[^\d+]/g, "").trim();
  if (!out.phone) {
    const m = footerText.match(/(?:\+?84|0)(?:[\s.-]?\d){8,10}/);
    if (m) out.phone = m[0].replace(/[\s.-]/g, "");
  }

  const tax = footerText.match(/(?:MST|Mã\s*số\s*thuế|Tax\s*code|Tax\s*ID)\s*[:\-]?\s*([0-9]{10}(?:-[0-9]{3})?)/i);
  if (tax) out.tax_code = tax[1];

  const addrKw = footerText.match(/(?:Địa\s*chỉ|Address|Trụ\s*sở|Văn\s*phòng|VP\s*chính|Head\s*office)\s*[:\-]?\s*([^|•\n]{10,200}?)(?=\s*(?:Điện\s*thoại|Hotline|Tel|Phone|Email|MST|©|$))/i);
  if (addrKw) out.address = addrKw[1].trim().replace(/\s+/g, " ").slice(0, 200);
  if (!out.address) {
    const itemprop = footerHtml.match(/itemprop=["']address["'][^>]*>([\s\S]*?)<\//i);
    if (itemprop) {
      const t = stripHtml(itemprop[1]);
      if (t.length > 10) out.address = t.slice(0, 200);
    }
  }

  const co = footerText.match(/((?:Công\s*ty|Co\.,?\s*Ltd\.?|JSC|Corporation|Inc\.|LLC|GmbH)[^\n|•©]{3,80})/i);
  if (co) out.company_name = co[1].trim().replace(/\s+/g, " ").slice(0, 120);

  // Social links — scan whole HTML
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (SOCIAL_NEGATIVE.test(href)) continue;
    const abs = resolveUrl(href, baseUrl);
    if (!abs) continue;
    let host = "";
    try { host = new URL(abs).hostname.toLowerCase(); } catch { continue; }
    for (const { key, re } of SOCIAL_DOMAIN_MAP) {
      if (re.test(host) && !out.social_links[key]) {
        out.social_links[key] = abs;
        break;
      }
    }
  }

  // JSON-LD Organization → higher priority overrides
  for (const node of parseJsonLdBlocks(html)) {
    const types = ([] as string[]).concat(node?.["@type"] || []).map(String);
    if (!types.some((t) => /Organization|LocalBusiness/i.test(t))) continue;
    if (typeof node.name === "string" && !out.company_name) out.company_name = node.name.slice(0, 120);
    if (typeof node.telephone === "string" && !out.phone) out.phone = node.telephone.replace(/[^\d+]/g, "");
    if (typeof node.email === "string" && !out.email) out.email = node.email.toLowerCase();
    if (node.address) {
      const a = node.address;
      const parts = typeof a === "string" ? [a]
        : [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean);
      const joined = parts.join(", ").trim();
      if (joined && (!out.address || joined.length > out.address.length)) out.address = joined.slice(0, 200);
    }
    const sameAs = ([] as string[]).concat(node.sameAs || []);
    for (const url of sameAs) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        for (const { key, re } of SOCIAL_DOMAIN_MAP) {
          if (re.test(host) && !out.social_links[key]) out.social_links[key] = url;
        }
      } catch { /* ignore */ }
    }
  }

  try { out.website = new URL(baseUrl).origin; } catch { /* ignore */ }
  return out;
}

function mergeFooter(regex: FooterInfo, ai: any | null | undefined): FooterInfo {
  const a = ai && typeof ai === "object" ? ai : {};
  const trim = (v: any, max = 200) => typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  return {
    phone: regex.phone || trim(a.phone, 40),
    email: regex.email || trim(a.email, 120),
    tax_code: regex.tax_code || trim(a.tax_code, 40),
    company_name: trim(a.company_name, 120) || regex.company_name,
    address: trim(a.address, 200) || regex.address,
    website: regex.website || trim(a.website, 200),
    social_links: regex.social_links,
  };
}

function normalizeUrl(raw: string): string | null {
  try {
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    const u = new URL(s);
    return u.toString();
  } catch {
    return null;
  }
}

interface RunInput {
  targetUrl: string;
  extraPaths: string[];
  organizationId?: string;
  locale: string;
  userId: string;
}

async function runImport(
  input: RunInput,
  emit?: (event: string, data: Record<string, unknown>) => Promise<void>,
): Promise<{ status: number; body: any }> {
  const { targetUrl, extraPaths, organizationId, locale } = input;

  await emit?.("progress", {
    step: "scrape_home",
    percent: 10,
    message: `Đang đọc trang chủ ${new URL(targetUrl).hostname}`,
  });

  const home = await firecrawlScrape(targetUrl, ["markdown", "rawHtml"]);
  if (!home.success) {
    return { status: 502, body: { error: `Không scrape được trang chủ: ${home.error}` } };
  }
  await emit?.("subpage_done", { url: targetUrl, success: true, kind: "home" });

  await emit?.("progress", {
    step: "extract_visuals",
    percent: 20,
    message: "Đang trích xuất logo & màu chủ đạo",
  });
  const visuals = extractVisualSignals(home.html, targetUrl);
  const palette = extractColorPalette(home.html);
  const footerRegex = extractFooterSignals(home.html, targetUrl);

  // Auto-discover subpages from header/nav (cap 3) and merge with client-supplied paths
  const autoDiscovered = discoverSubpages(home.html, targetUrl, 3);
  const mergedPathSet = new Set<string>();
  const mergedPaths: string[] = [];
  for (const p of [...extraPaths, ...autoDiscovered]) {
    const abs = normalizeUrl(p.startsWith("http") ? p : (() => { try { return new URL(p, targetUrl).toString(); } catch { return p; } })());
    if (!abs) continue;
    if (mergedPathSet.has(abs)) continue;
    mergedPathSet.add(abs);
    mergedPaths.push(abs);
    if (mergedPaths.length >= 4) break;
  }

  if (autoDiscovered.length > 0) {
    await emit?.("progress", {
      step: "discover_subpages",
      percent: 22,
      message: `Tự động tìm thấy ${autoDiscovered.length} trang phụ liên quan`,
    });
  }

  if (mergedPaths.length > 0) {
    await emit?.("progress", {
      step: "scrape_subpages",
      percent: 25,
      message: `Đang đọc ${mergedPaths.length} trang phụ (about, giới thiệu, dịch vụ)`,
    });
  }

  const subMarkdowns: string[] = [];
  await Promise.all(
    mergedPaths.map(async (sub) => {
      const r = await firecrawlScrape(sub, ["markdown"]);
      if (r.success && r.markdown) {
        subMarkdowns.push(r.markdown.slice(0, 4000));
        await emit?.("subpage_done", { url: sub, success: true });
      } else {
        await emit?.("subpage_done", { url: sub, success: false, error: r.error });
      }
    }),
  );

  const meta = home.metadata || {};
  const combinedContent = [
    `# Page title: ${meta.title || ""}`,
    meta.description ? `# Meta description: ${meta.description}` : "",
    meta.ogSiteName ? `# Site name: ${meta.ogSiteName}` : "",
    "",
    "## Homepage",
    home.markdown || "",
    ...subMarkdowns.map((m, i) => `\n## Sub page ${i + 1}\n${m}`),
  ].filter(Boolean).join("\n");

  await emit?.("progress", {
    step: "ai_analyzing",
    percent: 50,
    message: "AI đang phân tích nội dung",
  });

  const extracted = await extractBrandSuggestions({
    source: "website",
    content: combinedContent,
    locale,
    organizationId,
    hint: new URL(targetUrl).hostname,
    onProgress: emit
      ? (e) => {
          const { type, ...rest } = e as any;
          emit(type, rest).catch(() => {});
        }
      : undefined,
  });

  if (!extracted.success) {
    const isQuota = extracted.error === "AI_QUOTA_EXHAUSTED";
    return {
      status: isQuota ? 402 : 502,
      body: {
        error: isQuota
          ? "Đã hết credit AI. Vui lòng nạp thêm để tiếp tục."
          : (extracted.error || "AI extraction failed"),
        code: extracted.error,
      },
    };
  }

  await emit?.("progress", { step: "parsing", percent: 90, message: "Đang chuẩn hoá kết quả" });

  const mergedFooter = mergeFooter(footerRegex, (extracted.suggestion as any)?.footer_info);

  return {
    status: 200,
    body: {
      success: true,
      suggestion: extracted.suggestion,
      raw_meta: {
        source_url: targetUrl,
        page_title: meta.title || null,
        og_image: meta.ogImage || meta.image || null,
        favicon: meta.favicon || null,
        logo_url: visuals.logo_url || meta.ogImage || meta.image || meta.favicon || null,
        logo_candidates: (() => {
          const merged = [...visuals.logo_candidates];
          const seen = new Set(merged.map((c) => c.url));
          for (const [u, src] of [
            [meta.ogImage, "meta:og_image"],
            [meta.image, "meta:image"],
            [meta.favicon, "meta:favicon"],
          ] as const) {
            if (u && !seen.has(u)) { merged.push({ url: u, source: src, score: 0 }); seen.add(u); }
          }
          return merged;
        })(),
        theme_color: visuals.theme_color || palette.primary,
        color_palette: palette,
        footer_info: mergedFooter,
        discovered_subpages: autoDiscovered,
        scraped_pages: 1 + subMarkdowns.length,
      },
    },
  };
}

Deno.serve(withPerf({ functionName: "import-brand-from-website" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawUrl: string | undefined = body?.url;
    const extraPaths: string[] = Array.isArray(body?.extra_paths) ? body.extra_paths.slice(0, 4) : [];
    const organizationId: string | undefined = body?.organization_id;
    const locale: string = body?.locale || "vi";
    const wantStream = body?.stream === true;

    const targetUrl = rawUrl ? normalizeUrl(rawUrl) : null;
    if (!targetUrl) return json({ error: "URL không hợp lệ" }, 400);

    const [orchCfg, extrCfg] = await Promise.all([
      getAIConfig("import-brand-from-website", organizationId).catch(() => null),
      getAIConfig("import-brand-extractor", organizationId).catch(() => null),
    ]);
    if (orchCfg?.is_enabled === false || extrCfg?.is_enabled === false) {
      return json({ error: "Tính năng Import Brand đang tạm ngưng (Admin)", code: "FEATURE_DISABLED" }, 503);
    }

    console.log(`[import-brand-from-website] user=${user.id} url=${targetUrl} extras=${extraPaths.length} stream=${wantStream}`);

    const runInput: RunInput = { targetUrl, extraPaths, organizationId, locale, userId: user.id };

    if (!wantStream) {
      const { status, body: out } = await runImport(runInput);
      return json(out, status);
    }

    // Streaming branch
    const sse = createBrandImportSSE();
    const work = (async () => {
      try {
        await sse.emit("progress", { step: "init", percent: 5, message: "Khởi tạo..." });
        const { status, body: out } = await runImport(runInput, sse.emit);
        if (status >= 400) {
          await sse.emit("error", { message: out.error, code: out.code, status });
        } else {
          await sse.emit("result", { ...out, percent: 100 });
        }
      } catch (e) {
        console.error("[import-brand-from-website] stream error:", e);
        await sse.emit("error", { message: e instanceof Error ? e.message : "Internal error" });
      } finally {
        await sse.close();
      }
    })();
    // @ts-ignore EdgeRuntime exists in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
    return sse.response;
  } catch (e) {
    console.error("[import-brand-from-website] error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
}));
