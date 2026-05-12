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
  "san-pham", "sanpham", "product", "products",
  "dich-vu", "dichvu", "service", "services",
  "shop", "store", "collection", "collections", "course", "courses", "khoa-hoc",
  "about", "gioi-thieu", "gioi_thieu", "ve-chung-toi",
  "contact", "lien-he", "lienhe", "lien_he",
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
  source: "logo" | "css-vars" | "meta" | "frequency" | "ai" | "mixed" | "none";
  confidence: "high" | "medium" | "low";
  candidates: string[];
}

function isNeutralColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return true;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  // Filter near-grayscale (low saturation) and near white/black
  // Tighten thresholds: dark UI colors (#1a1a1a, #222, #333) đều coi là neutral
  // để tránh chọn nhầm màu nền/text làm brand color.
  if (max - min < 35) return true;
  if (max < 60) return true;       // near black (incl. #1a1a1a, #2a2a2a, #333…)
  if (min > 230) return true;      // near white
  return false;
}

function extractColorPalette(html: string | undefined): ColorPalette {
  const out: ColorPalette = { primary: null, secondary: null, accent: null, source: "none", confidence: "low", candidates: [] };
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
  // Confidence: css-vars/meta = high, mixed = medium, frequency-only = low
  if (out.source === "css-vars" || out.source === "meta") out.confidence = "high";
  else if (out.source === "mixed") out.confidence = "medium";
  else out.confidence = "low";
  return out;
}

