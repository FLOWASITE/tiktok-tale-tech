// Shared brand extractor — reads raw markdown / fanpage payload and asks AI
// to produce a structured brand suggestion blob the UI can apply field-by-field.
//
// Usage:
//   import { extractBrandSuggestions } from "../_shared/brand-extractor.ts";
//   const result = await extractBrandSuggestions({
//     source: "website" | "fanpage",
//     content: "<markdown / page bio + posts>",
//     locale: "vi",
//     organizationId,
//   });

import { callAI } from "./ai-provider.ts";

export interface BrandSuggestion {
  brand_name?: string | null;
  tagline?: string | null;
  mission?: string | null;
  industry_suggestion?: string | null;
  target_audience?: {
    age_range?: string | null;
    gender?: string | null;
    locations?: string[] | null;
  } | null;
  tone_of_voice?: string[] | null;
  content_pillars?: Array<{ name: string; description?: string }> | null;
  usps?: string[] | null;
  sample_texts?: string[] | null;
  primary_color_suggestion?: string | null;
  footer_info?: {
    company_name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    tax_code?: string | null;
  } | null;
}

const SYSTEM_PROMPT = `You are a senior brand strategist. You read raw website / social-page content and extract a structured brand profile.

Rules:
- Output ONLY by calling the provided tool 'extract_brand'. Never write prose.
- All free-text values MUST be in the user's locale (default Vietnamese).
- Be conservative: if a field is not clearly evidenced in the source, return null / empty array. Do NOT invent.
- tone_of_voice: 3-5 short labels (e.g. "Chuyên nghiệp", "Ấm áp", "Hài hước").
- content_pillars: 3-5 items, each with a short name + 1-sentence description.
- usps: 3-5 concrete unique selling points pulled from the source.
- sample_texts: 3-5 short paragraphs (40-180 chars each) pulled verbatim or lightly cleaned from the source — these will train brand voice cloning.
- primary_color_suggestion: ONLY when the source clearly hints at a brand colour (industry mood, explicit colour mentions, visual language). Return a 7-char lowercase hex like "#dd0707". If unsure, return null. Never invent a random colour.
- footer_info: extract company info from the legal/contact section at the bottom of the page (footer). NEVER invent phone numbers, emails, addresses, or tax codes — return null if not clearly evidenced. company_name = full legal company name (e.g. "Công ty TNHH ABC"). address = head office street address.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "extract_brand",
    description: "Return a structured brand profile derived from the source content.",
    parameters: {
      type: "object",
      properties: {
        brand_name: { type: ["string", "null"] },
        tagline: { type: ["string", "null"] },
        mission: { type: ["string", "null"] },
        industry_suggestion: { type: ["string", "null"] },
        target_audience: {
          type: ["object", "null"],
          properties: {
            age_range: { type: ["string", "null"] },
            gender: { type: ["string", "null"], enum: [null, "male", "female", "all", "Nam", "Nữ", "Tất cả"] },
            locations: { type: "array", items: { type: "string" } },
          },
        },
        tone_of_voice: { type: "array", items: { type: "string" } },
        content_pillars: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name"],
          },
        },
        usps: { type: "array", items: { type: "string" } },
        sample_texts: { type: "array", items: { type: "string" } },
        primary_color_suggestion: { type: ["string", "null"] },
      },
    },
  },
};

function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : null;
}

export interface ExtractProgressEvent {
  type: "model_attempt" | "model_fallback";
  model: string;
  attempt: number;
  total: number;
  reason?: string;
}

export interface ExtractInput {
  source: "website" | "fanpage";
  content: string;
  locale?: string;
  organizationId?: string;
  hint?: string; // e.g. domain, page name
  onProgress?: (e: ExtractProgressEvent) => void;
}

export async function extractBrandSuggestions(
  input: ExtractInput,
): Promise<{ success: boolean; suggestion?: BrandSuggestion; error?: string }> {
  const locale = input.locale || "vi";
  // Truncate to ~12k chars to stay within token budget
  const truncated = (input.content || "").slice(0, 12000);

  if (!truncated.trim()) {
    return { success: false, error: "Empty source content" };
  }

  const userPrompt = [
    `Source type: ${input.source}`,
    input.hint ? `Source hint: ${input.hint}` : null,
    `Output locale: ${locale === "vi" ? "Vietnamese" : locale}`,
    "",
    "=== SOURCE CONTENT ===",
    truncated,
    "=== END SOURCE ===",
    "",
    "Now call the extract_brand tool with the structured profile.",
  ].filter(Boolean).join("\n");

  // Try primary model + multi-provider fallbacks (DashScope/Alibaba → Lovable Gateway)
  // to survive 402/429 quota errors from any single provider.
  const FALLBACK_MODELS = [
    undefined,                       // primary từ admin config (default qwen-plus)
    "qwen-turbo",                    // DashScope rẻ hơn, cùng provider
    "google/gemini-2.5-flash",       // sang Lovable Gateway
    "google/gemini-2.5-flash-lite",  // Lovable Gateway tier rẻ nhất
  ];

  let result: any = null;
  let lastError = "";
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelOverride = FALLBACK_MODELS[i];
    const modelLabel = modelOverride || "primary";
    try {
      input.onProgress?.({
        type: i === 0 ? "model_attempt" : "model_fallback",
        model: modelLabel,
        attempt: i + 1,
        total: FALLBACK_MODELS.length,
        reason: i === 0 ? undefined : lastError,
      });
    } catch { /* ignore */ }
    result = await callAI({
      functionName: "import-brand-extractor",
      organizationId: input.organizationId,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL_SCHEMA],
      toolChoice: { type: "function", function: { name: "extract_brand" } },
      ...(modelOverride ? { modelOverride } : {}),
    } as any);
    if (result.success) break;
    lastError = result.error || "";
    const isQuota = /402|429|quota|payment|rate limit/i.test(lastError);
    if (!isQuota) break;
    console.warn(`[brand-extractor] model failed (${modelLabel}): ${lastError} — trying next`);
  }

  if (!result?.success) {
    const isQuota = /402|429|quota|payment|rate limit/i.test(lastError);
    return {
      success: false,
      error: isQuota ? "AI_QUOTA_EXHAUSTED" : (lastError || "AI extraction failed"),
    };
  }

  // Try to find tool call args in the response
  const data: any = result.data;
  let args: any = null;

  // Common shapes from Lovable Gateway / OpenAI
  const choice = data?.choices?.[0];
  const toolCalls = choice?.message?.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    try {
      args = JSON.parse(toolCalls[0].function?.arguments ?? "{}");
    } catch (e) {
      console.error("[brand-extractor] tool args parse error", e);
    }
  }

  // Gemini may return tool args in different shape; try fallback
  if (!args && data?.tool_calls?.[0]?.function?.arguments) {
    try {
      args = JSON.parse(data.tool_calls[0].function.arguments);
    } catch { /* ignore */ }
  }

  // Last resort: parse JSON from message content
  if (!args && typeof choice?.message?.content === "string") {
    const match = choice.message.content.match(/\{[\s\S]*\}/);
    if (match) {
      try { args = JSON.parse(match[0]); } catch { /* ignore */ }
    }
  }

  if (!args || typeof args !== "object") {
    return { success: false, error: "AI returned no structured suggestion" };
  }

  // Sanitize / clamp
  const suggestion: BrandSuggestion = {
    brand_name: trimOrNull(args.brand_name),
    tagline: trimOrNull(args.tagline),
    mission: trimOrNull(args.mission),
    industry_suggestion: trimOrNull(args.industry_suggestion),
    target_audience: args.target_audience && typeof args.target_audience === "object"
      ? {
        age_range: trimOrNull(args.target_audience.age_range),
        gender: trimOrNull(args.target_audience.gender),
        locations: arrayOfStrings(args.target_audience.locations).slice(0, 8),
      }
      : null,
    tone_of_voice: arrayOfStrings(args.tone_of_voice).slice(0, 6),
    content_pillars: Array.isArray(args.content_pillars)
      ? args.content_pillars
        .filter((p: any) => p && typeof p.name === "string" && p.name.trim())
        .slice(0, 6)
        .map((p: any) => ({
          name: String(p.name).trim().slice(0, 120),
          description: typeof p.description === "string" ? p.description.trim().slice(0, 280) : undefined,
        }))
      : [],
    usps: arrayOfStrings(args.usps).slice(0, 6).map((s) => s.slice(0, 200)),
    sample_texts: arrayOfStrings(args.sample_texts).slice(0, 6).map((s) => s.slice(0, 400)),
    primary_color_suggestion: normalizeHex(args.primary_color_suggestion),
  };

  return { success: true, suggestion };
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim());
}
