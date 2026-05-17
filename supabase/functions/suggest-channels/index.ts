import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rule-based channel suggestion (no AI). Deterministic, <5ms, free.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CHANNEL_IDS = [
  "website", "blogger", "wordpress", "shopify", "wix", "medium", "email",
  "facebook", "instagram", "linkedin", "twitter", "threads", "bluesky",
  "pinterest", "telegram", "zalo", "google_maps",
] as const;
type ChannelId = typeof VALID_CHANNEL_IDS[number];

const VALID_FREQ = ["daily", "3/week", "2/week", "weekly"] as const;
type Freq = typeof VALID_FREQ[number];

const MAX_CHANNELS = 5;

interface SuggestedChannel { id: ChannelId; frequency: Freq; reason?: string; }

// Base score per (objective × channel). 0-100. Missing = 0.
const OBJECTIVE_SCORES: Record<string, Partial<Record<ChannelId, number>>> = {
  awareness:  { tiktok: 0, facebook: 90, instagram: 85, threads: 70, pinterest: 70, youtube: 0, linkedin: 40, blogger: 50, wordpress: 50, website: 55, zalo: 60, twitter: 65, bluesky: 55 },
  engagement: { instagram: 95, facebook: 85, threads: 80, twitter: 75, linkedin: 60, zalo: 65, telegram: 70, pinterest: 50 },
  traffic:    { website: 95, blogger: 90, wordpress: 90, medium: 80, pinterest: 75, linkedin: 70, facebook: 60, email: 70 },
  leads:      { linkedin: 95, website: 90, blogger: 80, wordpress: 80, email: 90, facebook: 70, zalo: 75 },
  conversion: { facebook: 90, instagram: 85, website: 85, shopify: 95, blogger: 75, email: 85, google_maps: 70, zalo: 80, linkedin: 75 },
  revenue:    { shopify: 95, facebook: 85, instagram: 85, email: 85, website: 80, google_maps: 70, zalo: 75 },
  retention:  { email: 95, zalo: 90, telegram: 80, blogger: 70, facebook: 60 },
  community:  { threads: 90, telegram: 85, facebook: 80, instagram: 75, twitter: 70, bluesky: 65 },
};

// Default frequency per channel
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
  email: "Nurture & retention", tiktok: "Short video reach",
  pinterest: "Discovery visual search", zalo: "Customer messaging VN",
  threads: "Community conversation", twitter: "Realtime updates",
  shopify: "Commerce content", google_maps: "Local SEO + reviews",
  telegram: "Direct broadcast", medium: "Thought leadership",
  bluesky: "Early adopter community", wix: "Owned site",
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
}): SuggestedChannel[] {
  const { objectives, industryClass, available } = opts;
  const objs = objectives.length > 0 ? objectives : ["awareness"];

  // Weight: primary objective (idx 0) = 1.0, subsequent = 0.6, 0.4
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

  // Filter by available connections (if provided)
  let entries = Array.from(scores.entries());
  if (available.size > 0) {
    entries = entries.filter(([id]) => available.has(id));
  }

  entries.sort((a, b) => b[1] - a[1]);

  // Take top up to MAX_CHANNELS with score > 30
  return entries
    .filter(([, s]) => s > 30)
    .slice(0, MAX_CHANNELS)
    .map(([id]) => ({
      id,
      frequency: DEFAULT_FREQ[id],
      reason: REASONS[id],
    }));
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
    const objectives: string[] = Array.isArray(body.objectives) ? body.objectives : [];
    const brandTemplateId: string | undefined = body.brand_template_id;
    let industry: string = body.industry || "";

    // available_connections: array of channel ids the user already connected
    const availableInput: string[] = Array.isArray(body.available_connections) ? body.available_connections : [];
    const available = new Set<ChannelId>(
      availableInput
        .map((c) => String(c).toLowerCase().trim())
        .filter((c): c is ChannelId => VALID_CHANNEL_IDS.includes(c as ChannelId))
    );

    if (!description?.trim() && !title?.trim() && objectives.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cần có tên, mô tả hoặc mục tiêu chiến dịch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (brandTemplateId && !industry) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("industry")
          .eq("id", brandTemplateId)
          .maybeSingle();
        if (brand) {
          const ind = Array.isArray((brand as any).industry) ? (brand as any).industry[0] : (brand as any).industry;
          industry = ind || "";
        }
      } catch { /* ignore */ }
    }

    const industryClass = classifyIndustry(industry, description || title);
    let channels = scoreChannels({ objectives, industryClass, available });

    // Fallback: if no channel matched (e.g. no connections), return top 3 ignoring availability
    if (channels.length === 0) {
      channels = scoreChannels({ objectives, industryClass, available: new Set() }).slice(0, 3);
    }

    const reasoning = `Gợi ý theo ${industryClass !== "general" ? `industry "${industryClass}"` : "tổng quát"} + mục tiêu ${objectives.join(", ") || "awareness"}.`;

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
