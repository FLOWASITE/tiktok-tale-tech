// ============================================================
// Hybrid Image Utils — Deno port of src/lib/hybridImageGenerator.ts
// 1:1 copy of applyTemplate, autoSelectTemplate, decomposeRequest fallback.
// Used by branded-image-composer (and any future server-side flow)
// to mirror the manual /multichannel pipeline bit-for-bit.
// ============================================================

export interface BackgroundPrompt {
  description: string;
  colorScheme: string;
  mood: string;
  elements: string[];
}

export interface OverlayBanner {
  text: string;
  bgColor: string;
  position: "top" | "bottom";
}

export interface OverlayHeroText {
  text: string;
  fontSize: "xl" | "2xl" | "3xl";
  effect: "none" | "gradient";
}

export interface OverlayCardItem {
  icon?: string;
  label: string;
  description?: string;
  number?: number;
}

export interface OverlayCards {
  items: OverlayCardItem[];
  layout: "grid-2x2" | "horizontal" | "vertical";
}

export interface OverlayFooterItem {
  icon?: string;
  text: string;
}

export interface OverlayFooter {
  items: OverlayFooterItem[];
}

export interface OverlaySummaryRibbon {
  text: string;
  bgColor?: string;
}

export interface StructuredOverlayConfig {
  banner?: OverlayBanner;
  heroText?: OverlayHeroText;
  cards?: OverlayCards;
  headline?: string;
  cta?: string;
  footer?: OverlayFooter;
  summaryRibbon?: OverlaySummaryRibbon;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

export interface DecomposedRequest {
  backgroundPrompt: BackgroundPrompt;
  overlayConfig: StructuredOverlayConfig;
  layout?: "stack" | "split" | "banner_cards" | "hero_text" | "simple";
  suggestedLayout?: "poster" | "infographic" | "quote_card" | "feature_list" | "contact_card" | "education_infographic";
}

// ----- Template registry (mirrors src/config/overlayTemplates.ts) -----

export interface OverlayTemplate {
  id: string;
  layout: "stack" | "split" | "banner_cards" | "hero_text" | "simple";
  requiredSlots: Array<"banner" | "heroText" | "headline" | "cards" | "cta" | "footer" | "summaryRibbon">;
  defaults: {
    banner?: { position: "top" | "bottom" };
    heroText?: { fontSize: "xl" | "2xl" | "3xl"; effect: "none" | "gradient" };
    cards?: { layout: "grid-2x2" | "horizontal" | "vertical"; minCount: number; numbered?: boolean };
  };
}

const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  { id: "auto", layout: "simple", requiredSlots: [], defaults: {} },
  {
    id: "poster",
    layout: "stack",
    requiredSlots: ["banner", "headline", "cta"],
    defaults: { banner: { position: "top" } },
  },
  {
    id: "infographic",
    layout: "split",
    requiredSlots: ["banner", "heroText", "cards"],
    defaults: {
      banner: { position: "top" },
      heroText: { fontSize: "3xl", effect: "gradient" },
      cards: { layout: "grid-2x2", minCount: 4 },
    },
  },
  {
    id: "quote_card",
    layout: "hero_text",
    requiredSlots: ["heroText", "banner"],
    defaults: {
      banner: { position: "bottom" },
      heroText: { fontSize: "3xl", effect: "gradient" },
    },
  },
  {
    id: "feature_list",
    layout: "banner_cards",
    requiredSlots: ["banner", "cards"],
    defaults: {
      banner: { position: "top" },
      cards: { layout: "vertical", minCount: 3 },
    },
  },
  {
    id: "contact_card",
    layout: "stack",
    requiredSlots: ["headline", "footer"],
    defaults: {},
  },
  {
    id: "education_infographic",
    layout: "stack",
    requiredSlots: ["banner", "cards", "summaryRibbon", "cta", "footer"],
    defaults: {
      banner: { position: "top" },
      cards: { layout: "vertical", minCount: 3, numbered: true },
    },
  },
];

export function getTemplateById(id: string): OverlayTemplate | undefined {
  return OVERLAY_TEMPLATES.find((t) => t.id === id);
}

