import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

// AI-driven channel & frequency suggestion. Reads full campaign context
// (objectives, duration, target_post_count, brand industry/voice/audience,
// available connections, season) and asks LLM to pick 3-6 channels with
// per-channel frequency. Falls back to rule-based scoring on failure.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CHANNEL_IDS = [
  "website", "blogger", "wordpress", "shopify", "wix", "medium", "email",
  "facebook", "instagram", "linkedin", "twitter", "threads", "bluesky",
  "pinterest", "telegram", "zalo", "google_maps",
] as const;
type ChannelId = typeof VALID_CHANNEL_IDS[number];

const VALID_FREQ = ["2/day", "daily", "5/week", "4/week", "3/week", "2/week", "weekly", "bi-weekly"] as const;
type Freq = typeof VALID_FREQ[number];

// Frequency → posts per week (for math + fallback derivation)
const FREQ_PER_WEEK: Record<Freq, number> = {
  "2/day": 14, "daily": 7, "5/week": 5, "4/week": 4, "3/week": 3,
  "2/week": 2, "weekly": 1, "bi-weekly": 0.5,
};

const LONGFORM_IDS = new Set(["website", "blogger", "wordpress", "medium", "shopify", "wix", "email"]);
const MESSAGING_IDS = new Set(["zalo", "telegram", "google_maps"]);

function pickFreqLabel(perWeek: number, channelId: ChannelId): Freq {
  // Clamp per channel medium
  let p = perWeek;
  if (LONGFORM_IDS.has(channelId)) p = Math.min(p, 1);
  else if (MESSAGING_IDS.has(channelId)) p = Math.min(p, 2);
  else p = Math.min(p, 14);

  // Nearest band
  const bands: Array<[Freq, number]> = [
    ["2/day", 14], ["daily", 7], ["5/week", 5], ["4/week", 4],
    ["3/week", 3], ["2/week", 2], ["weekly", 1], ["bi-weekly", 0.5],
  ];
  let best: Freq = "weekly"; let bestDiff = Infinity;
  for (const [label, val] of bands) {
    const d = Math.abs(val - p);
    if (d < bestDiff) { bestDiff = d; best = label; }
  }
  return best;
}

const MIN_CHANNELS = 3;
const MAX_CHANNELS = 6;

interface SuggestedChannel { id: ChannelId; frequency: Freq; reason?: string; }

// ─── Rule-based scoring (used as fallback + hint for LLM) ───
const OBJECTIVE_SCORES: Record<string, Partial<Record<ChannelId, number>>> = {
  awareness:  { facebook: 90, instagram: 85, threads: 70, pinterest: 70, linkedin: 40, blogger: 50, wordpress: 50, website: 55, zalo: 60, twitter: 65, bluesky: 55 },
  engagement: { instagram: 95, facebook: 85, threads: 80, twitter: 75, linkedin: 60, zalo: 65, telegram: 70, pinterest: 50 },
  traffic:    { website: 95, blogger: 90, wordpress: 90, medium: 80, pinterest: 75, linkedin: 70, facebook: 60, email: 70 },
  leads:      { linkedin: 95, website: 90, blogger: 80, wordpress: 80, email: 90, facebook: 70, zalo: 75 },
  conversion: { facebook: 90, instagram: 85, website: 85, shopify: 95, blogger: 75, email: 85, google_maps: 70, zalo: 80, linkedin: 75 },
  revenue:    { shopify: 95, facebook: 85, instagram: 85, email: 85, website: 80, google_maps: 70, zalo: 75 },
  retention:  { email: 95, zalo: 90, telegram: 80, blogger: 70, facebook: 60 },
  community:  { threads: 90, telegram: 85, facebook: 80, instagram: 75, twitter: 70, bluesky: 65 },
};

const DEFAULT_FREQ: Record<ChannelId, Freq> = {
  website: "weekly", blogger: "weekly", wordpress: "weekly", medium: "weekly",
  shopify: "weekly", wix: "weekly", email: "weekly",
  facebook: "3/week", instagram: "3/week", linkedin: "2/week", twitter: "daily",
  threads: "3/week", bluesky: "weekly", pinterest: "2/week", telegram: "weekly",
  zalo: "weekly", google_maps: "weekly",
};

const REASONS: Partial<Record<ChannelId, string>> = {
  facebook: "Reach rộng tại VN", instagram: "Visual-first audience",
  linkedin: "B2B professional reach", website: "SEO + thought leadership",
  blogger: "Long-form SEO", wordpress: "Long-form SEO",
  email: "Nurture & retention", pinterest: "Discovery visual search",
  zalo: "Customer messaging VN", threads: "Community conversation",
  twitter: "Realtime updates", shopify: "Commerce content",
  google_maps: "Local SEO + reviews", telegram: "Direct broadcast",
  medium: "Thought leadership", bluesky: "Early adopter community",
  wix: "Owned site",
};

