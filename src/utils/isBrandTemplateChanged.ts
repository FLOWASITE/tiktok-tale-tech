import type { BrandTemplate } from "@/hooks/useBrandTemplates";

type BrandTemplateComparable = Pick<
  BrandTemplate,
  | "name"
  | "brand_name"
  | "industry"
  | "brand_guideline"
  | "include_logo"
  | "is_default"
  | "logo_url"
  | "primary_color"
  | "brand_positioning"
  | "tone_of_voice"
  | "formality_level"
  | "language_style"
  | "preferred_words"
  | "forbidden_words"
  | "allow_emoji"
  | "compliance_rules"
  | "channel_overrides"
  | "headline"
  | "sub_headline"
>;

const normalize = (v: unknown) => (v === undefined ? null : v);

const stableStringify = (v: unknown) => {
  const n = normalize(v);
  // Arrays/objects are JSON stringified; primitives become string too.
  return JSON.stringify(n);
};

export function isBrandTemplateChanged(
  before: BrandTemplateComparable,
  after: BrandTemplateComparable
): boolean {
  const keys: (keyof BrandTemplateComparable)[] = [
    "name",
    "brand_name",
    "industry",
    "brand_guideline",
    "include_logo",
    "is_default",
    "logo_url",
    "primary_color",
    "brand_positioning",
    "tone_of_voice",
    "formality_level",
    "language_style",
    "preferred_words",
    "forbidden_words",
    "allow_emoji",
    "compliance_rules",
    "channel_overrides",
    "headline",
    "sub_headline",
  ];

  for (const k of keys) {
    if (stableStringify(before[k]) !== stableStringify(after[k])) return true;
  }

  return false;
}