// ----- Footer extractor (1:1 with frontend) -----

export function extractFooterItemsFromText(description: string): OverlayFooterItem[] {
  const source = (description || "").trim();
  if (!source) return [];

  const items: OverlayFooterItem[] = [];
  const seen = new Set<string>();
  const pushUnique = (item: OverlayFooterItem) => {
    const key = item.text.toLowerCase();
    if (item.text && !seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  };

  const phones = source.match(/(?:\+?84|0)\d[\d\s.\-]{7,12}\d/g) || [];
  for (const raw of phones.slice(0, 2)) {
    pushUnique({ icon: "📞", text: raw.replace(/\s+/g, " ").trim() });
  }

  const emails = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const email of emails.slice(0, 2)) {
    pushUnique({ icon: "📧", text: email.trim() });
  }

  const websites = source.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+\b/gi) || [];
  for (const site of websites.slice(0, 2)) {
    if (!site.includes("@")) {
      pushUnique({ icon: "🌐", text: site.trim() });
    }
  }

  const addressLine = source
    .split(/\n|\.|;/)
    .map((line) => line.trim())
    .find((line) => /(địa chỉ|address|addr|đường|street|phường|quận|district|ward)/i.test(line));

  if (addressLine) {
    const clean = addressLine.replace(/^(địa chỉ|address|addr)\s*[:\-]?\s*/i, "").trim();
    if (clean.length >= 6) {
      pushUnique({ icon: "📍", text: clean.slice(0, 80) });
    }
  }

  return items.slice(0, 4);
}

// ----- Default overlay generator (1:1 with frontend) -----

function generateDefaultOverlayFromSummary(
  description: string,
  primaryColor: string,
): Partial<StructuredOverlayConfig> {
  const result: Partial<StructuredOverlayConfig> = {};
  const text = description.trim();

  const sentences = text.split(/[.!?\n]/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const words = sentences[0].split(/\s+/).slice(0, 4).join(" ");
    result.banner = { text: words.toUpperCase().slice(0, 30), bgColor: primaryColor, position: "top" };
  }

  const numberMatch = text.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
  if (numberMatch) {
    result.heroText = { text: numberMatch[0].trim().slice(0, 20), fontSize: "3xl", effect: "gradient" };
  }

  const bulletItems = text.match(/(?:^|\n)\s*[•\-\*►]\s*(.+)/gm);
  const numberedItems = text.match(/(?:^|\n)\s*\d+[\.\)]\s*(.+)/gm);

  let cardLabels: string[] = [];
  if (bulletItems && bulletItems.length >= 2) {
    cardLabels = bulletItems.map((b) => b.replace(/^[\s•\-\*►]+/, "").trim());
  } else if (numberedItems && numberedItems.length >= 2) {
    cardLabels = numberedItems.map((b) => b.replace(/^[\s\d\.\)]+/, "").trim());
  } else if (sentences.length >= 3) {
    cardLabels = sentences.slice(1, 5);
  }

  if (cardLabels.length >= 2) {
    result.cards = {
      items: cardLabels.slice(0, 4).map((label) => ({ label: label.slice(0, 50) })),
      layout: cardLabels.length <= 2 ? "horizontal" : "grid-2x2",
    };
  }

  const footerItems = extractFooterItemsFromText(text);
  if (footerItems.length > 0) {
    result.footer = { items: footerItems };
  }

  return result;
}

// ----- Regex decompose fallback (1:1 with frontend) -----

