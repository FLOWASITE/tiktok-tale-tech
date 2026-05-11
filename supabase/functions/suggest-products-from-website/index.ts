// suggest-products-from-website
// Scrape product/service pages from a brand's website và dùng AI để gợi ý
// danh sách sản phẩm/dịch vụ (name, category, description, price, image, USP).
//
// Body: { url, extra_paths?, max_products?, locale? }
// Response: { products: ProductSuggestion[], source_urls: string[], fallback?: boolean, errorCode? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ProductSuggestion {
  name: string;
  category?: string;
  description?: string;
  price_display?: string;
  image_url?: string;
  unique_selling_points?: string[];
  keywords?: string[];
  source_url?: string;
}

const PRODUCT_URL_PATTERNS = [
  /\/products?\//i, /\/shop\//i, /\/store\//i, /\/collections?\//i,
  /\/san-pham\//i, /\/sanpham\//i,
  /\/dich-vu\//i, /\/dichvu\//i,
  /\/services?\//i, /\/courses?\//i, /\/khoa-hoc\//i,
];

function normalizeUrl(raw: string): string | null {
  try {
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    return new URL(s).toString();
  } catch { return null; }
}

async function firecrawlScrape(url: string, formats: string[] = ["markdown"]): Promise<{
  success: boolean; markdown?: string; html?: string; links?: string[]; error?: string;
}> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { success: false, error: "FIRECRAWL_API_KEY not configured" };
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url, formats,
        onlyMainContent: !formats.includes("rawHtml"),
        waitFor: 1500,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data?.error || `HTTP ${resp.status}` };
    const payload = data.data ?? data;
    return {
      success: true,
      markdown: payload?.markdown,
      html: payload?.html ?? payload?.rawHtml,
      links: payload?.links,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "scrape failed" };
  }
}

function pickProductUrls(links: string[] | undefined, baseUrl: string, max = 8): string[] {
  if (!links?.length) return [];
  let baseOrigin = "";
  try { baseOrigin = new URL(baseUrl).origin; } catch { return []; }
  const out = new Set<string>();
  for (const l of links) {
    let abs: string;
    try { abs = new URL(l, baseUrl).toString(); } catch { continue; }
    let u: URL;
    try { u = new URL(abs); } catch { continue; }
    if (u.origin !== baseOrigin) continue;
    const path = u.pathname;
    if (path === "/" || path === "") continue;
    if (!PRODUCT_URL_PATTERNS.some((re) => re.test(path))) continue;
    // skip listing pages (end with /products/ or /san-pham/ alone)
    if (/\/(products?|san-pham|dich-vu|services?|shop|store|collections?)\/?$/i.test(path)) continue;
    out.add(`${u.origin}${u.pathname}`);
    if (out.size >= max) break;
  }
  return [...out];
}

