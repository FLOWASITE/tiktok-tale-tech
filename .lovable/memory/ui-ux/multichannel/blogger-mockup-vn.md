---
name: Blogger Mockup Standalone
description: Blogger preview dùng BloggerMockup riêng (Blogspot classic look), không share WebsiteMockup
type: design
---

`channelToMockupType.blogger = 'blogger'` → render `BloggerMockup` (file `src/components/preview/BloggerMockup.tsx`), KHÔNG dùng `WebsiteMockup`/`general`.

**Look:** Blogspot classic (Notable/Soho/Contempo)
- Header center: logo bubble + brand name serif + `<brand>.blogspot.com` small caps + nav strip Home/About/Posts/Contact
- Body: date strap, title `font-serif` 3xl center, meta line "Posted by · X min read · label", optional hero image full-bleed, prose markdown (Georgia)
- Footer: Labels chips (lấy từ `seoData.focus_keyword` + `secondary_keywords`), Reactions (Funny/Interesting/Cool checkboxes), Comments stub, "Powered by Blogger"
- Theme accent dùng `primaryColor` (mặc định `#1a73e8`)
- KHÔNG có browser address bar / FAQ schema / corporate breadcrumb

WordPress vẫn share `general` (WebsiteMockup) cho tới khi cần tách riêng.
