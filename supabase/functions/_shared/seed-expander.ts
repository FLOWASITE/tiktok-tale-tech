// Seed expansion: Google Autocomplete + People Also Ask (regex từ SERP titles)
// Free, không cần API key. Dùng cho keyword-research-v2.

const QUESTION_RE = /^(làm sao|cách|tại sao|có nên|là gì|khi nào|ở đâu|nên|how|why|what|when|where|should)\b/i;

const memCache = new Map<string, { data: string[]; exp: number }>();

async function googleAutocomplete(seed: string, hl = "vi", gl = "vn"): Promise<string[]> {
  const key = `ac:${seed}:${hl}:${gl}`;
  const hit = memCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}&hl=${hl}&gl=${gl}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { "Accept-Charset": "utf-8" } });
    clearTimeout(t);
    if (!res.ok) return [];
    // Force UTF-8 decode (Google suggest sometimes mislabels charset → mojibake on Vietnamese diacritics)
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buf);
    let data: any;
    try { data = JSON.parse(text); } catch { return []; }
    const arr: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const out = arr
      .slice(0, 5)
      .map((s) => String(s).trim())
      .filter((s) => s && !s.includes("\uFFFD")); // drop replacement-char garbage
    memCache.set(key, { data: out, exp: Date.now() + 24 * 3600_000 });
    return out;
  } catch (e) {
    console.warn("[seed-expander] autocomplete failed:", (e as Error).message);
    return [];
  }
}

function extractPAA(serpResults: { title: string; description: string }[]): string[] {
  const out: string[] = [];
  for (const r of serpResults) {
    const candidates = [r.title, r.description].filter(Boolean);
    for (const c of candidates) {
      // tách thành câu, kiểm tra mở đầu = từ hỏi
      for (const sentence of String(c).split(/[.!?…\n]+/)) {
        const t = sentence.trim().toLowerCase().replace(/[?:]+$/, "");
        if (t.length < 8 || t.length > 80) continue;
        if (QUESTION_RE.test(t)) {
          out.push(t);
          break;
        }
      }
    }
  }
  return [...new Set(out)].slice(0, 5);
}

// Modifier groups for systematic keyword expansion (VN-first, EN fallback)
export const KEYWORD_MODIFIERS = {
  quality: ["tốt nhất", "uy tín", "chất lượng", "top", "best"],
  price: ["giá", "giá rẻ", "miễn phí", "bao nhiêu tiền", "chi phí"],
  time: ["2026", "mới nhất", "hiện nay"],
  audience: ["cho người mới", "cho doanh nghiệp", "cho startup"],
  format: ["hướng dẫn", "cách dùng", "review", "đánh giá"],
  intent: ["mua", "đăng ký", "so sánh", "thay thế", "alternatives"],
};

/**
 * Expand seeds bằng modifier — pattern `<seed> <modifier>` + `<modifier> <seed>`.
 * Chạy qua Google Suggest verify, chỉ giữ keyword có gợi ý thật.
 * Trả về tối đa `max` keyword đã verify.
 */
export async function expandWithModifiers(
  seeds: string[],
  locale = "vi",
  max = 20,
): Promise<string[]> {
  const hl = locale.startsWith("vi") ? "vi" : "en";
  const gl = locale.startsWith("vi") ? "vn" : "us";
  const groups = locale.startsWith("vi")
    ? [...KEYWORD_MODIFIERS.quality, ...KEYWORD_MODIFIERS.price, ...KEYWORD_MODIFIERS.time, ...KEYWORD_MODIFIERS.audience, ...KEYWORD_MODIFIERS.format, ...KEYWORD_MODIFIERS.intent]
    : ["best", "price", "free", "review", "alternative", "vs", "guide", "for beginners", "2026"];
  // Build candidates (cap to avoid blowing up)
  const candidates: string[] = [];
  for (const seed of seeds.slice(0, 3)) {
    for (const mod of groups.slice(0, 12)) {
      candidates.push(`${seed} ${mod}`);
    }
  }
  // Verify via autocomplete (parallel, capped to ~30 calls)
  const verified: string[] = [];
  const seen = new Set(seeds.map((s) => s.toLowerCase().trim()));
  const checks = await Promise.all(
    candidates.slice(0, 30).map(async (cand) => {
      const sugg = await googleAutocomplete(cand, hl, gl);
      // If Google returns suggestions starting with the candidate, the candidate is "real"
      return sugg.length > 0 ? cand : null;
    }),
  );
  for (const cand of checks) {
    if (!cand) continue;
    const k = cand.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    verified.push(cand);
    if (verified.length >= max) break;
  }
  return verified;
}

