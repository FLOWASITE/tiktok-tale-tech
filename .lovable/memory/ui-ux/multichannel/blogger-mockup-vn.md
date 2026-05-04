---
name: Long-form Mockup Separation
description: Mỗi long-form channel có mockup riêng — WebsiteMockup (corporate), BloggerMockup (Blogspot), WordPressMockup (Twenty Twenty-Four), ShopifyMockup (Dawn storefront)
type: design
---

Mỗi long-form channel render mockup riêng để phản ánh đúng nơi publish, không share `WebsiteMockup` corporate cho tất cả.

**Files:**
- `src/components/preview/WebsiteMockup.tsx` (inline trong `ChannelMockupFrame.tsx`) — corporate look với browser bar, FAQ, schema. Dùng cho `website`, `google_maps`, `youtube`, `zalo_oa`, `telegram`.
- `src/components/preview/BloggerMockup.tsx` — Blogspot classic: header center, font Georgia serif, "Labels" chips, "Powered by Blogger" footer.
- `src/components/preview/WordPressMockup.tsx` — Twenty Twenty-Four/Five style: sans-serif header + nav strip, serif title align trái, categories chip, author bio card, "Leave a Reply" stub, "Proudly powered by WordPress" footer.
- `src/components/preview/ShopifyMockup.tsx` — Dawn theme storefront: announcement bar (free shipping), shop nav (Shop/Collections/Journal/About), cart badge, breadcrumb, **product CTA card** với "Shop now" button (theme color #96bf48), domain `{handle}.myshopify.com`, "Powered by Shopify" footer. SEO score badge enabled (isWebsiteLike).

**Routing:** `ContentMockupToggle.channelToMockupType` + `MultiChannelPreviewDialog.channelToMockupType` map channel → mockup type. `ChannelMockupFrame` switch case render đúng component. Khi thêm long-form channel mới, tạo standalone mockup file riêng theo cùng pattern (props: `content, brandName, logoUrl, primaryColor, isGenerating, seoData, channelImage`; reuse `ensureMarkdownFormat` + `ReactMarkdown remarkGfm` + strip duplicate title logic).
