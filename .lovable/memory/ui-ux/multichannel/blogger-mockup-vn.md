---
name: Long-form Mockup Separation
description: Mỗi long-form channel có mockup riêng — WebsiteMockup (corporate), BloggerMockup (Blogspot classic), WordPressMockup (Twenty Twenty-Four)
type: design
---

Mỗi long-form channel render mockup riêng để phản ánh đúng nơi publish, không share `WebsiteMockup` corporate cho tất cả.

**Files:**
- `src/components/preview/WebsiteMockup.tsx` (inline trong `ChannelMockupFrame.tsx`) — corporate look với browser bar, FAQ, schema. Dùng cho `website`, `google_maps`, `youtube`, `zalo_oa`, `telegram`.
- `src/components/preview/BloggerMockup.tsx` — Blogspot classic: header center, font Georgia serif, "Labels" chips, "Powered by Blogger" footer.
- `src/components/preview/WordPressMockup.tsx` — Twenty Twenty-Four/Five style: sans-serif header + nav strip, serif title (Source Serif/Georgia) align trái, categories chip phía trên title, author bio card, "Leave a Reply" stub, "Proudly powered by WordPress" footer. Domain hint: `{brand}.wordpress.com` hoặc lấy từ `seoData.canonical_url`.

**Routing:** `ContentMockupToggle.channelToMockupType` map channel → mockup type. `ChannelMockupFrame` switch case render đúng component. Khi thêm long-form channel mới, tạo standalone mockup file riêng theo cùng pattern (props: `content, brandName, logoUrl, primaryColor, isGenerating, seoData, channelImage`; reuse `ensureMarkdownFormat` + `ReactMarkdown remarkGfm` + strip duplicate title logic).
