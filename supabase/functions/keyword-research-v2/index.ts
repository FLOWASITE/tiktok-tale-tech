// AI Research Lab v2 — Multi-seed + SERP grounding + competitor scrape + streaming
// + Brand/Industry context + Seed expansion (Autocomplete + PAA) + SERP cache
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { expandSeeds, expandWithModifiers, generateBrandDominationSeeds } from "../_shared/seed-expander.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Preset = "long_tail_questions" | "commercial_intent" | "local_seo_vn" | "competitor_gaps" | "brand_domination" | "default";

const PRESET_PROMPTS: Record<Preset, string> = {
  long_tail_questions: "TẬP TRUNG: Long-tail 4+ từ + câu hỏi (làm sao, cách, có nên, là gì, tại sao, khi nào).",
  commercial_intent: "TẬP TRUNG: Commercial/transactional intent — 'giá', 'mua', 'đăng ký', 'tốt nhất', 'so sánh', 'review'.",
  local_seo_vn: "TẬP TRUNG: Local SEO Việt Nam — thêm địa danh (Hà Nội, TP HCM, Đà Nẵng, quận, gần tôi).",
  competitor_gaps: "TẬP TRUNG: Keyword đối thủ đang rank (lấy từ SERP grounding bên dưới) mà có thể tận dụng để cạnh tranh.",
  brand_domination: "TẬP TRUNG: Brand keyword — phủ 100% SERP cho tên brand. Sinh thêm biến thể chưa có trong danh sách cứng (sai chính tả phổ biến, slang, modifier ngách). KHÔNG sinh keyword không chứa brand name.",
  default: "Cân bằng các loại: long-tail, question, modifier, comparison, commercial.",
};

interface KeywordSuggestion {
  keyword: string;
  search_volume: number;
  difficulty: number;
  cpc_vnd: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  funnel_stage: "TOFU" | "MOFU" | "BOFU";
  cluster_name: string;
  rationale?: string;
  source_seed?: string;
  pillar_match?: string | null;
  audience_match?: "core" | "adjacent" | "off-target";
  brand_fit_score?: number;
  brand_fit_reason?: string;
  is_gap?: boolean;
  final_score?: number;
}

// Simple in-memory TTL cache for Firecrawl (24h search, 6h scrape)
const fcCache = new Map<string, { data: any; exp: number }>();
function fcGet<T>(key: string): T | null {
  const hit = fcCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data as T;
  if (hit) fcCache.delete(key);
  return null;
}
function fcSet(key: string, data: any, ttlMs: number) {
  fcCache.set(key, { data, exp: Date.now() + ttlMs });
}

async function firecrawlSearch(query: string, country = "vn", lang = "vi"): Promise<{ title: string; description: string; url: string }[]> {
  if (!FIRECRAWL_API_KEY) return [];
  const cacheKey = `fc:search:${query.toLowerCase()}:${country}:${lang}`;
  const cached = fcGet<{ title: string; description: string; url: string }[]>(cacheKey);
  if (cached) {
    console.log(`[keyword-research-v2] SERP cache HIT: ${query}`);
    return cached;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10, lang, country }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const j = await res.json();
    const arr = j.data?.web || j.data || [];
    const out = arr.slice(0, 10).map((r: any) => ({ title: r.title || "", description: r.description || r.snippet || "", url: r.url || "" }));
    fcSet(cacheKey, out, 24 * 3600_000);
    return out;
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl search failed:", e);
    return [];
  }
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  const cacheKey = `fc:scrape:${url}`;
  const cached = fcGet<string>(cacheKey);
  if (cached !== null) return cached;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const j = await res.json();
    const md = String(j.data?.markdown || j.markdown || "").slice(0, 4000);
    fcSet(cacheKey, md, 6 * 3600_000);
    return md;
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl scrape failed:", e);
    return "";
  }
}

interface BrandCtx {
  brand_name?: string;
  industry?: string;
  tone_of_voice?: string;
  formality?: string;
  language_style?: string;
  target_audience?: string;
  target_locations?: string[];
  target_gender?: string;
  pillars: { name: string; keywords?: string[]; weight?: number; description?: string }[];
  evergreen_themes?: string[];
  brand_hashtags?: string[];
  signature_phrases?: string[];
  unique_value_proposition?: string;
  brand_positioning?: string;
  mission?: string;
  tagline?: string;
  main_competitors?: string[];
  competitive_advantages?: string[];
  preferred_words?: string[];
  forbidden_terms: string[];
  high_risk_keywords?: string[];
  preferred_terms?: string[];
  claim_restrictions?: { claim: string; alternative: string }[];
  jurisdiction?: string;
  social_signals?: SocialSignals | null;
}

interface SocialSignals {
  active_platforms: string[];
  handles: { platform: string; handle: string }[];
  recent_topics: string[];
  recent_hashtags: string[];
  frequent_terms: string[];
  audience_questions: string[];
}

function trim(s: any, n = 200): string {
  return String(s || "").trim().slice(0, n);
}
function arr(v: any, n = 5): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || "").trim()).filter(Boolean).slice(0, n);
}

const STOPWORDS = new Set([
  "và","của","là","có","cho","với","trong","để","các","những","này","đó","khi","như","một","được","đã","sẽ","không","tôi","bạn","mình","chúng","rất","cũng","nên","theo","tại","từ","ra","vào","trên","dưới","mà","thì","hay","hoặc","bằng","về","đi","làm","ai","gì","sao","đâu","the","and","for","with","that","this","you","your","are","was","but","not","all","new","more","best","top","how","why","what","when","where",
]);

