import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Must mirror AVAILABLE_CHANNELS ids in GoalWizard.tsx
const VALID_CHANNEL_IDS = [
  // long-form
  "website", "blogger", "wordpress", "shopify", "wix", "medium", "email",
  // social
  "facebook", "instagram", "linkedin", "twitter", "threads", "bluesky",
  "pinterest", "telegram", "zalo", "google_maps",
] as const;
type ChannelId = typeof VALID_CHANNEL_IDS[number];

const VALID_FREQ = ["daily", "3/week", "2/week", "weekly"] as const;
type Freq = typeof VALID_FREQ[number];

const MAX_CHANNELS = 5;

interface SuggestedChannel { id: ChannelId; frequency: Freq; reason?: string; }

function fallback(industry: string, objectives: string[], description: string): { channels: SuggestedChannel[]; reasoning: string } {
  const ind = (industry || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  const obj = new Set(objectives.map(o => o.toLowerCase()));

  const picks = new Map<ChannelId, SuggestedChannel>();
  const add = (id: ChannelId, frequency: Freq, reason: string) => {
    if (!picks.has(id) && picks.size < MAX_CHANNELS) picks.set(id, { id, frequency, reason });
  };

  // Industry heuristics
  if (/(beauty|cosmetic|fashion|food|travel|lifestyle|mỹ phẩm|thẩm mỹ|làm đẹp|thời trang|ẩm thực|du lịch)/.test(ind + " " + desc)) {
    add("instagram", "3/week", "Visual-first audience");
    add("facebook", "weekly", "Broad reach VN");
    add("pinterest", "weekly", "Discovery visual search");
  } else if (/(saas|b2b|consult|finance|legal|software|enterprise|tài chính|luật|công nghệ)/.test(ind + " " + desc)) {
    add("linkedin", "2/week", "B2B professional reach");
    add("website", "weekly", "SEO thought leadership");
    add("email", "weekly", "Nurture lead via newsletter");
  } else if (/(clinic|restaurant|store|local|spa|cafe|nhà hàng|phòng khám|cửa hàng)/.test(ind + " " + desc)) {
    add("facebook", "3/week", "Local community");
    add("google_maps", "weekly", "Local SEO + reviews");
    add("zalo", "weekly", "Customer messaging VN");
  } else {
    add("facebook", "weekly", "Broad reach default");
    add("website", "weekly", "Owned media");
    add("instagram", "weekly", "Visual default");
  }

  // Objective boosts
  if (obj.has("traffic") || obj.has("leads")) {
    add("website", "weekly", "Long-form for SEO & leads");
    add("email", "weekly", "Lead nurture");
  }
  if (obj.has("engagement")) {
    add("threads", "3/week", "Community conversation");
  }
  if (obj.has("revenue")) {
    add("shopify", "weekly", "Commerce content");
  }
  if (obj.has("awareness")) {
    add("instagram", "3/week", "Awareness reach");
  }

  const channels = Array.from(picks.values()).slice(0, MAX_CHANNELS);
  return {
    channels,
    reasoning: `Gợi ý theo industry "${industry || 'tổng quát'}" và mục tiêu ${objectives.join(', ') || 'chưa rõ'}.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const title: string = body.title || "";
    const description: string = body.description || "";
    const objectives: string[] = Array.isArray(body.objectives) ? body.objectives : [];
    const brandTemplateId: string | undefined = body.brand_template_id;
    const organizationId: string | undefined = body.organization_id;
    let brandName: string = body.brand_name || "";
    let industry: string = body.industry || "";

    if (!description?.trim() && !title?.trim()) {
      return new Response(
        JSON.stringify({ error: "Cần có tên hoặc mô tả chiến dịch để AI gợi ý" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (brandTemplateId && (!brandName || !industry)) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry")
          .eq("id", brandTemplateId)
          .single();
        if (brand) {
          brandName = brandName || brand.brand_name || "";
          const ind = Array.isArray(brand.industry) ? brand.industry[0] : brand.industry;
          industry = industry || ind || "";
        }
      } catch { /* ignore */ }
    }

    const fb = fallback(industry, objectives, description || title);

    const prompt = `You are a senior marketing channel strategist. Pick the BEST publishing channels for this campaign.

Campaign: "${title}"
Description: "${description || "(no extra description)"}"
Brand: "${brandName || "(unknown)"}"
Industry: "${industry || "(unknown)"}"
Objectives (primary first): ${objectives.join(", ") || "(none)"}

Available channel IDs (pick from this list only):
- Long-form: website, blogger, wordpress, shopify, wix, medium, email
- Social: facebook, instagram, linkedin, twitter, threads, bluesky, pinterest, telegram, zalo, google_maps

Frequency values: "daily" | "3/week" | "2/week" | "weekly"

RULES:
1. Pick 2 to ${MAX_CHANNELS} channels MAX — quality over quantity, avoid spreading thin.
2. Match channels to industry (visual brands → IG/Pinterest/TikTok-like; B2B → LinkedIn/Website/Email; local → FB/Google Maps/Zalo).
3. Match channels to objectives (awareness → social reach; traffic/leads → long-form + email; revenue → commerce + retargeting).
4. Suggest a realistic frequency per channel based on its native cadence (IG can do 3/week, blog usually weekly).
5. Reasoning ≤200 chars, in Vietnamese, explain why this mix fits.

Return ONLY valid JSON:
{
  "channels": [
    { "id": "<channel_id>", "frequency": "<freq>", "reason": "<short EN reason ≤40 chars>" }
  ],
  "reasoning": "..."
}
`;

    const aiResult = await callAI({
      functionName: "suggest-channels",
      organizationId,
      messages: [{ role: "user", content: prompt }],
      temperatureOverride: 0.3,
      maxTokensOverride: 800,
    });

    let parsed: any = null;
    if (aiResult.success) {
      const content = aiResult.data?.choices?.[0]?.message?.content || "";
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
      }
    } else {
      console.error("[suggest-channels] AI error:", aiResult.error);
    }

    let channels: SuggestedChannel[] = [];
    let reasoning = "";

    if (parsed && Array.isArray(parsed.channels)) {
      const seen = new Set<string>();
      for (const c of parsed.channels) {
        if (!c || typeof c !== "object") continue;
        const id = String(c.id || "").toLowerCase().trim();
        if (!VALID_CHANNEL_IDS.includes(id as ChannelId)) continue;
        if (seen.has(id)) continue;
        const freq: Freq = VALID_FREQ.includes(c.frequency) ? c.frequency : "weekly";
        const reason = typeof c.reason === "string" ? c.reason.slice(0, 60) : undefined;
        channels.push({ id: id as ChannelId, frequency: freq, reason });
        seen.add(id);
        if (channels.length >= MAX_CHANNELS) break;
      }
      reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 240) : "";
    }

    if (channels.length === 0) {
      channels = fb.channels;
      reasoning = (reasoning || fb.reasoning) + " (fallback)";
    }

    return new Response(
      JSON.stringify({ channels, reasoning }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[suggest-channels] Error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