export function decomposeRequest(
  description: string,
  primaryColor: string = "#DC2626",
  secondaryColor: string = "#FFFFFF",
): DecomposedRequest {
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);

  const visualKeywords: string[] = [];
  const textElements: string[] = [];
  const cardItems: OverlayCardItem[] = [];
  let bannerText = "";
  let heroText = "";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("banner") || lower.includes("tin nóng") || lower.includes("breaking")) {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) bannerText = quoted[1] || quoted[2] || "";
    } else if ((lower.includes("số") && lower.includes("lớn")) || lower.includes("hero") || lower.match(/"\d+%"/)) {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) heroText = quoted[1] || quoted[2] || "";
    } else if (line.match(/^[•\-\*►]\s/) || line.match(/^\d+[\.\)]\s/)) {
      const label = line.replace(/^[•\-\*►\d\.\)]\s*/, "").trim();
      if (label) cardItems.push({ label });
    } else if (
      lower.includes("nền") || lower.includes("background") ||
      lower.includes("skyline") || lower.includes("tông màu") ||
      lower.includes("phong cách") || lower.includes("style") ||
      lower.includes("minh họa") || lower.includes("illustration") ||
      lower.includes("mood") || lower.includes("nhân vật")
    ) {
      visualKeywords.push(line);
    } else {
      const quoted = line.match(/[""\u201C]([^""\u201D]+)[""\u201D]|"([^"]+)"/);
      if (quoted) {
        textElements.push(quoted[1] || quoted[2] || "");
      } else {
        visualKeywords.push(line);
      }
    }
  }

  const visualDesc = visualKeywords.join(". ") || description.slice(0, 200);
  const backgroundPrompt: BackgroundPrompt = {
    description:
      `Clean visual background for infographic: ${visualDesc}. Color scheme: primary ${primaryColor}, secondary ${secondaryColor}. IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements, cards, or buttons in the image. Generate ONLY the visual background scene with atmosphere and illustrations.`,
    colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
    mood: "professional, modern, corporate",
    elements: ["Clean background without any text, numbers, or UI elements"],
  };

  const overlayConfig: StructuredOverlayConfig = {
    colors: { primary: primaryColor, secondary: secondaryColor, text: "#FFFFFF" },
  };

  if (bannerText) {
    overlayConfig.banner = { text: bannerText, bgColor: primaryColor, position: "top" };
  }

  if (heroText) {
    overlayConfig.heroText = { text: heroText, fontSize: "3xl", effect: "gradient" };
  } else if (textElements.length > 0) {
    overlayConfig.headline = textElements[0];
  }

  if (cardItems.length > 0) {
    overlayConfig.cards = {
      items: cardItems.slice(0, 6),
      layout: cardItems.length <= 2 ? "horizontal" : cardItems.length <= 4 ? "grid-2x2" : "vertical",
    };
  }

  const footerItems = extractFooterItemsFromText(description);
  if (footerItems.length > 0) {
    overlayConfig.footer = { items: footerItems };
  }

  const hasOverlay = overlayConfig.banner || overlayConfig.heroText || overlayConfig.headline || overlayConfig.cards || overlayConfig.footer;
  if (!hasOverlay) {
    const defaults = generateDefaultOverlayFromSummary(description, primaryColor);
    if (defaults.banner) overlayConfig.banner = defaults.banner;
    if (defaults.heroText) overlayConfig.heroText = defaults.heroText;
    if (defaults.cards) overlayConfig.cards = defaults.cards;
    if (defaults.footer) overlayConfig.footer = defaults.footer;
  }

  return { backgroundPrompt, overlayConfig };
}

// ----- Auto template selector (1:1 with frontend) -----

export function autoSelectTemplate(
  description: string,
  overlayConfig: StructuredOverlayConfig,
): string {
  const hasContactInfo = extractFooterItemsFromText(description).length >= 2;
  if (hasContactInfo && overlayConfig.cards && overlayConfig.cards.items.length >= 3) return "education_infographic";
  if (hasContactInfo && !overlayConfig.cards) return "contact_card";
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 4) return "infographic";
  if (overlayConfig.cards && overlayConfig.cards.items.length >= 2) return "feature_list";
  if (overlayConfig.heroText && !overlayConfig.cards) return "quote_card";
  if (overlayConfig.headline || overlayConfig.cta) return "poster";
  return "poster";
}

// ----- applyTemplate (1:1 with frontend) -----