function extractTerms(text: string, max = 5): string[] {
  const words = String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@][\w\u00C0-\u1EF9]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
  const freq = new Map<string, number>();
  // bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`;
    freq.set(bg, (freq.get(bg) || 0) + 2);
  }
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k);
}

function extractHashtags(text: string): string[] {
  const m = String(text || "").match(/#[\w\u00C0-\u1EF9]+/g) || [];
  return m.map(x => x.toLowerCase());
}

async function fetchSocialSignals(supabase: any, brandTemplateId?: string, organizationId?: string): Promise<SocialSignals | null> {
  if (!brandTemplateId && !organizationId) return null;
  try {
    // 1. Active social connections for this brand
    let connQ = supabase.from("social_connections")
      .select("platform,platform_username,platform_display_name,page_name")
      .eq("is_active", true).limit(20);
    if (brandTemplateId) connQ = connQ.eq("brand_template_id", brandTemplateId);
    else if (organizationId) connQ = connQ.eq("organization_id", organizationId);
    const { data: conns } = await connQ;
    const platforms = new Set<string>();
    const handles: { platform: string; handle: string }[] = [];
    for (const c of (conns || [])) {
      const p = String(c.platform || "").toLowerCase();
      if (!p) continue;
      platforms.add(p);
      const h = c.platform_username || c.page_name || c.platform_display_name;
      if (h && handles.length < 10) handles.push({ platform: p, handle: String(h) });
    }

    // 2. Recent multi-channel content (60d)
    const since = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();
    let mcQ = supabase.from("multi_channel_contents")
      .select("title,topic,tags,facebook_content,instagram_content,linkedin_content,twitter_content,tiktok_content,threads_content,zalo_oa_content")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);
    if (brandTemplateId) mcQ = mcQ.eq("brand_template_id", brandTemplateId);
    else if (organizationId) mcQ = mcQ.eq("organization_id", organizationId);
    const { data: contents } = await mcQ;

    const topicSet = new Set<string>();
    const tagSet = new Set<string>();
    const captionParts: string[] = [];
    const hashtagFreq = new Map<string, number>();
    for (const c of (contents || [])) {
      if (c.title) topicSet.add(String(c.title).slice(0, 80));
      if (c.topic) topicSet.add(String(c.topic).slice(0, 80));
      if (Array.isArray(c.tags)) c.tags.forEach((t: any) => t && tagSet.add(String(t)));
      const captions = [c.facebook_content, c.instagram_content, c.linkedin_content, c.twitter_content, c.tiktok_content, c.threads_content, c.zalo_oa_content]
        .filter(Boolean).map(String).join(" ");
      if (captions) {
        captionParts.push(captions.slice(0, 500));
        for (const h of extractHashtags(captions)) hashtagFreq.set(h, (hashtagFreq.get(h) || 0) + 1);
      }
    }

    const recent_topics = [...topicSet].slice(0, 10);
    const recent_hashtags = [
      ...new Set([
        ...[...hashtagFreq.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
        ...[...tagSet].map(t => t.startsWith("#") ? t.toLowerCase() : `#${t.toLowerCase()}`),
      ]),
    ].slice(0, 10);
    const frequent_terms = extractTerms(captionParts.join(" "), 12);

    // 3. Audience questions from comments (best-effort)
    const audience_questions: string[] = [];
    try {
      let engQ = supabase.from("social_post_engagements")
        .select("event_data")
        .eq("event_type", "comment")
        .order("created_at", { ascending: false })
        .limit(50);
      if (brandTemplateId) engQ = engQ.eq("brand_template_id", brandTemplateId);
      else if (organizationId) engQ = engQ.eq("organization_id", organizationId);
      const { data: engs } = await engQ;
      for (const e of (engs || [])) {
        const msg = String(e.event_data?.message || e.event_data?.text || "").trim();
        if (msg.length >= 8 && msg.length <= 200 && /\?/.test(msg)) {
          audience_questions.push(msg);
          if (audience_questions.length >= 5) break;
        }
      }
    } catch { /* table may not exist for some envs */ }

    if (!platforms.size && !recent_topics.length && !frequent_terms.length) return null;
    return {
      active_platforms: [...platforms],
      handles,
      recent_topics,
      recent_hashtags,
      frequent_terms,
      audience_questions,
    };
  } catch (e) {
    console.warn("[keyword-research-v2] fetchSocialSignals failed:", (e as Error).message);
    return null;
  }
}

async function fetchBrandCtx(supabase: any, brandTemplateId?: string): Promise<BrandCtx | null> {
  if (!brandTemplateId) return null;
  const { data: brand } = await supabase
    .from("brand_templates")
    .select(`
      brand_name,name,industry,tone_of_voice,formality_level,language_style,
      target_age_range,target_gender,market_segment,target_locations,
      content_pillars,evergreen_themes,brand_hashtags,signature_phrases,
      unique_value_proposition,brand_positioning,mission,tagline,
      main_competitors,competitive_advantages,
      preferred_words,forbidden_words,
      industry_template_id,jurisdiction_code
    `)
    .eq("id", brandTemplateId)
    .maybeSingle();
  if (!brand) return null;

  let forbidden: string[] = Array.isArray(brand.forbidden_words) ? brand.forbidden_words.map(String) : [];
  let preferredTerms: string[] = [];
  let highRisk: string[] = [];
  let claimRestrictions: { claim: string; alternative: string }[] = [];
  const jurisdiction = brand.jurisdiction_code as string | undefined;

  if (brand.industry_template_id) {
    const { data: ind } = await supabase
      .from("industry_templates")
      .select("forbidden_terms,preferred_terms,high_risk_keywords,claim_restrictions")
      .eq("id", brand.industry_template_id)
      .maybeSingle();
    if (ind) {
      if (Array.isArray(ind.forbidden_terms)) {
        forbidden = [...new Set([...forbidden, ...ind.forbidden_terms.map(String)])];
      }
      if (Array.isArray(ind.preferred_terms)) preferredTerms = ind.preferred_terms.map(String).slice(0, 10);
      if (Array.isArray(ind.high_risk_keywords)) highRisk = ind.high_risk_keywords.map(String).slice(0, 10);
      if (Array.isArray(ind.claim_restrictions)) {
        claimRestrictions = ind.claim_restrictions
          .filter((c: any) => c?.claim && c?.alternative)
          .slice(0, 6)
          .map((c: any) => ({ claim: trim(c.claim, 80), alternative: trim(c.alternative, 80) }));
      }
    }
  }

  const pillars = Array.isArray(brand.content_pillars) ? brand.content_pillars : [];
  return {
    brand_name: brand.brand_name || brand.name,
    industry: brand.industry,
    tone_of_voice: brand.tone_of_voice,
    formality: brand.formality_level,
    language_style: brand.language_style,
    target_audience: [brand.target_age_range, brand.market_segment].filter(Boolean).join(" / "),
    target_locations: arr(brand.target_locations, 5),
    target_gender: brand.target_gender,
    pillars: pillars.slice(0, 5),
    evergreen_themes: arr(brand.evergreen_themes, 5),
    brand_hashtags: arr(brand.brand_hashtags, 8),
    signature_phrases: arr(brand.signature_phrases, 5),
    unique_value_proposition: trim(brand.unique_value_proposition, 220),
    brand_positioning: trim(brand.brand_positioning, 220),
    mission: trim(brand.mission, 160),
    tagline: trim(brand.tagline, 100),
    main_competitors: arr(brand.main_competitors, 5),
    competitive_advantages: arr(brand.competitive_advantages, 5),
    preferred_words: arr(brand.preferred_words, 10),
    forbidden_terms: forbidden.slice(0, 25),
    high_risk_keywords: highRisk,
    preferred_terms: preferredTerms,
    claim_restrictions: claimRestrictions,
    jurisdiction,
  };
}

function buildBrandBlock(ctx: BrandCtx | null): string {
  if (!ctx) return "";
  const L: string[] = ["", "## BRAND DNA (ưu tiên cao)"];
  L.push(`- Brand: ${ctx.brand_name || "—"}${ctx.industry ? ` · Ngành: ${ctx.industry}` : ""}${ctx.jurisdiction ? ` · Jurisdiction: ${ctx.jurisdiction}` : ""}`);
  if (ctx.unique_value_proposition) L.push(`- USP: ${ctx.unique_value_proposition}`);
  if (ctx.brand_positioning) L.push(`- Positioning: ${ctx.brand_positioning}`);
  if (ctx.tagline) L.push(`- Tagline: "${ctx.tagline}"`);
  if (ctx.mission) L.push(`- Mission: ${ctx.mission}`);

  L.push("", "## AUDIENCE");
  L.push(`- Profile: ${ctx.target_audience || "không rõ"}${ctx.target_gender ? ` · ${ctx.target_gender}` : ""}`);
  if (ctx.target_locations?.length) L.push(`- Locations: ${ctx.target_locations.join(", ")}`);

  L.push("", "## VOICE");
  if (ctx.tone_of_voice) L.push(`- Tone: ${ctx.tone_of_voice}${ctx.formality ? ` · Formality: ${ctx.formality}` : ""}${ctx.language_style ? ` · Style: ${ctx.language_style}` : ""}`);
  if (ctx.signature_phrases?.length) L.push(`- Signature phrases (có thể dùng làm modifier): ${ctx.signature_phrases.join(" | ")}`);

  if (ctx.pillars.length) {
    const sorted = [...ctx.pillars].sort((a: any, b: any) => (b?.weight ?? 0) - (a?.weight ?? 0)).slice(0, 5);
    L.push("", "## CONTENT TERRITORY");
    L.push("- Pillars (sort theo weight):");
    sorted.forEach((p: any, i) => {
      const kws = Array.isArray(p.keywords) ? p.keywords.slice(0, 4).join(", ") : "";
      const w = typeof p.weight === "number" ? ` [w=${p.weight}]` : "";
      L.push(`  ${i + 1}. ${p.name}${w}${kws ? ` — keywords: ${kws}` : ""}`);
    });
    if (ctx.evergreen_themes?.length) L.push(`- Evergreen themes: ${ctx.evergreen_themes.join(", ")}`);
    if (ctx.brand_hashtags?.length) L.push(`- Brand hashtags: ${ctx.brand_hashtags.join(" ")}`);
  }

  if (ctx.main_competitors?.length || ctx.competitive_advantages?.length) {
    L.push("", "## COMPETITIVE LANDSCAPE");
    if (ctx.main_competitors?.length) L.push(`- Đối thủ chính: ${ctx.main_competitors.join(", ")} (gợi ý keyword cạnh tranh "vs", "so sánh", "thay thế")`);
    if (ctx.competitive_advantages?.length) L.push(`- Lợi thế cạnh tranh: ${ctx.competitive_advantages.join(" | ")} (xoáy vào điểm này khi tạo BOFU keyword)`);
  }

  L.push("", "## INDUSTRY GUARDRAILS (BLOCK CỨNG)");
  if (ctx.forbidden_terms.length) L.push(`- ⛔ Forbidden (KHÔNG được sinh keyword chứa): ${ctx.forbidden_terms.join(", ")}`);
  if (ctx.high_risk_keywords?.length) L.push(`- ⚠️ High-risk (chỉ dùng khi context rõ): ${ctx.high_risk_keywords.join(", ")}`);
  if (ctx.claim_restrictions?.length) {
    L.push("- 🚫 Claim restrictions (paraphrase nếu gặp):");
    ctx.claim_restrictions.forEach((c) => L.push(`  · "${c.claim}" → "${c.alternative}"`));
  }
  if (ctx.preferred_terms?.length) L.push(`- 👍 Preferred industry terms: ${ctx.preferred_terms.join(", ")}`);
  if (ctx.preferred_words?.length) L.push(`- 👍 Brand preferred: ${ctx.preferred_words.join(", ")}`);

  const ss = ctx.social_signals;
  if (ss && (ss.active_platforms.length || ss.recent_topics.length || ss.frequent_terms.length)) {
    L.push("", "## SOCIAL FOOTPRINT (giọng thực tế brand đang phát trên social)");
    if (ss.active_platforms.length) L.push(`- Active channels: ${ss.active_platforms.join(", ")}`);
    if (ss.handles.length) L.push(`- Handles: ${ss.handles.map(h => `@${h.handle} (${h.platform})`).join(" · ")}`);
    if (ss.recent_topics.length) L.push(`- Chủ đề gần đây (60d): ${ss.recent_topics.slice(0, 8).map(t => `"${t}"`).join(", ")}`);
    if (ss.recent_hashtags.length) L.push(`- Hashtag brand đang dùng: ${ss.recent_hashtags.slice(0, 8).join(" ")}`);
    if (ss.frequent_terms.length) L.push(`- Cụm tần suất cao trong caption: ${ss.frequent_terms.slice(0, 10).join(", ")}`);
    if (ss.audience_questions.length) L.push(`- Audience đang hỏi: ${ss.audience_questions.slice(0, 4).map(q => `"${q}"`).join(" | ")}`);
    L.push("- → Ưu tiên keyword khớp social footprint. Nếu brand KHÔNG có một platform, hạn chế keyword chứa tên platform đó.");
  }

  L.push("", "## OUTPUT BIAS");
  L.push("- Keyword PHẢI bám brand DNA + audience + pillars; tuyệt đối tránh chung chung.");
  L.push("- Mỗi keyword GẮN: pillar_match (tên pillar khớp nhất hoặc null), audience_match (core/adjacent/off-target), brand_fit_score (0-100), brand_fit_reason (≤80 ký tự).");
  L.push("- brand_fit_score ≥ 70 = bám sát pillar + audience core + voice fit; 40-69 = adjacent; <40 = off-brand (ĐỪNG sinh trừ khi user chọn preset 'competitor_gaps').");

  return L.join("\n");
}

function buildSystemPrompt(preset: Preset, limit: number, brandCtx: BrandCtx | null): string {
  return `Bạn là chuyên gia SEO tiếng Việt. Sinh chính xác ${limit} keyword biến thể.

${PRESET_PROMPTS[preset]}

Mỗi keyword có: search_volume (tháng/VN, 0-50000), difficulty (0-100), cpc_vnd (0-50000), intent, funnel_stage (TOFU/MOFU/BOFU), cluster_name (3-5 từ).
Khi có SERP grounding (titles/descriptions thật), ƯỚC LƯỢNG dựa trên độ cạnh tranh thật từ SERP — KHÔNG bịa số.
Trả qua tool call 'submit_keyword_batch', mỗi batch 5 keyword. Gọi tool nhiều lần cho đến khi đủ ${limit}.${buildBrandBlock(brandCtx)}`;
}

function buildUserPrompt(seeds: string[], expandedSeeds: string[], serpGround: Record<string, any[]>, competitorContext: string, locale: string): string {
  let p = `SEEDS (user): ${seeds.map(s => `"${s}"`).join(", ")}\nLOCALE: ${locale}\n`;
  if (expandedSeeds.length) {
    p += `SEEDS MỞ RỘNG (Autocomplete + PAA): ${expandedSeeds.map(s => `"${s}"`).join(", ")}\n`;
  }
  p += `\n`;
  if (Object.keys(serpGround).length) {
    p += "=== SERP GROUNDING (top 10 thực tế) ===\n";
    for (const [seed, results] of Object.entries(serpGround)) {
      p += `\n[${seed}]\n`;
      results.slice(0, 8).forEach((r: any, i: number) => {
        p += `${i + 1}. ${r.title} — ${r.description?.slice(0, 120) || ""}\n`;
      });
    }
    p += "\n";
  }
  if (competitorContext) {
    p += `=== NỘI DUNG ĐỐI THỦ (đã scrape) ===\n${competitorContext.slice(0, 3000)}\n\n`;
  }
  p += `Sinh keyword đa dạng từ tất cả seeds + seeds mở rộng. Mỗi keyword gắn source_seed = seed gốc gần nhất.`;
  return p;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_keyword_batch",
    description: "Submit a batch of 5 keyword suggestions",
    parameters: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              search_volume: { type: "integer" },
              difficulty: { type: "integer" },
              cpc_vnd: { type: "integer" },
              intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
              funnel_stage: { type: "string", enum: ["TOFU", "MOFU", "BOFU"] },
              cluster_name: { type: "string" },
              rationale: { type: "string" },
              source_seed: { type: "string" },
              pillar_match: { type: "string", description: "Tên pillar phù hợp nhất; null nếu không khớp" },
              audience_match: { type: "string", enum: ["core", "adjacent", "off-target"], description: "Mức khớp với audience brand" },
              brand_fit_score: { type: "integer", minimum: 0, maximum: 100, description: "0-100 điểm bám sát brand DNA" },
              brand_fit_reason: { type: "string", description: "≤80 ký tự lý do fit/lệch brand" },
            },
            required: ["keyword", "search_volume", "difficulty", "cpc_vnd", "intent", "funnel_stage", "cluster_name"],
          },
        },
      },
      required: ["keywords"],
    },
  },
};