function classifyIndustry(industry: string, description: string): "beauty" | "b2b" | "local" | "ecommerce" | "general" {
  const s = (industry + " " + description).toLowerCase();
  if (/(beauty|cosmetic|fashion|lifestyle|mỹ phẩm|thẩm mỹ|làm đẹp|thời trang|spa)/.test(s)) return "beauty";
  if (/(saas|b2b|consult|finance|legal|software|enterprise|tài chính|luật|công nghệ)/.test(s)) return "b2b";
  if (/(clinic|restaurant|store|local|cafe|nhà hàng|phòng khám|cửa hàng)/.test(s)) return "local";
  if (/(ecommerce|shop|retail|bán hàng|thương mại)/.test(s)) return "ecommerce";
  return "general";
}

function applyIndustryModifier(scores: Map<ChannelId, number>, industryClass: string) {
  const bump = (id: ChannelId, delta: number) => {
    if (scores.has(id)) scores.set(id, Math.max(0, scores.get(id)! + delta));
  };
  switch (industryClass) {
    case "beauty":
      bump("instagram", 15); bump("pinterest", 10); bump("facebook", 5); bump("linkedin", -25);
      break;
    case "b2b":
      bump("linkedin", 20); bump("blogger", 10); bump("wordpress", 10); bump("website", 10); bump("email", 5);
      bump("instagram", -15); bump("threads", -10);
      break;
    case "local":
      bump("facebook", 10); bump("google_maps", 25); bump("zalo", 15); bump("linkedin", -20);
      break;
    case "ecommerce":
      bump("shopify", 20); bump("instagram", 10); bump("facebook", 10); bump("email", 10);
      break;
  }
}

function scoreChannels(opts: {
  objectives: string[];
  industryClass: string;
  available: Set<ChannelId>;
  postsPerWeek?: number;
  avoidIds?: Set<ChannelId>;
  jitterSeed?: number;
}): SuggestedChannel[] {
  const { objectives, industryClass, available, postsPerWeek = 0, avoidIds, jitterSeed = 0 } = opts;
  const objs = objectives.length > 0 ? objectives : ["awareness"];
  const weights = [1.0, 0.6, 0.4];
  const scores = new Map<ChannelId, number>();

  objs.forEach((rawObj, idx) => {
    const obj = rawObj.toLowerCase().trim();
    const table = OBJECTIVE_SCORES[obj] || OBJECTIVE_SCORES.awareness!;
    const w = weights[Math.min(idx, weights.length - 1)];
    for (const [cid, base] of Object.entries(table)) {
      const id = cid as ChannelId;
      scores.set(id, (scores.get(id) || 0) + (base || 0) * w);
    }
  });

  applyIndustryModifier(scores, industryClass);

  // Diversity: penalize channels heavily used in recent campaigns (~−18 each)
  if (avoidIds && avoidIds.size > 0) {
    for (const id of avoidIds) {
      if (scores.has(id)) scores.set(id, Math.max(0, scores.get(id)! - 18));
    }
  }

  // Deterministic jitter (±6) seeded per run → break ties differently each call
  let seed = jitterSeed | 0;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const id of Array.from(scores.keys())) {
    scores.set(id, scores.get(id)! + (rng() - 0.5) * 12);
  }

  let entries = Array.from(scores.entries());
  if (available.size > 0) entries = entries.filter(([id]) => available.has(id));
  entries.sort((a, b) => b[1] - a[1]);

  const picked = entries.filter(([, s]) => s > 25).slice(0, 5);
  const total = picked.reduce((s, [, v]) => s + v, 0) || 1;

  return picked.map(([id, val]) => {
    let freq: Freq;
    if (postsPerWeek > 0) {
      const share = val / total;
      const channelPerWeek = Math.max(0.5, share * postsPerWeek);
      freq = pickFreqLabel(channelPerWeek, id);
    } else {
      freq = DEFAULT_FREQ[id];
    }
    return { id, frequency: freq, reason: REASONS[id] };
  });
}