export function applyTemplate(
  templateId: string,
  decomposed: DecomposedRequest,
  description: string,
  primaryColor: string = "#DC2626",
): DecomposedRequest {
  if (templateId === "auto") return decomposed;

  const template = getTemplateById(templateId);
  if (!template) return decomposed;

  const overlay: StructuredOverlayConfig = { ...decomposed.overlayConfig };

  if (template.requiredSlots.includes("banner") && !overlay.banner) {
    const words = description.split(/\s+/).slice(0, 4).join(" ");
    overlay.banner = {
      text: words.toUpperCase().slice(0, 30),
      bgColor: primaryColor,
      position: template.defaults.banner?.position || "top",
    };
  } else if (overlay.banner && template.defaults.banner) {
    overlay.banner.position = template.defaults.banner.position;
  }

  if (template.requiredSlots.includes("heroText") && !overlay.heroText) {
    const numMatch = description.match(/(\d+[\.,]?\d*\s*(%|triệu|tỷ|nghìn|k|K|M)?)/);
    overlay.heroText = {
      text: numMatch ? numMatch[0].trim().slice(0, 20) : description.split(/[.!?\n]/)[0]?.slice(0, 40) || "Highlight",
      fontSize: template.defaults.heroText?.fontSize || "3xl",
      effect: template.defaults.heroText?.effect || "gradient",
    };
  }

  if (template.requiredSlots.includes("headline") && !overlay.headline) {
    overlay.headline = description.split(/[.!?\n]/)[0]?.slice(0, 60) || "Tiêu đề";
  }

  if (template.requiredSlots.includes("cards") && !overlay.cards) {
    const sentences = description.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 5);
    const minCount = template.defaults.cards?.minCount || 3;
    const items: OverlayCardItem[] = sentences.slice(0, Math.max(minCount, 2)).map((s) => ({ label: s.slice(0, 50) }));
    while (items.length < minCount) items.push({ label: `Điểm ${items.length + 1}` });
    overlay.cards = {
      items,
      layout: template.defaults.cards?.layout || "grid-2x2",
    };
  } else if (overlay.cards && template.defaults.cards) {
    overlay.cards.layout = template.defaults.cards.layout;
  }

  if (template.requiredSlots.includes("cta") && !overlay.cta) {
    overlay.cta = "Tìm hiểu thêm";
  }

  if (template.requiredSlots.includes("summaryRibbon") && !overlay.summaryRibbon) {
    const sentences = description.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 10);
    overlay.summaryRibbon = {
      text: sentences[sentences.length - 1]?.slice(0, 80) || "Liên hệ ngay để được tư vấn",
      bgColor: overlay.colors.primary,
    };
  }

  if (template.defaults.cards?.numbered && overlay.cards) {
    overlay.cards.items = overlay.cards.items.map((item, idx) => ({
      ...item,
      number: idx + 1,
    }));
  }

  if (template.requiredSlots.includes("footer") && !overlay.footer) {
    const footerItems = extractFooterItemsFromText(description);
    overlay.footer = {
      items: footerItems.length > 0 ? footerItems : [{ icon: "📩", text: "Liên hệ để được tư vấn" }],
    };
  }

  return {
    backgroundPrompt: decomposed.backgroundPrompt,
    overlayConfig: overlay,
    layout: template.layout,
  };
}

// ----- Inject brand footer_info into overlayConfig.footer -----

export interface BrandFooterInfo {
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  email?: string | null;
  [k: string]: unknown;
}

/**
 * Build OverlayFooterItem[] from brand_templates.footer_info.
 * Used to ensure footer is always sent to AI even when text doesn't include contact info.
 */
export function buildFooterItemsFromBrand(footerInfo: BrandFooterInfo | null | undefined): OverlayFooterItem[] {
  if (!footerInfo || typeof footerInfo !== "object") return [];
  const items: OverlayFooterItem[] = [];
  const phone = (footerInfo.phone || "").toString().trim();
  const website = (footerInfo.website || "").toString().trim();
  const address = (footerInfo.address || "").toString().trim();
  const email = (footerInfo.email || "").toString().trim();
  if (phone) items.push({ icon: "📞", text: phone });
  if (website) items.push({ icon: "🌐", text: website });
  if (address) items.push({ icon: "📍", text: address.slice(0, 80) });
  if (email) items.push({ icon: "📧", text: email });
  return items.slice(0, 4);
}
