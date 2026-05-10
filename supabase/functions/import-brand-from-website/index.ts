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
      body: JSON.stringify({ url, formats, onlyMainContent: true, waitFor: 1500 }),
    });
    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data?.error || `HTTP ${resp.status}` };
    const payload = data.data ?? data;
    return {
      success: true,
      markdown: payload?.markdown,
      metadata: payload?.metadata,
      links: payload?.links,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "scrape failed" };
  }
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

  const home = await firecrawlScrape(targetUrl, ["markdown"]);
  if (!home.success) {
    return { status: 502, body: { error: `Không scrape được trang chủ: ${home.error}` } };
  }
  await emit?.("subpage_done", { url: targetUrl, success: true, kind: "home" });

  if (extraPaths.length > 0) {
    await emit?.("progress", {
      step: "scrape_subpages",
      percent: 25,
      message: `Đang đọc ${extraPaths.length} trang phụ (about, giới thiệu)`,
    });
  }

  const subMarkdowns: string[] = [];
  await Promise.all(
    extraPaths.map(async (p) => {
      const sub = normalizeUrl(p.startsWith("http") ? p : new URL(p, targetUrl).toString());
      if (!sub) {
        await emit?.("subpage_done", { url: p, success: false, error: "bad url" });
        return;
      }
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