// Qualitative channel context — no numeric scores so LLM không bị anchor
const CHANNEL_STRENGTHS: Partial<Record<ChannelId, string>> = {
  facebook: "reach rộng VN, group/community, mid-funnel",
  instagram: "visual-first, lifestyle/beauty, story+reel",
  linkedin: "B2B authority, thought leadership, lead gen cao cấp",
  threads: "conversational community, organic discovery",
  twitter: "realtime, news jacking, tech audience",
  bluesky: "early adopter, dev/creative niche",
  pinterest: "evergreen discovery, search-driven visual",
  telegram: "broadcast 1-many, loyal subscribers",
  zalo: "messaging VN, customer care, local retail",
  google_maps: "local SEO, reviews, foot traffic",
  website: "owned media, SEO long-form, conversion landing",
  blogger: "long-form SEO ngách, low-cost test",
  wordpress: "long-form SEO chuyên sâu, content hub",
  medium: "thought leadership cross-audience",
  shopify: "commerce content, product storytelling",
  wix: "owned site nhẹ, portfolio",
  email: "nurture/retention, owned 1:1, conversion mạnh",
};

function buildQualitativeChannelBlock(available: Set<ChannelId>): string {
  const ids = available.size > 0
    ? Array.from(available)
    : (Object.keys(CHANNEL_STRENGTHS) as ChannelId[]);
  return ids
    .filter((id) => CHANNEL_STRENGTHS[id])
    .map((id) => `- ${id}: ${CHANNEL_STRENGTHS[id]}`)
    .join("\n");
}