async function callAIExtract(content: string, locale: string): Promise<{
  ok: true; products: ProductSuggestion[];
} | { ok: false; status?: number; error: string; code?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY not configured" };

  const langInstr = locale === "en"
    ? "Output product names/descriptions in English."
    : "Output product names/descriptions in Vietnamese (tiếng Việt).";

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You analyze a brand's website content and extract its product/service catalog. ${langInstr} Only include real products/services that the brand sells — never invent items. Skip generic blog posts, navigation links, or category lists. For each product, write a 1-2 sentence Vietnamese description that highlights what it does for the customer.`,
        },
        {
          role: "user",
          content: `Below is scraped content from a brand's website (homepage + product pages). Extract up to 12 distinct products or services.\n\n${content.slice(0, 25000)}`,
        },
      ],
      tools: [{
        type: "function",
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
                    name: { type: "string", description: "Product/service name" },
                    category: { type: "string", description: "One of: product, service, course, digital, subscription, consulting, other" },
                    description: { type: "string", description: "1-2 sentence customer-focused description" },
                    price_display: { type: "string", description: "Price as shown on site, e.g. '500.000đ' or 'Liên hệ'. Empty if unknown." },
                    image_url: { type: "string", description: "Absolute URL of product image if found" },
                    unique_selling_points: { type: "array", items: { type: "string" }, description: "2-3 short USP bullets" },
                    keywords: { type: "array", items: { type: "string" }, description: "3-5 SEO keywords" },
                    source_url: { type: "string", description: "URL of the page this product was found on" },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["products"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_products" } },
    }),
  });

  if (resp.status === 402) return { ok: false, status: 402, error: "Hết credit AI Gateway", code: "CREDITS_EXHAUSTED" };
  if (resp.status === 429) return { ok: false, status: 429, error: "AI Gateway rate limited", code: "RATE_LIMIT" };
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("[suggest-products] AI error:", resp.status, txt);
    return { ok: false, status: resp.status, error: `AI error ${resp.status}`, code: `AI_ERROR_${resp.status}` };
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return { ok: false, error: "AI did not return tool call" };
  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    const products = Array.isArray(parsed.products) ? parsed.products as ProductSuggestion[] : [];
    return { ok: true, products };
  } catch (e) {
    return { ok: false, error: `parse failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const url = body?.url ? normalizeUrl(body.url) : null;
    if (!url) return json({ error: "URL không hợp lệ" }, 400);
    const extraPaths: string[] = Array.isArray(body?.extra_paths) ? body.extra_paths.slice(0, 6) : [];
    const maxProducts: number = Math.min(15, Math.max(3, Number(body?.max_products) || 10));
    const locale: string = body?.locale || "vi";

    console.log(`[suggest-products] user=${user.id} url=${url} extras=${extraPaths.length}`);

    // Step 1: scrape homepage to discover product links
    const home = await firecrawlScrape(url, ["markdown", "rawHtml"]);
    if (!home.success) {
      return json({ products: [], fallback: true, errorCode: "SCRAPE_FAILED", error: home.error }, 200);
    }

    // Step 2: build list of product URLs (extra_paths from caller + auto-discovery)
    const discovered = pickProductUrls(home.links, url, 8);
    const productUrls: string[] = [];
    const seen = new Set<string>();
    for (const p of [...extraPaths, ...discovered]) {
      const abs = normalizeUrl(p);
      if (!abs || seen.has(abs)) continue;
      seen.add(abs);
      productUrls.push(abs);
      if (productUrls.length >= 6) break;
    }

    // Step 3: scrape each product page in parallel (cap 6)
    const productMarkdowns: Array<{ url: string; md: string }> = [];
    await Promise.all(productUrls.map(async (pu) => {
      const r = await firecrawlScrape(pu, ["markdown"]);
      if (r.success && r.markdown) {
        productMarkdowns.push({ url: pu, md: r.markdown.slice(0, 4000) });
      }
    }));

    // Step 4: build combined content for AI
    const combined = [
      `# Homepage\n${(home.markdown || "").slice(0, 8000)}`,
      ...productMarkdowns.map((p, i) => `\n# Product page ${i + 1}: ${p.url}\n${p.md}`),
    ].join("\n");

    if (combined.length < 200) {
      return json({ products: [], fallback: true, errorCode: "NO_CONTENT", source_urls: productUrls }, 200);
    }

    // Step 5: AI extract
    const result = await callAIExtract(combined, locale);
    if (!result.ok) {
      // Soft-fail for quota/rate-limit so UI can offer manual fallback
      const soft = result.code === "CREDITS_EXHAUSTED" || result.code === "RATE_LIMIT";
      return json({
        products: [],
        fallback: true,
        errorCode: result.code || "AI_ERROR",
        error: result.error,
        source_urls: productUrls,
      }, soft ? 200 : 502);
    }

    // Cap, dedupe by name
    const seenNames = new Set<string>();
    const products: ProductSuggestion[] = [];
    for (const p of result.products) {
      const name = (p.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      products.push({
        name,
        category: p.category || undefined,
        description: p.description || undefined,
        price_display: p.price_display || undefined,
        image_url: p.image_url || undefined,
        unique_selling_points: Array.isArray(p.unique_selling_points) ? p.unique_selling_points.slice(0, 5) : [],
        keywords: Array.isArray(p.keywords) ? p.keywords.slice(0, 8) : [],
        source_url: p.source_url || undefined,
      });
      if (products.length >= maxProducts) break;
    }

    return json({
      products,
      source_urls: productUrls,
      cached: false,
    });
  } catch (e) {
    console.error("[suggest-products] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
