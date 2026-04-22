// Regression tests: Telegram pipeline must mirror manual /multichannel pipeline.
// We stub global.fetch and intercept payloads to generate-brand-image to assert
// structuredElements + imageContentType + textToInclude shape.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock supabase client BEFORE importing the composer.
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => {
  const brand = {
    id: "brand-1",
    brand_name: "TestBrand",
    logo_url: null,
    logo_position: "auto",
    logo_size_percent: 15,
    logo_style: "shadow",
    logo_opacity: 100,
    image_style_preset: "minimalist",
    footer_info: {
      phone: "0901234567",
      website: "flowa.one",
      address: "123 Lê Lợi, Q.1, TP.HCM",
      email: "hello@flowa.one",
    },
    primary_color: "#0F172A",
    secondary_color: "#64748B",
  };
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: brand, error: null }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }),
    }),
  };
});

import { composeBrandedImage } from "../branded-image-composer.ts";

interface CapturedCall {
  url: string;
  body: any;
}

function makeFetchStub(captured: CapturedCall[]) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    let body: any = undefined;
    try {
      body = init?.body ? JSON.parse(init.body as string) : undefined;
    } catch { /* ignore */ }
    captured.push({ url, body });

    if (url.includes("/decompose-image-request")) {
      return new Response(JSON.stringify({
        backgroundPrompt: {
          description: "Clean editorial background, soft gradient, no text",
          colorScheme: "Primary: #0F172A",
          mood: "professional",
          elements: [],
        },
        overlayConfig: {
          colors: { primary: "#0F172A", secondary: "#64748B", text: "#FFFFFF" },
          headline: "Spring promo for our clinic",
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/generate-brand-image")) {
      return new Response(JSON.stringify({ success: true, imageUrl: "https://cdn.example/base.png" }), { status: 200 });
    }
    if (url.includes("/overlay-logo-canvas")) {
      return new Response(JSON.stringify({ success: true, imageUrl: "https://cdn.example/with-logo.png" }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  };
}

describe("branded-image-composer — manual pipeline parity", () => {
  let captured: CapturedCall[];
  let originalFetch: typeof fetch;

  beforeEach(() => {
    captured = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = makeFetchStub(captured) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("payload to generate-brand-image always uses imageContentType='with_text'", async () => {
    const longText = "A".repeat(500); // would have triggered background_only in old composer
    const result = await composeBrandedImage({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      contentId: "c1",
      channel: "facebook",
      brandTemplateId: "brand-1",
      channelText: longText,
      channelTitle: "Promo",
    });
    expect(result.success).toBe(true);
    const genCall = captured.find((c) => c.url.includes("/generate-brand-image"));
    expect(genCall).toBeTruthy();
    expect(genCall!.body.imageContentType).toBe("with_text");
    expect(typeof genCall!.body.textToInclude).toBe("string");
    expect(genCall!.body.textToInclude.length).toBeLessThanOrEqual(80);
  });

  it("structuredElements.footer.items is populated from brand.footer_info when AI doesn't provide one", async () => {
    const result = await composeBrandedImage({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      contentId: "c2",
      channel: "facebook",
      brandTemplateId: "brand-1",
      channelText: "Khuyến mãi mùa xuân tại phòng khám của chúng tôi",
      channelTitle: "Promo",
    });
    expect(result.success).toBe(true);
    const genCall = captured.find((c) => c.url.includes("/generate-brand-image"));
    const footerItems = genCall?.body?.structuredElements?.footer?.items || [];
    expect(footerItems.length).toBeGreaterThanOrEqual(1);
    const texts = footerItems.map((i: any) => i.text).join("|");
    expect(texts).toMatch(/0901234567|flowa\.one|hello@flowa\.one/);
  });

  it("textToInclude (headline) is capped at 80 chars even for very long captions", async () => {
    const longText = "Dòng đầu tiên rất là dài để chúng ta kiểm tra rằng headline luôn được cắt xuống tối đa 80 ký tự bất kể caption dài bao nhiêu chăng nữa và phần còn lại bị bỏ qua. Phần này sẽ không bao giờ xuất hiện.";
    await composeBrandedImage({
      supabaseUrl: "https://x.supabase.co",
      serviceKey: "service-key",
      contentId: "c3",
      channel: "facebook",
      brandTemplateId: "brand-1",
      channelText: longText,
    });
    const genCall = captured.find((c) => c.url.includes("/generate-brand-image"));
    const textToInclude = genCall?.body?.textToInclude || "";
    expect(textToInclude.length).toBeLessThanOrEqual(80);
    expect(genCall?.body?.structuredColors?.primary).toBe("#0F172A");
    expect(typeof genCall?.body?.structuredTemplate).toBe("string");
  });
});