async function callAI(supabase: any, organizationId: string, userId: string, seeds: string[], expandedSeeds: string[], serpGround: Record<string, any[]>, competitorContext: string, preset: Preset, locale: string, limit: number, brandCtx: BrandCtx | null): Promise<{ suggestions: KeywordSuggestion[]; usedFallback: boolean }> {
  const sys = buildSystemPrompt(preset, limit, brandCtx);
  const user = buildUserPrompt(seeds, expandedSeeds, serpGround, competitorContext, locale);

  const tryCall = async (modelOverride?: string): Promise<KeywordSuggestion[]> => {
    const collected: KeywordSuggestion[] = [];
    const seenKw = new Set<string>();
    const messages: any[] = [
      { role: "system", content: sys },
      { role: "user", content: user },
    ];
    const MAX_ROUNDS = 6;
    for (let round = 0; round < MAX_ROUNDS && collected.length < limit; round++) {
      const res = await callAIWithMetrics(supabase, {
        functionName: "keyword-research-v2",
        organizationId,
        userId,
        messages,
        tools: [TOOL_SCHEMA],
        modelOverride,
        actionType: "keyword_research",
      });
      if (!res.success) {
        const err: any = new Error(res.error || "AI call failed");
        if (res.error?.includes("Rate limit")) err.status = 429;
        else if (res.error?.includes("Payment")) err.status = 402;
        throw err;
      }
      const msg = res.data?.choices?.[0]?.message;
      const calls = msg?.tool_calls || [];
      if (!calls.length) break;
      let added = 0;
      for (const c of calls) {
        try {
          const args = JSON.parse(c.function.arguments);
          if (Array.isArray(args.keywords)) {
            for (const kw of args.keywords) {
              const k = String(kw?.keyword || "").toLowerCase().trim();
              if (!k || seenKw.has(k)) continue;
              seenKw.add(k);
              collected.push(kw);
              added++;
            }
          }
        } catch { /* skip */ }
      }
      if (collected.length >= limit) break;
      if (added === 0) break;
      // Feed tool results back, ask for more
      messages.push({ role: "assistant", content: msg.content || "", tool_calls: calls });
      for (const c of calls) {
        messages.push({
          role: "tool",
          tool_call_id: c.id,
          content: JSON.stringify({ ack: true, received: added, total_so_far: collected.length, need_more: limit - collected.length }),
        });
      }
      const recent = collected.slice(-20).map(k => k.keyword).join(", ");
      messages.push({
        role: "user",
        content: `Đã nhận ${collected.length}/${limit}. Tiếp tục sinh ${Math.min(20, limit - collected.length)} keyword MỚI, ĐA DẠNG (khác cluster/intent/funnel với batch trước). KHÔNG lặp các keyword đã gửi: ${recent}`,
      });
    }
    return collected.slice(0, limit);
  };

  try {
    const suggestions = await tryCall();
    return { suggestions, usedFallback: false };
  } catch (e: any) {
    if (e.status === 429 || e.status === 402) throw e;
    console.warn("[keyword-research-v2] Primary failed, fallback to flash:", e.message);
    const suggestions = await tryCall("google/gemini-2.5-flash");
    return { suggestions, usedFallback: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  let seeds: string[] = (Array.isArray(body.seeds) ? body.seeds : [body.seed]).map((s: any) => String(s || "").trim()).filter(Boolean).slice(0, 5);
  const competitorUrls: string[] = (body.competitorUrls || []).map((u: any) => String(u || "").trim()).filter(Boolean).slice(0, 3);
  const preset: Preset = PRESET_PROMPTS[body.preset as Preset] ? body.preset : "default";
  const organizationId = body.organizationId;
  const brandTemplateId: string | undefined = body.brandTemplateId;
  const locale = body.locale || "vi";
  const mode: "preview" | "deep" = body.mode === "deep" ? "deep" : "preview";
  const defaultLimit = mode === "deep" ? 150 : 30;
  const maxLimit = mode === "deep" ? 200 : 100;
  const limit = Math.min(maxLimit, Math.max(5, parseInt(body.limit) || defaultLimit));

  if (!organizationId) {
    return new Response(JSON.stringify({ error: "organizationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Brand context (optional)
  const [brandCtxBase, socialSignals] = await Promise.all([
    fetchBrandCtx(supabase, brandTemplateId).catch((e) => {
      console.warn("[keyword-research-v2] brand ctx fail:", e);
      return null;
    }),
    fetchSocialSignals(supabase, brandTemplateId, organizationId).catch((e) => {
      console.warn("[keyword-research-v2] social signals fail:", e);
      return null;
    }),
  ]);
  const brandCtx: BrandCtx | null = brandCtxBase
    ? { ...brandCtxBase, social_signals: socialSignals }
    : (socialSignals ? ({ pillars: [], forbidden_terms: [], social_signals: socialSignals } as BrandCtx) : null);

  // Smart seed derivation: pillars (weighted) + USP + evergreen + location
  let seedStrategy: string[] = [];
  if (seeds.length === 0 && brandCtx) {
    const seen = new Set<string>();
    const push = (s: string, tag: string) => {
      const t = (s || "").trim();
      if (!t || t.length < 2 || seen.has(t.toLowerCase())) return;
      seen.add(t.toLowerCase());
      seeds.push(t);
      seedStrategy.push(`${tag}:${t}`);
    };
    // 1. Top 2 pillar keywords (weighted)
    const sortedPillars = [...brandCtx.pillars].sort((a: any, b: any) => (b?.weight ?? 0) - (a?.weight ?? 0));
    for (const p of sortedPillars.slice(0, 2)) {
      const kw = Array.isArray(p?.keywords) && p.keywords[0] ? String(p.keywords[0]) : String(p?.name || "");
      push(kw, "pillar");
    }
    // 2. USP / positioning noun phrase (first 6 words)
    const uspSrc = brandCtx.unique_value_proposition || brandCtx.brand_positioning || "";
    if (uspSrc) {
      const phrase = uspSrc.split(/[.!?,;:|]/)[0].split(/\s+/).slice(0, 6).join(" ").trim();
      if (phrase) push(phrase.toLowerCase(), "usp");
    }
    // 3. Evergreen theme
    if (brandCtx.evergreen_themes?.length) push(brandCtx.evergreen_themes[0], "evergreen");
    // 4. Location-modified seed
    if (brandCtx.target_locations?.length && brandCtx.industry) {
      push(`${brandCtx.industry} ${brandCtx.target_locations[0]}`, "local");
    }
    // 5. Social signals — recent topics + frequent terms (rất giá trị, nói lên giọng thật brand)
    const ss = brandCtx.social_signals;
    if (ss) {
      if (ss.recent_topics[0]) push(ss.recent_topics[0], "social_topic");
      if (ss.frequent_terms[0]) push(ss.frequent_terms[0], "social_term");
    }
    if (seeds.length < 3) {
      const ind = brandCtx.industry || "";
      const name = brandCtx.brand_name || "";
      // 6. USP/positioning/mission noun-phrases — quan trọng nhất khi brand thiếu industry/pillars
      const uspPool = [brandCtx.unique_value_proposition, brandCtx.brand_positioning, brandCtx.mission, brandCtx.tagline]
        .filter(Boolean).join(" ");
      if (uspPool) {
        for (const term of extractTerms(uspPool, 6)) {
          if (term && term.length >= 4) push(term, "usp_term");
          if (seeds.length >= 5) break;
        }
      }
      if (name && ind) push(`${name} ${ind}`, "fallback");
      if (ind) push(`${ind} là gì`, "fallback");
      if (ind) push(`cách chọn ${ind}`, "fallback");
      if (name && seeds.length < 2) push(name, "fallback");
    }
    seeds = seeds.slice(0, 5);
    seedStrategy = seedStrategy.slice(0, 5);
    console.log(`[keyword-research-v2] smart-derived ${seeds.length} seeds`, seedStrategy);
  }

  if (!seeds.length) {
    return new Response(JSON.stringify({ error: "Không có seed: brand chưa có pillars/industry và FE không gửi seed thủ công." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Create job
  const { data: job, error: jobErr } = await supabase.from("keyword_research_jobs").insert({
    organization_id: organizationId,
    seed_keyword: seeds[0],
    seeds, competitor_urls: competitorUrls, preset,
    mode: mode === "deep" ? "deep" : "expand", status: "running",
    ai_model: "google/gemini-2.5-pro",
    created_by: user.id,
  }).select("id").single();
  if (jobErr || !job) return new Response(JSON.stringify({ error: jobErr?.message || "Failed to create job" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const jobId = job.id;

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const work = async () => {
        try {
          send("progress", { pct: 5, jobId, message: "Khởi tạo job..." });
          if (brandCtx?.brand_name) {
            send("progress", { pct: 8, message: `Áp brand context: ${brandCtx.brand_name}` });
          }
          if (brandCtx?.social_signals) {
            const ss = brandCtx.social_signals;
            send("brand_signals", {
              active_platforms: ss.active_platforms,
              handles: ss.handles,
              recent_topics: ss.recent_topics.slice(0, 6),
              recent_hashtags: ss.recent_hashtags.slice(0, 8),
              frequent_terms: ss.frequent_terms.slice(0, 8),
              audience_questions: ss.audience_questions.slice(0, 3),
            });
            if (ss.active_platforms.length) {
              send("progress", { pct: 10, message: `Đọc tín hiệu social: ${ss.active_platforms.join(", ")}` });
            }
          }

          // 1. Competitor scrape
          let competitorContext = "";
          if (competitorUrls.length) {
            send("progress", { pct: 15, message: `Đang phân tích ${competitorUrls.length} URL đối thủ...` });
            const scraped = await Promise.all(competitorUrls.map(u => firecrawlScrape(u)));
            competitorContext = scraped.filter(Boolean).join("\n\n---\n\n");
          }

          // 2. SERP grounding
          send("progress", { pct: 25, message: "SERP grounding (Firecrawl)..." });
          const serpGround: Record<string, any[]> = {};
          await Promise.all(seeds.map(async (s) => {
            serpGround[s] = await firecrawlSearch(s);
          }));
          send("serp", { hasFirecrawl: !!FIRECRAWL_API_KEY, results: Object.fromEntries(Object.entries(serpGround).map(([k, v]) => [k, v.length])) });

          // 3. Seed expansion (deep = 2 rounds) + modifier-based expansion
          send("progress", { pct: 35, message: mode === "deep" ? "Mở rộng seed vòng 1..." : "Mở rộng seed (Autocomplete + PAA)..." });
          let expandedSeeds: string[] = [];
          try {
            expandedSeeds = await expandSeeds(seeds, serpGround, locale);
            if (mode === "deep" && expandedSeeds.length > 0) {
              send("progress", { pct: 40, message: `Mở rộng seed vòng 2 (từ ${Math.min(5, expandedSeeds.length)} biến thể)...` });
              const round2Seeds = expandedSeeds.slice(0, 5);
              const round2Serp: Record<string, any[]> = {};
              await Promise.all(round2Seeds.map(async (s) => { round2Serp[s] = await firecrawlSearch(s); }));
              const round2 = await expandSeeds(round2Seeds, round2Serp, locale);
              const merged = new Set([...expandedSeeds, ...round2]);
              expandedSeeds = Array.from(merged).slice(0, 15);
            }
            // Modifier expansion (best/price/2026/audience/format) — verified qua Google Suggest
            send("progress", { pct: 42, message: "Mở rộng theo modifier (best/giá/2026/cho ai)..." });
            const modSeeds = await expandWithModifiers(seeds, locale, mode === "deep" ? 20 : 10);
            if (modSeeds.length) {
              const merged = new Set([...expandedSeeds, ...modSeeds]);
              expandedSeeds = Array.from(merged).slice(0, mode === "deep" ? 25 : 15);
            }
          } catch (e) {
            console.warn("[keyword-research-v2] expand seeds failed:", (e as Error).message);
          }
          if (expandedSeeds.length) {
            send("expanded_seeds", { seeds: expandedSeeds });
          }

          // 4. AI generate (with heartbeat to keep SSE stream alive through proxies)
          send("progress", { pct: 50, message: `AI sinh ${limit} keyword${brandCtx ? " (brand-aware)" : ""}...` });
          let hbPct = 50;
          const hb = setInterval(() => {
            try {
              // ticker progress 50 → 78 trong lúc chờ AI
              hbPct = Math.min(78, hbPct + 2);
              send("progress", { pct: hbPct, message: `AI đang sinh keyword... (${hbPct}%)` });
              // SSE comment để chống buffering
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch { /* stream closed */ }
          }, 5000);
          let suggestions: KeywordSuggestion[] = [];
          // Brand domination: prepend hardcoded brand patterns BEFORE AI call
          const dominationSeeds: KeywordSuggestion[] = [];
          if (preset === "brand_domination" && brandCtx?.brand_name) {
            const dom = generateBrandDominationSeeds(brandCtx.brand_name, brandCtx.main_competitors || []);
            for (const d of dom) {
              dominationSeeds.push({
                keyword: d.keyword,
                search_volume: 0, // unknown — enrichment job sẽ fill
                difficulty: 10, // brand keyword usually easy
                cpc_vnd: 0,
                intent: d.intent,
                funnel_stage: d.funnel_stage,
                cluster_name: "Brand",
                rationale: "Brand domination pattern (auto-generated)",
                source_seed: brandCtx.brand_name,
                brand_fit_score: 100,
                audience_match: "core",
              });
            }
          }
          try {
            const r = await callAI(supabase, organizationId, user.id, seeds, expandedSeeds, serpGround, competitorContext, preset, locale, limit, brandCtx);
            suggestions = r.suggestions;
          } finally {
            clearInterval(hb);
          }
          // Merge domination seeds (dedupe by keyword)
          if (dominationSeeds.length) {
            const seen = new Set(suggestions.map((s) => s.keyword.toLowerCase().trim()));
            for (const d of dominationSeeds) {
              if (!seen.has(d.keyword)) { suggestions.unshift(d); seen.add(d.keyword); }
            }
          }
          if (!suggestions.length) throw new Error("AI không trả keyword nào");

          // 5. Gap detection + brand fit filter + final score
          send("progress", { pct: 80, message: "Gap analysis + brand fit scoring..." });
          // Pro SEO formula: Priority = (relevance × intent_weight × log10(volume+10)) / sqrt(difficulty+1)
          const intentWeight = { transactional: 4, commercial: 3, navigational: 2, informational: 1 } as any;
          const computePriority = (e: any) => {
            const vol = Math.max(0, e.search_volume || 0);
            const kd = Math.min(100, Math.max(0, e.difficulty || 50));
            const iw = intentWeight[e.intent || "informational"] ?? 1;
            const rel = Math.max(0, Math.min(100, e.brand_fit_score ?? 50));
            const raw = (rel * iw * Math.log10(vol + 10)) / Math.sqrt(kd + 1);
            // Normalize to 0-100 (empirical max ~ 100 * 4 * 4.7 / 1 ≈ 1880)
            return Math.round(Math.min(100, (raw / 18.8)));
          };
          const keywords = suggestions.map(s => s.keyword.toLowerCase().trim());
          const { data: existing } = await supabase.from("seo_keywords")
            .select("keyword").eq("organization_id", organizationId).in("keyword", keywords);
          const existingSet = new Set((existing || []).map((r: any) => r.keyword));
          // Build social-alignment lookup (lowercased)
          const socialTerms = new Set<string>();
          const ssCtx = brandCtx?.social_signals;
          if (ssCtx) {
            ssCtx.recent_topics.forEach(t => t && socialTerms.add(t.toLowerCase()));
            ssCtx.frequent_terms.forEach(t => t && socialTerms.add(t.toLowerCase()));
            ssCtx.recent_hashtags.forEach(t => t && socialTerms.add(t.replace(/^#/, "").toLowerCase()));
          }
          let enriched = suggestions.map(s => {
            const e: any = { ...s, keyword: s.keyword.toLowerCase().trim(), is_gap: !existingSet.has(s.keyword.toLowerCase().trim()) };
            const priority = computePriority(e);
            let fit = typeof e.brand_fit_score === "number" ? e.brand_fit_score : (brandCtx ? 50 : 70);
            // Social alignment bonus: keyword chứa term từ social footprint → +15 (cap 100)
            let socialMatch: string | null = null;
            if (socialTerms.size) {
              for (const term of socialTerms) {
                if (term.length >= 3 && e.keyword.includes(term)) { socialMatch = term; break; }
              }
              if (socialMatch) fit = Math.min(100, fit + 15);
            }
            e.brand_fit_score = fit;
            e.social_match = socialMatch;
            // Blend: 60% volume/KD/intent + 40% brand fit (only when brand context exists)
            e.final_score = brandCtx ? Math.round(priority * 0.6 + fit * 0.4) : priority;
            return e;
          });
          // Filter off-brand unless competitor_gaps preset
          if (brandCtx && preset !== "competitor_gaps") {
            const before = enriched.length;
            enriched = enriched.filter(e => (e.brand_fit_score ?? 50) >= 40);
            if (before !== enriched.length) console.log(`[keyword-research-v2] filtered ${before - enriched.length} off-brand keywords`);
          }
          // Sort by final_score desc for streaming order
          enriched.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));

          // Stream batches of 5 to FE
          for (let i = 0; i < enriched.length; i += 5) {
            send("keyword_batch", { batch: enriched.slice(i, i + 5), index: i, total: enriched.length });
          }

          // 6a. Auto-insert into seo_keywords if deep mode
          let inserted = 0;
          if (mode === "deep") {
            send("progress", { pct: 90, message: `Đang lưu ${enriched.length} keyword vào pool...` });
            // Find clusters by pillar_match name (best-effort) — only for this org
            const pillarNames = Array.from(new Set(enriched.map(e => (e.pillar_match || "").trim()).filter(Boolean)));
            const clusterMap = new Map<string, string>(); // lowercased name -> id
            if (pillarNames.length) {
              const { data: clusters } = await supabase
                .from("seo_clusters").select("id,name").eq("organization_id", organizationId);
              for (const c of (clusters || [])) clusterMap.set(String(c.name).toLowerCase().trim(), c.id);
            }
            // Only insert keywords that aren't already in the pool
            const toInsert = enriched.filter(e => e.is_gap).map(e => ({
              organization_id: organizationId,
              keyword: e.keyword,
              search_volume: e.search_volume || null,
              difficulty: e.difficulty || null,
              cpc_vnd: e.cpc_vnd || null,
              intent: e.intent || null,
              funnel_stage: e.funnel_stage || null,
              priority_score: e.final_score ?? computePriority(e),
              status: "new",
              source: "ai_research",
              locale,
              cluster_id: clusterMap.get((e.pillar_match || "").toLowerCase().trim()) || null,
            }));
            if (toInsert.length) {
              // Insert in chunks of 50 to be safe
              for (let i = 0; i < toInsert.length; i += 50) {
                const chunk = toInsert.slice(i, i + 50);
                const { error: insErr, count } = await supabase.from("seo_keywords")
                  .insert(chunk, { count: "exact" });
                if (insErr) console.warn("[keyword-research-v2] insert chunk failed:", insErr.message);
                else inserted += (count ?? chunk.length);
              }
            }
          }

          // 6b. Save job result
          await supabase.from("keyword_research_jobs").update({
            preview: enriched,
            serp_grounding: serpGround,
            result: { suggestions: enriched.length, gaps: enriched.filter(e => e.is_gap).length, hasFirecrawl: !!FIRECRAWL_API_KEY, expandedSeeds, brandTemplateId: brandTemplateId || null, mode, inserted, seedStrategy, brandFitAvg: brandCtx ? Math.round(enriched.reduce((s, e) => s + (e.brand_fit_score || 0), 0) / Math.max(1, enriched.length)) : null },
            status: mode === "deep" ? "done" : "preview_ready",
            keywords_added: inserted,
            completed_at: mode === "deep" ? new Date().toISOString() : null,
          }).eq("id", jobId);

          send("done", { jobId, total: enriched.length, gaps: enriched.filter(e => e.is_gap).length, inserted, mode });
        } catch (e: any) {
          console.error("[keyword-research-v2] Error:", e);
          const status = e.status === 429 ? 429 : e.status === 402 ? 402 : 500;
          await supabase.from("keyword_research_jobs").update({
            status: "failed",
            error_message: e.message || String(e),
            completed_at: new Date().toISOString(),
          }).eq("id", jobId);
          send("error", { message: e.message || "Unknown", status });
        } finally {
          controller.close();
        }
      };
      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(work());
      } else {
        work();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
  });
});