async function fetchRecentChannelUsage(
  supabase: ReturnType<typeof createClient>,
  brandTemplateId?: string,
  organizationId?: string,
): Promise<{ avoidIds: Set<ChannelId>; recentSignatures: string[] }> {
  const avoidIds = new Set<ChannelId>();
  const recentSignatures: string[] = [];
  try {
    let q = supabase
      .from("agent_goals")
      .select("target_channels, frequency, name, created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    if (brandTemplateId) q = q.eq("brand_template_id", brandTemplateId);
    else if (organizationId) q = q.eq("organization_id", organizationId);
    else return { avoidIds, recentSignatures };

    const { data } = await q;
    if (!Array.isArray(data)) return { avoidIds, recentSignatures };

    const counts = new Map<ChannelId, number>();
    for (const row of data as any[]) {
      const chans = Array.isArray(row?.target_channels) ? row.target_channels : [];
      for (const c of chans) {
        const id = String(c).toLowerCase() as ChannelId;
        if (VALID_CHANNEL_IDS.includes(id)) {
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
      const freqObj = row?.frequency && typeof row.frequency === "object" ? row.frequency : {};
      const sig = chans
        .map((c: string) => `${c}:${freqObj[c] || "?"}`)
        .join(", ");
      if (sig) recentSignatures.push(`"${row?.name || "campaign"}" → ${sig}`);
    }
    // Avoid channels used in ≥2 of last 3 campaigns
    for (const [id, n] of counts) if (n >= 2) avoidIds.add(id);
  } catch { /* ignore */ }
  return { avoidIds, recentSignatures };
}

function getSeasonHint(): string {
  const m = new Date().getMonth() + 1; // 1-12
  if (m === 12 || m === 1) return "Cuối năm / Tết — mùa shopping, gift, year-end review";
  if (m >= 2 && m <= 4) return "Đầu năm / Q1 — kế hoạch mới, comeback, spring";
  if (m >= 5 && m <= 7) return "Giữa năm / hè — du lịch, summer sale";
  if (m >= 8 && m <= 10) return "Q3-Q4 — back-to-school, lễ hội mùa thu";
  return "Cuối năm";
}

interface LLMChannel { id: string; frequency: string; reason?: string }
interface LLMResult { channels: LLMChannel[]; reasoning: string }

function validateLLMResult(
  parsed: any,
  available: Set<ChannelId>,
): { channels: SuggestedChannel[]; reasoning: string } | null {
  if (!parsed || !Array.isArray(parsed.channels)) return null;
  const seen = new Set<string>();
  const out: SuggestedChannel[] = [];
  for (const raw of parsed.channels as LLMChannel[]) {
    const id = String(raw?.id || "").toLowerCase().trim() as ChannelId;
    const freq = String(raw?.frequency || "").toLowerCase().trim() as Freq;
    if (!VALID_CHANNEL_IDS.includes(id)) continue;
    if (!VALID_FREQ.includes(freq)) continue;
    if (seen.has(id)) continue;
    if (available.size > 0 && !available.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      frequency: freq,
      reason: typeof raw.reason === "string" ? raw.reason.trim().slice(0, 140) : REASONS[id],
    });
    if (out.length >= MAX_CHANNELS) break;
  }
  if (out.length < MIN_CHANNELS) return null;
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim().slice(0, 240) : "";
  return { channels: out, reasoning };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const title: string = body.title || "";
    const description: string = body.description || "";
    const objectives: string[] = Array.isArray(body.objectives) ? body.objectives.filter((o: unknown) => typeof o === "string") : [];
    const brandTemplateId: string | undefined = body.brand_template_id;
    const organizationId: string | undefined = body.organization_id;
    let industry: string = body.industry || "";
    const brandName: string = body.brand_name || "";
    const durationDays: number = Number(body.campaign_duration_days) || 0;
    const targetPostCount: number = Number(body.target_post_count) || 0;
    const audience: string = body.audience || "";

    const availableInput: string[] = Array.isArray(body.available_connections) ? body.available_connections : [];
    const available = new Set<ChannelId>(
      availableInput
        .map((c) => String(c).toLowerCase().trim())
        .filter((c): c is ChannelId => VALID_CHANNEL_IDS.includes(c as ChannelId)),
    );

    if (!description?.trim() && !title?.trim() && objectives.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cần có tên, mô tả hoặc mục tiêu chiến dịch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Enrich brand context if missing
    let toneOfVoice = "";
    let brandPositioning = "";
    let targetAudienceCtx = audience;
    if (brandTemplateId) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry, tone_of_voice, brand_positioning, target_audience")
          .eq("id", brandTemplateId)
          .maybeSingle();
        if (brand) {
          if (!industry) {
            const ind = Array.isArray((brand as any).industry) ? (brand as any).industry[0] : (brand as any).industry;
            industry = ind || "";
          }
          toneOfVoice = (brand as any).tone_of_voice || "";
          brandPositioning = (brand as any).brand_positioning || "";
          if (!targetAudienceCtx) targetAudienceCtx = (brand as any).target_audience || "";
        }
      } catch { /* ignore */ }
    }

    const industryClass = classifyIndustry(industry, description || title);

    // Diversity context: avoid repeating recent campaign channel mix
    const { avoidIds, recentSignatures } = await fetchRecentChannelUsage(
      supabase,
      brandTemplateId,
      organizationId,
    );

    // Per-run jitter seed → break ties differently each call
    const jitterSeed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

    const durationWeeks = durationDays > 0 ? Math.max(1, Math.round(durationDays / 7)) : 0;
    const postsPerWeekTarget = (targetPostCount > 0 && durationWeeks > 0)
      ? Math.round((targetPostCount / durationWeeks) * 10) / 10
      : 0;

    const fallbackRun = () => {
      let channels = scoreChannels({
        objectives, industryClass, available,
        postsPerWeek: postsPerWeekTarget, avoidIds, jitterSeed,
      });
      if (channels.length === 0) {
        channels = scoreChannels({
          objectives, industryClass, available: new Set(),
          postsPerWeek: postsPerWeekTarget, avoidIds, jitterSeed,
        }).slice(0, 3);
      }
      return channels;
    };

    const availableList = available.size > 0 ? Array.from(available).join(", ") : "(chưa khai báo — pick theo objective/industry)";
    const channelContextBlock = buildQualitativeChannelBlock(available);
    const recentBlock = recentSignatures.length > 0
      ? recentSignatures.map((s, i) => `- [${i + 1}] ${s}`).join("\n")
      : "(chưa có campaign trước — free pick)";
    const avoidList = avoidIds.size > 0 ? Array.from(avoidIds).join(", ") : "(không có)";

    const prompt = `Bạn là chuyên gia marketing đa kênh tại Việt Nam. Chọn KÊNH + TẦN SUẤT đăng cho campaign cụ thể bên dưới. Mỗi lần chọn phải khác nhau dựa trên context — KHÔNG dùng preset cố định.

CAMPAIGN CONTEXT
- Tên: ${title || "(chưa có)"}
- Mô tả: ${description || "(chưa có)"}
- Mục tiêu: ${objectives.length > 0 ? `${objectives.join(", ")} — primary: ${objectives[0]}` : "awareness"}
- Thời lượng: ${durationDays > 0 ? `${durationDays} ngày (~${durationWeeks} tuần)` : "(chưa rõ)"}
- Số bài mục tiêu: ${targetPostCount > 0 ? `${targetPostCount} bài${postsPerWeekTarget > 0 ? ` (~${postsPerWeekTarget} bài/tuần tổng)` : ""}` : "(chưa rõ)"}
- Mùa vụ: ${getSeasonHint()}
- Run seed: ${jitterSeed} (dùng để đảm bảo mỗi lần gọi sinh kết quả khác nhau)

BRAND CONTEXT
- Brand: ${brandName || "(chưa có)"} | Industry: ${industry || "general"} (class: ${industryClass})
- Tone: ${toneOfVoice || "(chưa có)"}
- Positioning: ${brandPositioning || "(chưa có)"}
- Audience: ${targetAudienceCtx || "(chưa có)"}

AVAILABLE CONNECTIONS (chỉ pick từ list này nếu có)
${availableList}

CHANNEL STRENGTHS (định tính, KHÔNG có điểm số — pick dựa trên fit thật)
${channelContextBlock}

DIVERSITY CONTEXT — 3 campaign gần nhất của brand:
${recentBlock}
→ Kênh BỊ LẠM DỤNG (xuất hiện ≥2 lần): ${avoidList}
→ Ưu tiên thêm ít nhất 1 kênh KHÁC với danh sách trên, trừ khi objective bắt buộc.

YÊU CẦU
1. Chọn ${MIN_CHANNELS}–${MAX_CHANNELS} kênh phù hợp NHẤT. Đa dạng medium (long-form + social + messaging).
2. Chỉ chọn từ available_connections nếu có; rỗng thì free pick.
3. TẦN SUẤT phải TÍNH từ duration × target_post_count, KHÔNG copy preset:
   - Tổng bài/tuần across all channels ≈ ${postsPerWeekTarget > 0 ? postsPerWeekTarget : "phù hợp"}.
   - Phân bổ theo weight thực tế của channel cho objective này (vd: kênh chính 40-50%, phụ 15-25%).
   - Long-form (website/blogger/wordpress/medium/shopify/wix/email): tối đa "weekly" (hoặc "bi-weekly" nếu deep content).
   - Social (twitter/threads/instagram/facebook/linkedin/bluesky/pinterest): "2/day" → "weekly" tuỳ tổng bài.
   - Messaging (zalo/telegram/google_maps): "weekly" → "2/week".
4. Mỗi reason phải reference context CỤ THỂ (objective + audience + brand/mùa). KHÔNG nói chung chung.
5. Reason ≤120 ký tự, tiếng Việt. Reasoning tổng 1-2 câu giải thích logic mix.
6. KHÔNG lặp lại nguyên xi mix của 3 campaign trước.

VALID channel ids: ${VALID_CHANNEL_IDS.join(", ")}
VALID frequency: ${VALID_FREQ.join(", ")}

CHỈ trả JSON:
{
  "channels": [ { "id": "facebook", "frequency": "3/week", "reason": "..." } ],
  "reasoning": "..."
}`;

    // ─── Call LLM ───
    let llmChannels: SuggestedChannel[] | null = null;
    let aiReasoning = "";
    let aiPowered = false;

    try {
      const aiResult = await callAI({
        functionName: "suggest-channels",
        organizationId,
        messages: [{ role: "user", content: prompt }],
        temperatureOverride: 0.9,
        maxTokensOverride: 900,
      } as any);

      if (aiResult?.success) {
        const content = aiResult.data?.choices?.[0]?.message?.content || "";
        let parsed: any = null;
        try { parsed = JSON.parse(content); }
        catch {
          const m = content.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
        }
        const validated = validateLLMResult(parsed, available);
        if (validated) {
          llmChannels = validated.channels;
          aiReasoning = validated.reasoning;
          aiPowered = true;
        } else {
          console.warn("[suggest-channels] LLM output invalid/empty, falling back");
        }
      } else {
        const errMsg = aiResult?.error || "";
        if (errMsg.includes("429")) {
          console.warn("[suggest-channels] 429 rate limit, falling back to rule-based");
        } else if (errMsg.includes("402")) {
          console.warn("[suggest-channels] 402 credits exhausted, falling back to rule-based");
        } else {
          console.warn("[suggest-channels] AI failed:", errMsg);
        }
      }
    } catch (e) {
      console.warn("[suggest-channels] AI exception:", (e as Error).message);
    }

    const channels = llmChannels || fallbackRun();
    const reasoning = aiReasoning
      || `Gợi ý theo ${industryClass !== "general" ? `industry "${industryClass}"` : "tổng quát"} + mục tiêu ${objectives.join(", ") || "awareness"}${avoidIds.size > 0 ? `, tránh lặp ${Array.from(avoidIds).join("/")}` : ""}.`;

    return new Response(
      JSON.stringify({
        channels,
        reasoning,
        ai_powered: aiPowered,
        diversity: {
          recent_count: recentSignatures.length,
          avoided: Array.from(avoidIds),
          seed: jitterSeed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("[suggest-channels] Error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
