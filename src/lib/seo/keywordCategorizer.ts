// Keyword Universe categorizer — phân loại 1 keyword thành 1 trong 5 nhóm chính
// theo SEO playbook: Brand / Product / Problem / Competitor / Commercial / Topical

export type KeywordCategory =
  | "brand"
  | "product"
  | "problem"
  | "competitor"
  | "commercial"
  | "topical";

export interface CategoryMeta {
  id: KeywordCategory;
  label: string;
  description: string;
  emoji: string;
  // Tailwind semantic-ish color tokens (neutral)
  badgeClass: string;
  dotClass: string;
}

export const CATEGORY_META: Record<KeywordCategory, CategoryMeta> = {
  brand: {
    id: "brand",
    label: "Brand",
    description: "Tên thương hiệu, biến thể, brand + modifier (giá, review, là gì…)",
    emoji: "👑",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  product: {
    id: "product",
    label: "Product",
    description: "Tên sản phẩm/dịch vụ cốt lõi — money keywords",
    emoji: "💎",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  problem: {
    id: "problem",
    label: "Problem",
    description: "Pain point, cách / hướng dẫn / vấn đề user đang gặp",
    emoji: "🩹",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  competitor: {
    id: "competitor",
    label: "Competitor",
    description: "Tên đối thủ, so sánh, alternative, vs",
    emoji: "⚔️",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  commercial: {
    id: "commercial",
    label: "Commercial",
    description: "Giá, mua, tốt nhất, top, review — intent chuyển đổi",
    emoji: "💰",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  topical: {
    id: "topical",
    label: "Topical",
    description: "Topic cluster mở rộng, semantic SEO, traffic top funnel",
    emoji: "🌐",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

export const CATEGORY_ORDER: KeywordCategory[] = [
  "brand",
  "product",
  "competitor",
  "commercial",
  "problem",
  "topical",
];

// ---------- helpers ----------
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PROBLEM_RX =
  /\b(cach|how to|huong dan|tutorial|loi|fix|sua|tai sao|why|lam sao|meo|tips?|guide|van de|problem|kho|kho khan|chua|dieu tri|cai thien)\b/;

const COMMERCIAL_RX =
  /\b(gia|price|mua|buy|order|dat|booking|book|review|tot nhat|best|top \d*|ranking|so sanh|vs|compare|cheap|re|khuyen mai|sale|discount|free|mien phi|2024|2025|2026|alternative|thay the)\b/;

const QUESTION_RX = /\b(la gi|what is|how|why|when|where|which|who|nao|gi|bao nhieu)\b/;

export interface CategorizerContext {
  brandNames?: string[];        // ["flowa", "flowa.one"]
  productTerms?: string[];      // ["chatbot", "ai content"...]
  competitorNames?: string[];   // ["manychat", "chatfuel"...]
}

export function categorizeKeyword(
  keyword: string,
  ctx: CategorizerContext = {},
  hint?: { intent?: string }
): KeywordCategory {
  const k = norm(keyword);
  if (!k) return "topical";

  const brands = (ctx.brandNames || []).map(norm).filter(Boolean);
  const products = (ctx.productTerms || []).map(norm).filter(Boolean);
  const competitors = (ctx.competitorNames || []).map(norm).filter(Boolean);

  // 1. Brand match (highest priority)
  for (const b of brands) {
    if (!b) continue;
    if (k.includes(b)) return "brand";
    // no-space variant
    const compact = b.replace(/\s+/g, "");
    if (compact.length >= 4 && k.replace(/\s+/g, "").includes(compact)) return "brand";
  }

  // 2. Competitor
  for (const c of competitors) {
    if (c && k.includes(c)) return "competitor";
  }
  if (/\b(vs|so sanh|compare|alternative|thay the)\b/.test(k) && competitors.length === 0) {
    return "competitor";
  }

  // 3. Problem (pain point / how-to)
  if (PROBLEM_RX.test(k)) return "problem";

  // 4. Commercial intent
  if (COMMERCIAL_RX.test(k) || hint?.intent === "transactional" || hint?.intent === "commercial") {
    return "commercial";
  }

  // 5. Product (core offering match)
  for (const p of products) {
    if (p && k.includes(p)) return "product";
  }

  // 6. Topical / informational fallback
  if (QUESTION_RX.test(k) || hint?.intent === "informational") return "topical";

  return "topical";
}

// Derive context arrays from a Brand record (loose typing — works with current/legacy schemas)
export function buildContextFromBrand(brand: any): CategorizerContext {
  if (!brand) return {};
  const brandNames: string[] = [];
  const push = (arr: string[], v: any) => {
    const t = String(v || "").trim();
    if (t && !arr.includes(t.toLowerCase())) arr.push(t);
  };
  push(brandNames, brand.brand_name);
  push(brandNames, brand.name);
  if (Array.isArray(brand.brand_aliases)) brand.brand_aliases.forEach((a: any) => push(brandNames, a));
  if (brand.website) {
    try {
      const host = new URL(brand.website).hostname.replace(/^www\./, "");
      push(brandNames, host);
      push(brandNames, host.split(".")[0]);
    } catch {}
  }

  const productTerms: string[] = [];
  if (brand.industry) push(productTerms, brand.industry);
  if (Array.isArray(brand.products)) brand.products.forEach((p: any) => push(productTerms, p?.name || p));
  if (Array.isArray(brand.services)) brand.services.forEach((s: any) => push(productTerms, s?.name || s));
  if (Array.isArray(brand.content_pillars)) {
    for (const p of brand.content_pillars) {
      push(productTerms, p?.name);
      if (Array.isArray(p?.keywords)) p.keywords.forEach((k: any) => push(productTerms, k));
    }
  }

  const competitorNames: string[] = [];
  if (Array.isArray(brand.competitors)) {
    brand.competitors.forEach((c: any) => push(competitorNames, c?.name || c));
  }

  return { brandNames, productTerms, competitorNames };
}

// Modifier expansion suggestions for a keyword (client-side only — no API call)
export const MODIFIER_PRESETS = {
  commercial: ["tốt nhất", "giá rẻ", "review", "so sánh", "top 10", "2026"],
  problem: ["cách", "hướng dẫn", "tại sao", "làm sao", "mẹo", "lỗi"],
  audience: ["cho người mới", "cho doanh nghiệp", "cho spa", "cho freelancer"],
  local: ["tại tphcm", "tại hà nội", "việt nam", "near me"],
  long_tail: ["miễn phí", "online", "uy tín", "chính hãng"],
} as const;

export type ModifierGroup = keyof typeof MODIFIER_PRESETS;

export function expandKeywordWithModifiers(
  base: string,
  groups: ModifierGroup[] = ["commercial", "problem"]
): { group: ModifierGroup; keyword: string }[] {
  const seed = (base || "").trim();
  if (!seed) return [];
  const out: { group: ModifierGroup; keyword: string }[] = [];
  for (const g of groups) {
    for (const m of MODIFIER_PRESETS[g]) {
      out.push({ group: g, keyword: `${seed} ${m}` });
    }
  }
  return out;
}