// ============================================================
// Logo-based color extraction (highest signal)
// ============================================================
async function extractColorFromLogo(logoUrl: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(logoUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isSvg = ct.includes("svg") || logoUrl.toLowerCase().endsWith(".svg");

    if (isSvg) {
      const text = await res.text();
      if (text.length > 800_000) return null;
      const freq = new Map<string, number>();
      const bump = (raw: string) => {
        const hex = normalizeHex(raw);
        if (!hex || isNeutralColor(hex)) return;
        freq.set(hex, (freq.get(hex) || 0) + 1);
      };
      // fill="#xxx", stroke="#xxx", stop-color="#xxx"
      for (const m of text.matchAll(/(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi)) bump(m[1]);
      // style="fill:#xxx;..."
      for (const m of text.matchAll(/(?:fill|stroke|stop-color)\s*:\s*([^;"'}\s]+)/gi)) bump(m[1]);
      const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : null;
    }

    // Raster (PNG/JPG/WebP): try deterministic pixel sampling FIRST (no API cost), then AI fallback.
    const buf = new Uint8Array(await res.arrayBuffer());
    const pixelColor = await extractDominantColorFromRaster(buf).catch((e) => {
      console.warn("[extractColorFromLogo] pixel decode failed:", (e as Error).message);
      return null;
    });
    if (pixelColor) return pixelColor;

    // Fallback: ask Lovable AI vision (small + cheap) to read dominant brand color
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return null;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Đây là logo brand. Trả về MÀU CHỦ ĐẠO duy nhất dạng hex 7-ký-tự (vd #1a73e8). KHÔNG giải thích. Bỏ qua trắng/đen/xám. Nếu logo monochrome đen/trắng → trả 'null'." },
              { type: "image_url", image_url: { url: logoUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!aiRes.ok) return null;
    const data = await aiRes.json();
    const text: string = data?.choices?.[0]?.message?.content || "";
    const m = text.match(/#?[0-9a-f]{6}\b/i);
    return m ? normalizeHex(m[0]) : null;
  } catch (e) {
    console.warn("[extractColorFromLogo] failed:", (e as Error).message);
    return null;
  }
}

// Deterministic pixel-based dominant color extraction for PNG/JPEG.
// Uses imagescript (pure-TS Deno-friendly). Bucketizes pixels at 16-step
// granularity and ignores near-white/black/grayscale neutrals.
async function extractDominantColorFromRaster(buf: Uint8Array): Promise<string | null> {
  if (buf.byteLength === 0 || buf.byteLength > 4_000_000) return null;
  let mod: any;
  try {
    mod = await import("https://deno.land/x/imagescript@1.2.17/mod.ts");
  } catch (e) {
    console.warn("[extractDominantColorFromRaster] import failed:", (e as Error).message);
    return null;
  }
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  let img: any;
  try {
    if (isPng) img = await mod.Image.decode(buf);
    else if (isJpg) img = await mod.Image.decode(buf);
    else img = await mod.decode(buf); // webp/other
  } catch (e) {
    console.warn("[extractDominantColorFromRaster] decode failed:", (e as Error).message);
    return null;
  }
  if (!img || !img.width || !img.height) return null;

  // Downsample for speed: cap at ~200px
  const maxDim = 200;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale < 1) {
    try { img = img.resize(Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale))); } catch { /* ignore */ }
  }

  const freq = new Map<string, number>();
  const w = img.width, h = img.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = img.getPixelAt(x + 1, y + 1); // imagescript is 1-indexed
      const r = (px >>> 24) & 0xff;
      const g = (px >>> 16) & 0xff;
      const b = (px >>> 8) & 0xff;
      const a = px & 0xff;
      if (a < 128) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (min > 230) continue;        // near white
      if (max < 60) continue;         // near black
      if (max - min < 35) continue;   // gray
      const rq = Math.min(255, Math.round(r / 16) * 16);
      const gq = Math.min(255, Math.round(g / 16) * 16);
      const bq = Math.min(255, Math.round(b / 16) * 16);
      const key = `${rq.toString(16).padStart(2, "0")}${gq.toString(16).padStart(2, "0")}${bq.toString(16).padStart(2, "0")}`;
      freq.set(key, (freq.get(key) || 0) + 1);
    }
  }
  if (freq.size === 0) return null;
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  return `#${top[0]}`;
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

// ============================================================
// Product/Service extraction (re-uses scraped content, no re-scrape)
// ============================================================
interface ProductSuggestion {
  name: string;
  category?: string;
  description?: string;
  price_display?: string;
  image_url?: string;
  unique_selling_points?: string[];
  keywords?: string[];
  source_url?: string;
  source?: "jsonld" | "opengraph" | "microdata" | "html" | "html-card" | "ai" | "markdown" | "enriched";
}

// ============================================================
// Layer 1 — Structured product extraction (JSON-LD / OG / microdata / HTML cards)
// Free, deterministic, runs before AI; treated as ground truth.
// ============================================================
function slugifyName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const PRODUCT_PATH_RE = /\/(?:product|products|san-pham|sanpham|dich-vu|dichvu|service|services|shop|store|p|item|collection|collections|course|courses|khoa-hoc)\//i;
// Block category-root URLs like "/products/" or "/san-pham/" with no slug
const PRODUCT_PATH_LEAF_RE = /\/(?:product|products|san-pham|sanpham|dich-vu|dichvu|service|services|shop|store|p|item|collection|collections|course|courses|khoa-hoc)\/[^\/?#]+/i;
const PRICE_RE = /(?:[\d.,]+\s*(?:đ|vnd|₫|usd|\$|€|£))|(?:(?:giá|price)[:\s]+[\d.,]+)/i;
// VN-friendly price patterns: "500k", "2tr5", "1.5 triệu", "Liên hệ", "contact for price"
const PRICE_RE_VN = /(?:[\d.,]+\s*(?:k|tr|triệu|nghìn|ng|m|million)\b)|(?:liên\s*hệ)|(?:contact\s*for\s*price)|(?:call\s*for\s*price)/i;
const PRICE_ANY_RE = new RegExp(`(?:${PRICE_RE.source})|(?:${PRICE_RE_VN.source})`, "i");

// Common product container class tokens (WooCommerce, Shopify, Sapo, Haravan, NukeViet, generic)
const PRODUCT_CONTAINER_RE = /class=["'][^"']*\b(?:product-item|product-card|product-block|product-tile|product-loop|product-thumb|woocommerce-loop-product|grid__item|item-product|sapo-product|haravan-product|nv-product|productitem|product-grid-item|card-product|product-list-item|product--card)\b[^"']*["']/i;

function extractImgFromBlock(block: string): string | undefined {
  return block.match(/<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/i)?.[1]
    || block.match(/<img[^>]+srcset=["']([^"',\s]+)/i)?.[1]
    || block.match(/background-image\s*:\s*url\(["']?([^"')]+)/i)?.[1];
}

function extractStructuredProducts(html: string | undefined, baseUrl: string): ProductSuggestion[] {
  if (!html) return [];
  const out: ProductSuggestion[] = [];
  const seen = new Set<string>();
  const push = (p: ProductSuggestion) => {
    const name = (p.name || "").trim();
    if (!name || name.length < 2 || name.length > 200) return;
    const key = slugifyName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ ...p, name });
  };

  // 1. JSON-LD Product / Service / ItemList / Offer
  const walkLd = (node: any) => {
    if (!node || typeof node !== "object") return;
    const types = ([] as string[]).concat(node["@type"] || []).map(String);
    const isProductLike = types.some((t) => /^(Product|Service|IndividualProduct|ProductModel|Offer)$/i.test(t));
    if (isProductLike && typeof node.name === "string") {
      const offer = node.offers && (Array.isArray(node.offers) ? node.offers[0] : node.offers);
      const price = offer?.price ?? offer?.priceSpecification?.price;
      const currency = offer?.priceCurrency ?? offer?.priceSpecification?.priceCurrency;
      let priceDisplay: string | undefined;
      if (price) priceDisplay = currency ? `${price} ${currency}` : String(price);
      const imgRaw = node.image;
      const imgUrl = Array.isArray(imgRaw) ? imgRaw[0] : (typeof imgRaw === "string" ? imgRaw : (imgRaw?.url));
      const urlRaw = node.url || node["@id"] || offer?.url;
      push({
        name: node.name,
        description: typeof node.description === "string" ? node.description.slice(0, 400) : undefined,
        price_display: priceDisplay,
        image_url: typeof imgUrl === "string" ? resolveUrl(imgUrl, baseUrl) || imgUrl : undefined,
        source_url: typeof urlRaw === "string" ? resolveUrl(urlRaw, baseUrl) || urlRaw : undefined,
        category: types.find(t => /Service/i.test(t)) ? "service" : "product",
        source: "jsonld",
      });
    }
    // ItemList → walk itemListElement
    if (types.some(t => /ItemList|OfferCatalog/i.test(t))) {
      const items = ([] as any[]).concat(node.itemListElement || node.itemListElements || []);
      for (const it of items) walkLd(it?.item || it);
    }
  };
  for (const node of parseJsonLdBlocks(html)) walkLd(node);

  // 2. OpenGraph product
  const ogType = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (ogType && /product/i.test(ogType)) {
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const priceAmt = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const priceCur = html.match(/<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (ogTitle) {
      push({
        name: ogTitle,
        description: ogDesc,
        price_display: priceAmt ? (priceCur ? `${priceAmt} ${priceCur}` : priceAmt) : undefined,
        image_url: ogImg ? resolveUrl(ogImg, baseUrl) || ogImg : undefined,
        source_url: baseUrl,
        category: "product",
        source: "opengraph",
      });
    }
  }

  // 3. Microdata schema.org/Product
  const mdRe = /itemtype=["']https?:\/\/schema\.org\/(?:Product|Service)["'][^>]*>([\s\S]{0,2500}?)(?=<[^>]+itemtype=|<\/(?:article|section|li|div)>)/gi;
  for (const m of html.matchAll(mdRe)) {
    const block = m[1];
    const name = block.match(/itemprop=["']name["'][^>]*>([^<]+)</i)?.[1]?.trim()
      || block.match(/itemprop=["']name["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    const desc = block.match(/itemprop=["']description["'][^>]*>([^<]+)</i)?.[1]?.trim();
    const price = block.match(/itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || block.match(/itemprop=["']price["'][^>]*>([^<]+)</i)?.[1];
    const img = block.match(/itemprop=["']image["'][^>]+(?:src|content)=["']([^"']+)["']/i)?.[1];
    push({
      name,
      description: desc?.slice(0, 400),
      price_display: price?.trim(),
      image_url: img ? resolveUrl(img, baseUrl) || img : undefined,
      source_url: baseUrl,
      category: "product",
      source: "microdata",
    });
  }

  // 4a. HTML product cards: anchors with product-like leaf path + img inside
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] || html;
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,2000}?)<\/a>/gi;
  for (const m of body.matchAll(anchorRe)) {
    if (out.length >= 40) break;
    const href = m[1];
    const inner = m[2];
    if (!PRODUCT_PATH_LEAF_RE.test(href)) continue;
    if (!/<img/i.test(inner)) continue;
    const abs = resolveUrl(href, baseUrl);
    if (!abs) continue;
    const titleAttr = inner.match(/<img[^>]+alt=["']([^"']+)["']/i)?.[1]
      || inner.match(/<(?:h[1-6]|span|div)[^>]*>([^<]{3,150})</i)?.[1];
    const text = stripHtml(inner).replace(/\s+/g, " ").trim();
    const name = (titleAttr || text.split(/[•|·]|\s{2,}/)[0] || "").trim().slice(0, 150);
    if (!name || name.length < 3) continue;
    const img = extractImgFromBlock(inner);
    const priceMatch = text.match(PRICE_ANY_RE);
    push({
      name,
      price_display: priceMatch?.[0],
      image_url: img ? resolveUrl(img, baseUrl) || img : undefined,
      source_url: abs,
      category: "product",
      source: "html",
    });
  }

  // 4b. Container-based heuristic: <article|li|div class="product-item|product-card|woocommerce-loop-product|...">
  // Catches cards where <img> is sibling of <a>, or layout uses background-image, or anchor wraps only the title.
  const containerRe = /<(article|li|div|section)\b([^>]*)>([\s\S]{0,3500}?)<\/\1>/gi;
  for (const m of body.matchAll(containerRe)) {
    if (out.length >= 40) break;
    const attrs = m[2] || "";
    if (!PRODUCT_CONTAINER_RE.test(`<x ${attrs}>`)) continue;
    const block = m[3];
    // Find first product-leaf anchor in block
    const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["']/i);
    const href = linkMatch?.[1];
    if (!href || !PRODUCT_PATH_LEAF_RE.test(href)) continue;
    const abs = resolveUrl(href, baseUrl);
    if (!abs) continue;
    // Title: prefer <h1-h6>, then anchor text, then img alt
    const titleH = block.match(/<h[1-6][^>]*>([\s\S]{3,200}?)<\/h[1-6]>/i)?.[1];
    const titleAnchor = block.match(/<a[^>]*>([\s\S]{3,200}?)<\/a>/i)?.[1];
    const titleAlt = block.match(/<img[^>]+alt=["']([^"']{3,200})["']/i)?.[1];
    const rawTitle = titleH || titleAnchor || titleAlt || "";
    const name = stripHtml(rawTitle).replace(/\s+/g, " ").trim().slice(0, 150);
    if (!name || name.length < 3) continue;
    const img = extractImgFromBlock(block);
    const text = stripHtml(block).replace(/\s+/g, " ").trim();
    const priceMatch = text.match(PRICE_ANY_RE);
    push({
      name,
      price_display: priceMatch?.[0],
      image_url: img ? resolveUrl(img, baseUrl) || img : undefined,
      source_url: abs,
      category: "product",
      source: "html-card",
    });
  }

  return out.slice(0, 25);
}

// ============================================================
// Firecrawl map — discover product URLs via sitemap (cheap)
// ============================================================
async function firecrawlMap(url: string, search: string, limit = 30, includeSubdomains = false): Promise<string[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return [];
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, search, limit, includeSubdomains }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const links: any[] = data?.links || data?.data?.links || data?.data || [];
    return links.map((x) => typeof x === "string" ? x : x?.url).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

// Direct sitemap.xml fetch — free, fast, no Firecrawl quota.
async function fetchSitemapUrls(origin: string, paths: string[], timeoutMs = 1500): Promise<{ urls: string[]; sources: string[] }> {
  const urls: string[] = [];
  const sources: string[] = [];
  await Promise.all(paths.map(async (p) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const resp = await fetch(`${origin}${p}`, { signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      if (!resp.ok) return;
      const ct = resp.headers.get("content-type") || "";
      if (!/xml|text/i.test(ct)) return;
      const text = await resp.text();
      const locs = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
      // sitemap_index → recurse 1 level for child sitemaps that look product-related
      if (/<sitemapindex/i.test(text)) {
        const childProductSitemaps = locs.filter(u => /product|san-pham|sanpham|dich-vu|dichvu/i.test(u)).slice(0, 3);
        await Promise.all(childProductSitemaps.map(async (childUrl) => {
          try {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), timeoutMs);
            const r2 = await fetch(childUrl, { signal: ctrl2.signal, redirect: "follow" });
            clearTimeout(t2);
            if (!r2.ok) return;
            const txt2 = await r2.text();
            const locs2 = [...txt2.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
            if (locs2.length > 0) {
              urls.push(...locs2);
              sources.push(`child:${new URL(childUrl).pathname}`);
            }
          } catch { /* ignore */ }
        }));
      } else if (locs.length > 0) {
        urls.push(...locs);
        sources.push(p);
      }
    } catch { /* ignore */ }
  }));
  return { urls: [...new Set(urls)], sources: [...new Set(sources)] };
}

// Enrich a structured product (missing image/desc) by scraping its source_url
async function enrichProductFromUrl(url: string): Promise<{ image_url?: string; description?: string }> {
  try {
    const r = await firecrawlScrape(url, ["rawHtml"]);
    if (!r.success || !r.html) return {};
    const html = r.html;
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const productImg = html.match(/<img[^>]+class=["'][^"']*product[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1]
      || html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*product[^"']*["']/i)?.[1];
    return {
      image_url: ogImg ? resolveUrl(ogImg, url) || ogImg : (productImg ? resolveUrl(productImg, url) || productImg : undefined),
      description: ogDesc?.slice(0, 300),
    };
  } catch {
    return {};
  }
}

// Markdown-pattern fallback: extract product candidates from combined markdown when AI/structured signal is weak.
function extractProductsFromMarkdown(content: string, baseUrl: string): ProductSuggestion[] {
  const out: ProductSuggestion[] = [];
  const seen = new Set<string>();
  const push = (p: ProductSuggestion) => {
    const key = slugifyName(p.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };

  // Pattern A: heading or bold title immediately followed (within 2 lines) by a price line
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length && out.length < 8; i++) {
    const line = lines[i];
    const headMatch = line.match(/^(?:#{1,4}\s+|[*_]{2})(.{4,120}?)(?:[*_]{2})?\s*$/);
    const name = headMatch?.[1]?.trim();
    if (!name) continue;
    if (/^(?:about|introduction|contact|liên\s*hệ|về\s+chúng|footer|menu|trang\s+chủ|home|categor)/i.test(name)) continue;
    // Look ahead 3 lines for a price
    const lookahead = lines.slice(i + 1, i + 4).join(" ");
    if (!PRICE_ANY_RE.test(lookahead)) continue;
    const priceMatch = lookahead.match(PRICE_ANY_RE);
    push({ name, price_display: priceMatch?.[0], source_url: baseUrl, category: "product", source: "markdown" });
  }

  // Pattern B: bullet "- Name: 500k" or "- Name — 500k"
  for (const line of lines) {
    if (out.length >= 8) break;
    const m = line.match(/^\s*[-*+]\s+([^:—–\-]{4,100})\s*[:—–\-]\s*(.{2,80})$/);
    if (!m) continue;
    const tail = m[2];
    if (!PRICE_ANY_RE.test(tail)) continue;
    const name = m[1].trim();
    if (name.length < 3) continue;
    const priceMatch = tail.match(PRICE_ANY_RE);
    push({ name, price_display: priceMatch?.[0], source_url: baseUrl, category: "product", source: "markdown" });
  }

  return out;
}

// ============================================================
// Merge structured products with AI-extracted ones.
// Structured wins for: name/price/image/source_url.
// AI wins for: description/USP/keywords/category enrichment.
// ============================================================
function mergeProducts(structured: ProductSuggestion[], ai: ProductSuggestion[]): ProductSuggestion[] {
  const map = new Map<string, ProductSuggestion>();
  for (const p of structured) {
    const key = slugifyName(p.name);
    if (!key) continue;
    map.set(key, { ...p });
  }
  for (const p of ai) {
    const key = slugifyName(p.name);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.description = existing.description || p.description;
      existing.unique_selling_points = (existing.unique_selling_points?.length ? existing.unique_selling_points : p.unique_selling_points) || [];
      existing.keywords = (existing.keywords?.length ? existing.keywords : p.keywords) || [];
      existing.category = existing.category || p.category;
      existing.image_url = existing.image_url || p.image_url;
      existing.price_display = existing.price_display || p.price_display;
    } else {
      map.set(key, { ...p, source: p.source || "ai" });
    }
  }
  return [...map.values()].slice(0, 15);
}

async function extractProductSuggestions(
  content: string,
  locale: string,
  organizationId?: string,
  structuredHints?: ProductSuggestion[],
): Promise<{ ok: true; products: ProductSuggestion[]; model?: string } | { ok: false; code: string }> {
  const langInstr = locale === "en"
    ? "Output product names/descriptions in English."
    : "Output product names/descriptions in Vietnamese (tiếng Việt).";

  const hintsBlock = (structuredHints && structuredHints.length > 0)
    ? `\n\n## STRUCTURED PRODUCTS already detected (ground truth — do NOT remove or rename, only enrich missing description/USP/keywords):\n${
        structuredHints.map((p, i) => `${i + 1}. ${p.name}${p.price_display ? ` — ${p.price_display}` : ""}${p.source_url ? ` (${p.source_url})` : ""}${p.description ? `\n   ${p.description.slice(0, 160)}` : ""}`).join("\n")
      }\n`
    : "";

  const messages = [
    {
      role: "system" as const,
      content: `You analyze a brand's website content and extract its product/service catalog. ${langInstr} Only include REAL products/services that the brand sells — never invent items. Skip generic blog posts, navigation links, FAQ entries, or category-only lists. For each product, write a tight 1-2 sentence description focused on customer benefit. If the website lists fewer than 2 real products, return an empty array — do NOT pad with generic items. If a STRUCTURED PRODUCTS list is provided, you MUST keep ALL of those names verbatim and only ADD new items when you find clear product names with price, CTA, or "add to cart" signals in the content. When in doubt, omit. Mark each product with confidence: "high" (price+image+clear name), "medium" (clear name+context), "low" (only mentioned).`,
    },
    {
      role: "user" as const,
      content: `Below is scraped content from a brand's website (sub pages first, homepage last; each section prefixed with its source URL). Extract up to 15 distinct products or services. Treat any STRUCTURED PRODUCTS list as authoritative — keep those names exactly, just enrich their fields.${hintsBlock}\n\n${content.slice(0, 40000)}`,
    },
  ];

  const tools = [{
    type: "function" as const,
    function: {
      name: "extract_products",
      description: "Extract product/service catalog from website content",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string", description: "One of: product, service, course, digital, subscription, consulting, other" },
                description: { type: "string" },
                price_display: { type: "string" },
                image_url: { type: "string" },
                unique_selling_points: { type: "array", items: { type: "string" } },
                keywords: { type: "array", items: { type: "string" } },
                source_url: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["name"],
            },
          },
        },
        required: ["products"],
      },
    },
  }];

  // Multi-provider fallback: admin config (e.g. DashScope qwen-plus) → Qwen turbo → Lovable Gateway
  const FALLBACK_MODELS: (string | undefined)[] = [
    undefined,
    "qwen-turbo",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
  ];

  let result: any = null;
  let lastError = "";
  let usedModel = "primary";

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelOverride = FALLBACK_MODELS[i];
    usedModel = modelOverride || "primary";
    try {
      result = await callAI({
        functionName: "import-brand-from-website",
        organizationId,
        messages,
        tools,
        toolChoice: { type: "function", function: { name: "extract_products" } },
        ...(modelOverride ? { modelOverride } : {}),
      } as any);
      if (result?.success) break;
      lastError = result?.error || "";
      const isQuota = /402|429|quota|payment|rate limit|credits/i.test(lastError);
      if (!isQuota) break;
      console.warn(`[extractProductSuggestions] model failed (${usedModel}): ${lastError} — trying next`);
    } catch (e) {
      lastError = (e as Error).message;
      console.warn(`[extractProductSuggestions] exception (${usedModel}):`, lastError);
    }
  }

  if (!result?.success) {
    const isQuota = /402|429|quota|payment|rate limit|credits/i.test(lastError);
    return { ok: false, code: isQuota ? "CREDITS_EXHAUSTED" : (lastError || "AI_ERROR") };
  }

  try {
    const data: any = result.data;
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return { ok: false, code: "NO_TOOL_CALL" };
    const parsed = JSON.parse(toolCall.function.arguments);
    const raw = Array.isArray(parsed.products) ? parsed.products as ProductSuggestion[] : [];

    const seen = new Set<string>();
    const products: ProductSuggestion[] = [];
    const hasStructured = (structuredHints?.length || 0) > 0;
    for (const p of raw) {
      const name = (p.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      // Drop low-confidence AI guesses unless we already have structured ground truth backing them up
      const conf = (p as any).confidence as string | undefined;
      if (!hasStructured && conf === "low") continue;
      seen.add(key);
      products.push({
        name,
        category: p.category || undefined,
        description: p.description || undefined,
        price_display: p.price_display || undefined,
        image_url: p.image_url || undefined,
        unique_selling_points: Array.isArray(p.unique_selling_points) ? p.unique_selling_points.slice(0, 5) : [],
        keywords: Array.isArray(p.keywords) ? p.keywords.slice(0, 8) : [],
        source_url: p.source_url || undefined,
        source: "ai",
      });
      if (products.length >= 15) break;
    }
    return { ok: true, products, model: usedModel };
  } catch (e) {
    console.warn("[extractProductSuggestions] parse failed:", (e as Error).message);
    return { ok: false, code: "PARSE_ERROR" };
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

  // Logo-based color is the most reliable signal — try it and prepend if found
  const logoUrl = visuals.logo_url || (visuals.logo_candidates[0]?.url ?? null);
  if (logoUrl) {
    try {
      const logoColor = await extractColorFromLogo(logoUrl);
      if (logoColor && !isNeutralColor(logoColor)) {
        const existing = palette.candidates.filter(c => c.toLowerCase() !== logoColor.toLowerCase());
        palette.candidates = [logoColor, ...existing].slice(0, 6);
        palette.primary = logoColor;
        palette.secondary = palette.candidates[1] || palette.secondary;
        palette.accent = palette.candidates[2] || palette.accent;
        palette.source = "logo";
        palette.confidence = "high";
      }
    } catch (e) {
      console.warn("[runImport] logo color extraction failed:", (e as Error).message);
    }
  }

  // Auto-discover subpages from header/nav (cap 5, prioritize product/service paths)
  const autoDiscovered = discoverSubpages(home.html, targetUrl, 5);
  const mergedPathSet = new Set<string>();
  const mergedPaths: string[] = [];
  for (const p of [...extraPaths, ...autoDiscovered]) {
    const abs = normalizeUrl(p.startsWith("http") ? p : (() => { try { return new URL(p, targetUrl).toString(); } catch { return p; } })());
    if (!abs) continue;
    if (mergedPathSet.has(abs)) continue;
    mergedPathSet.add(abs);
    mergedPaths.push(abs);
    if (mergedPaths.length >= 8) break;
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

  // Layer 1: structured products from homepage HTML
  let structuredProducts: ProductSuggestion[] = extractStructuredProducts(home.html, targetUrl);

  const subPages: Array<{ url: string; markdown: string; html?: string }> = [];
  await Promise.all(
    mergedPaths.map(async (sub) => {
      const r = await firecrawlScrape(sub, ["markdown", "rawHtml"]);
      if (r.success && r.markdown) {
        subPages.push({ url: sub, markdown: r.markdown.slice(0, 4000), html: r.html });
        await emit?.("subpage_done", { url: sub, success: true });
      } else {
        await emit?.("subpage_done", { url: sub, success: false, error: r.error });
      }
    }),
  );

  // Layer 1 (cont.): structured products from sub-page HTML
  for (const sp of subPages) {
    if (!sp.html) continue;
    const more = extractStructuredProducts(sp.html, sp.url);
    for (const p of more) {
      const key = slugifyName(p.name);
      if (!key) continue;
      if (structuredProducts.some(x => slugifyName(x.name) === key)) continue;
      structuredProducts.push(p);
    }
  }

  // Layer 2: sitemap fallback if structured signal is weak
  let sitemapUsed = false;
  if (structuredProducts.length < 3) {
    await emit?.("progress", { step: "map_sitemap", percent: 35, message: "Đang quét sitemap để tìm trang sản phẩm" });
    const mapped = await firecrawlMap(targetUrl, "product san-pham dich-vu service shop", 30);
    sitemapUsed = mapped.length > 0;
    const baseOrigin = (() => { try { return new URL(targetUrl).origin; } catch { return ""; } })();
    const seenSub = new Set(subPages.map(s => s.url));
    seenSub.add(targetUrl);
    const productLikeUrls = mapped
      .filter(u => {
        try {
          const uo = new URL(u);
          return uo.origin === baseOrigin && PRODUCT_PATH_RE.test(uo.pathname) && !seenSub.has(u);
        } catch { return false; }
      })
      .slice(0, 3);
    if (productLikeUrls.length > 0) {
      await emit?.("progress", { step: "scrape_product_pages", percent: 40, message: `Đọc ${productLikeUrls.length} trang sản phẩm tìm được trong sitemap` });
      await Promise.all(productLikeUrls.map(async (u) => {
        const r = await firecrawlScrape(u, ["markdown", "rawHtml"]);
        if (r.success && r.markdown) {
          subPages.push({ url: u, markdown: r.markdown.slice(0, 4000), html: r.html });
          await emit?.("subpage_done", { url: u, success: true, kind: "product" });
          if (r.html) {
            const more = extractStructuredProducts(r.html, u);
            for (const p of more) {
              const key = slugifyName(p.name);
              if (!key) continue;
              if (structuredProducts.some(x => slugifyName(x.name) === key)) continue;
              structuredProducts.push(p);
            }
          }
        }
      }));
    }
  }

  const meta = home.metadata || {};
  const combinedContent = [
    `# Page title: ${meta.title || ""}`,
    meta.description ? `# Meta description: ${meta.description}` : "",
    meta.ogSiteName ? `# Site name: ${meta.ogSiteName}` : "",
    "",
    `## Source: ${targetUrl} (Homepage)`,
    home.markdown || "",
    ...subPages.map((p) => `\n## Source: ${p.url}\n${p.markdown}`),
  ].filter(Boolean).join("\n");

  await emit?.("progress", {
    step: "ai_analyzing",
    percent: 50,
    message: structuredProducts.length > 0
      ? `AI đang làm giàu ${structuredProducts.length} sản phẩm đã nhận từ schema`
      : "AI đang phân tích nội dung & sản phẩm",
  });

  const [extracted, productResult] = await Promise.all([
    extractBrandSuggestions({
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
    }),
    extractProductSuggestions(combinedContent, locale, organizationId, structuredProducts),
  ]);

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

  const aiProducts: ProductSuggestion[] = productResult.ok
    ? productResult.products.map(p => ({ ...p, source: p.source || "ai" }))
    : [];
  const productSuggestions: ProductSuggestion[] = mergeProducts(structuredProducts, aiProducts);
  const productSuggestionsError = productResult.ok ? undefined : productResult.code;
  if (!productResult.ok && structuredProducts.length === 0) {
    console.warn(`[runImport] product extraction failed: ${productResult.code}`);
  } else {
    console.log(`[runImport] products: structured=${structuredProducts.length} ai=${aiProducts.length} final=${productSuggestions.length} sitemapUsed=${sitemapUsed}`);
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
        theme_color: (visuals.theme_color && !isNeutralColor(visuals.theme_color)) ? visuals.theme_color : (palette.primary && !isNeutralColor(palette.primary) ? palette.primary : null),
        color_palette: palette,
        footer_info: mergedFooter,
        discovered_subpages: autoDiscovered,
        scraped_pages: 1 + subPages.length,
        product_suggestions: productSuggestions,
        product_suggestions_meta: {
          source: "import",
          count: productSuggestions.length,
          structured_count: structuredProducts.length,
          ai_count: aiProducts.length,
          final_count: productSuggestions.length,
          sources: Array.from(new Set(productSuggestions.map(p => p.source).filter(Boolean))),
          sitemap_used: sitemapUsed,
          error: productSuggestionsError,
          model: productResult.ok ? productResult.model : undefined,
        },
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