/**
 * Generate brand-domination keywords: <brand> + modifiers + vs <competitor>.
 * KHÔNG gọi AI — pattern cứng để đảm bảo phủ 100% SERP cho brand name.
 */
export function generateBrandDominationSeeds(
  brandName: string,
  competitors: string[] = [],
): { keyword: string; intent: "informational" | "commercial" | "transactional" | "navigational"; funnel_stage: "TOFU" | "MOFU" | "BOFU" }[] {
  const b = brandName.trim();
  if (!b) return [];
  const out: { keyword: string; intent: any; funnel_stage: any }[] = [];
  const add = (kw: string, intent: any, funnel: any) => {
    const k = kw.toLowerCase().trim();
    if (k && !out.find((o) => o.keyword === k)) out.push({ keyword: k, intent, funnel_stage: funnel });
  };
  // Pure brand
  add(b, "navigational", "BOFU");
  // Variants: no diacritics, no spaces
  const noDiacritics = b.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (noDiacritics !== b) add(noDiacritics, "navigational", "BOFU");
  add(b.replace(/\s+/g, ""), "navigational", "BOFU");
  // Brand + modifier patterns
  const patterns: { suffix: string; intent: any; funnel: any }[] = [
    { suffix: "là gì", intent: "informational", funnel: "TOFU" },
    { suffix: "review", intent: "commercial", funnel: "MOFU" },
    { suffix: "đánh giá", intent: "commercial", funnel: "MOFU" },
    { suffix: "giá", intent: "commercial", funnel: "BOFU" },
    { suffix: "giá bao nhiêu", intent: "commercial", funnel: "BOFU" },
    { suffix: "có tốt không", intent: "commercial", funnel: "MOFU" },
    { suffix: "miễn phí", intent: "commercial", funnel: "BOFU" },
    { suffix: "login", intent: "navigational", funnel: "BOFU" },
    { suffix: "đăng nhập", intent: "navigational", funnel: "BOFU" },
    { suffix: "đăng ký", intent: "transactional", funnel: "BOFU" },
    { suffix: "hướng dẫn sử dụng", intent: "informational", funnel: "TOFU" },
    { suffix: "alternatives", intent: "commercial", funnel: "MOFU" },
    { suffix: "thay thế", intent: "commercial", funnel: "MOFU" },
  ];
  for (const p of patterns) add(`${b} ${p.suffix}`, p.intent, p.funnel);
  // Brand vs competitor
  for (const c of competitors.slice(0, 5)) {
    const cn = String(c || "").trim();
    if (!cn) continue;
    add(`${b} vs ${cn}`, "commercial", "MOFU");
    add(`so sánh ${b} và ${cn}`, "commercial", "MOFU");
  }
  return out;
}

/**
 * Expand seeds: cho mỗi seed lấy top-3 Autocomplete + PAA từ SERP đã có.
 * Trả về list mới (không bao gồm seed gốc), dedupe.
 */
export async function expandSeeds(
  seeds: string[],
  serpGround: Record<string, { title: string; description: string }[]>,
  locale = "vi"
): Promise<string[]> {
  const hl = locale.startsWith("vi") ? "vi" : "en";
  const gl = locale.startsWith("vi") ? "vn" : "us";

  const acLists = await Promise.all(seeds.map((s) => googleAutocomplete(s, hl, gl)));
  const ac = acLists.flat();

  const paa: string[] = [];
  for (const s of seeds) {
    const results = serpGround[s] || [];
    paa.push(...extractPAA(results));
  }

  const seedSet = new Set(seeds.map((s) => s.toLowerCase().trim()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cand of [...ac, ...paa]) {
    const key = cand.toLowerCase().trim();
    if (!key || seedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
    if (out.length >= 10) break;
  }
  return out;
}
