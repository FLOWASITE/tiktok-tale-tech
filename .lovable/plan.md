# 🎯 SEO Plan toàn diện cho flowa.one (VN market, 6 tháng)

## Phần 1 — Audit hiện trạng

### ✅ Điểm mạnh (đã làm tốt)
- **Technical SEO baseline xuất sắc**: GA4 (`G-C9Z5EE13EM`), GSC verified, sitemap.xml build-time generation, robots.txt sạch, canonical, hreflang `x-default`, web vitals tracking, noscript fallback đầy đủ.
- **Schema markup phong phú**: Organization, WebSite, SoftwareApplication, AggregateRating, Review, LocalBusiness, Product, CollectionPage, HowTo, FAQPage, BreadcrumbList, Article — đã cover gần hết schema-types Google index.
- **OG/Twitter cards** đầy đủ, og-image 1200x630.
- **Performance hints**: preconnect, dns-prefetch, preload favicon.
- **Brand entity** đã định danh rõ trên schema (sameAs đầy đủ social profiles).

### ⚠️ Gap lớn cần fix
1. **Content depth quá mỏng**: chỉ 4 blog posts static + ~8 DB posts → không đủ topical authority để rank competitive keywords ("AI marketing", "tạo content AI", "phần mềm content marketing").
2. **Không có programmatic landing pages**: 42 ngành Flowa hỗ trợ chưa có 1 page riêng nào → bỏ lỡ long-tail traffic ("AI viết content cho spa", "AI marketing cho phòng khám nha khoa", v.v.).
3. **Không có comparison pages**: thiếu "Flowa vs Jasper", "Flowa vs Copy.ai", "Flowa vs ChatGPT cho marketing" — keywords chuyển đổi cao.
4. **Thiếu use-case/feature landing pages**: `/pricing`, `/about`, `/blog` là chính. Chưa có `/ai-tao-content-tiktok`, `/ai-viet-bai-facebook`, `/cong-cu-content-calendar`...
5. **GEO (Generative Engine Optimization) chưa khai thác**: blog hiện tại không có "answer block" format (TL;DR, definition box, statistic blocks) để AI engines (ChatGPT, Perplexity, Gemini) trích dẫn.
6. **Internal linking yếu**: 4 static blog posts không liên kết theo cluster topic; không có hub page.
7. **Không có lead magnet / gated content**: không capture email từ traffic blog.
8. **Sitemap thiếu image sitemap entries** cho blog posts (đã có code support nhưng cần data populate).

---

## Phần 2 — Keyword Strategy (VN)

### Cluster 1 — Money keywords (lead-gen)
| Keyword | Intent | Vol (est) | Difficulty | Target page |
|---|---|---|---|---|
| phần mềm AI marketing | Commercial | High | Med | `/` |
| AI tạo content tiếng Việt | Commercial | High | Med | `/ai-tao-content` (new) |
| công cụ content marketing tự động | Commercial | Med | Low | `/marketing-automation` (new) |
| AI viết bài quảng cáo Facebook | Commercial | High | Low | `/ai-viet-quang-cao-facebook` (new) |
| AI viết caption TikTok | Commercial | Med | Low | `/ai-caption-tiktok` (new) |
| Jasper AI tiếng Việt | Comparison | Med | Low | `/so-sanh/flowa-vs-jasper` (new) |

### Cluster 2 — Authority/GEO keywords (long-form)
- "Cách AI thay đổi marketing 2026"
- "Brand voice là gì + cách xây dựng"
- "Content pillar strategy cho SME Việt Nam"
- "GEO là gì — Generative Engine Optimization"
- "AI agent marketing khác gì AI writing tool"
- "Content calendar cho phòng khám/spa/F&B" (per industry)

### Cluster 3 — Top of funnel (volume)
- "Caption Facebook hay" / "Mẫu caption Instagram"
- "Hashtag TikTok thịnh hành"
- "Cách viết tiêu đề thu hút"
- "Lịch nội dung mạng xã hội template"
- "Câu chuyện thương hiệu mẫu"

### Cluster 4 — Programmatic (long-tail x 42 ngành)
Pattern: `AI content cho {ngành}` × 42 = 42 pages
Ví dụ: `/ai-content-cho-spa-tham-my`, `/ai-content-cho-phong-kham-nha-khoa`, `/ai-content-cho-nha-hang`, `/ai-content-cho-bat-dong-san`, `/ai-content-cho-giao-duc`...

---

## Phần 3 — Roadmap 6 tháng

```text
Tháng 1  ─── FOUNDATION ─────────────────────────────────────
  Week 1-2: Technical fixes + GEO components + internal linking
  Week 3-4: Programmatic page template + 10 industry pages launch

Tháng 2  ─── SCALE PROGRAMMATIC ─────────────────────────────
  Week 5-6: 32 industry pages còn lại + image sitemap
  Week 7-8: 5 comparison pages (vs Jasper/Copy.ai/ChatGPT/Canva/Buffer)

Tháng 3  ─── FEATURE LANDING PAGES ──────────────────────────
  10 use-case pages: /ai-viet-quang-cao-facebook,
  /ai-caption-tiktok, /ai-blog-seo, /content-calendar-tu-dong,
  /brand-voice-ai, /carousel-ai, /ai-video-script,
  /multi-channel-publishing, /compliance-y-te, /geo-engine

Tháng 4  ─── CONTENT FLYWHEEL ───────────────────────────────
  8-12 long-form blog posts (3000+ words, GEO-optimized)
  Hub pages: /blog/ai-marketing, /blog/content-strategy,
  /blog/social-media

Tháng 5  ─── OFF-PAGE + AUTHORITY ───────────────────────────
  PR/HARO, guest posts, directory submissions
  Free tools (lead magnets): "Brand voice analyzer", "Content
  calendar generator", "Caption AI free"

Tháng 6  ─── OPTIMIZE + EXPAND ──────────────────────────────
  CTR optimization (title/meta rewrites theo GSC data)
  Content refresh top 10 pages
  Internal linking audit + topic cluster consolidation
```

---

## Phần 4 — Technical Implementation cần code

### 4.1. Programmatic SEO infrastructure (Tháng 1, ưu tiên CAO)

**A. DB schema mới — `seo_landing_pages` table**
```sql
CREATE TABLE seo_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  page_type text NOT NULL, -- 'industry' | 'comparison' | 'use_case' | 'feature'
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  intro_html text,
  sections jsonb,           -- [{heading, body_html, image_url, schema_type}]
  faqs jsonb,               -- [{q, a}]
  related_slugs text[],
  cta_label text DEFAULT 'Dùng thử miễn phí',
  cta_url text DEFAULT '/auth/signup',
  industry_id uuid REFERENCES industry_jurisdiction_profiles(id),
  hero_image text,
  og_image text,
  is_published boolean DEFAULT false,
  last_seo_score int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: public SELECT WHERE is_published; admin write
```

**B. Dynamic route**
- Add `<Route path="/lp/:slug" element={<DynamicLandingPage />} />` trong `src/landing/routes.tsx`
- Hoặc rewrite-style: `/ai-content-cho-:industry`, `/so-sanh/:competitor`, `/cong-cu/:tool` — 3 routes riêng cho UX rõ.

**C. Component `DynamicLandingPage`**
- Reuse `SEOHead` + render sections từ DB.
- Auto-emit Schema: `Article` + `FAQPage` + `BreadcrumbList` + `Product` (cho comparison pages).
- Component con `<GEOAnswerBlock>`: render TL;DR box + key-stats + definition card với schema `DefinedTerm`.

**D. Sitemap plugin update** (`scripts/sitemap-plugin.ts`)
- Fetch thêm `seo_landing_pages` published → merge vào sitemap.
- Add `<image:image>` entries cho mỗi landing page có `hero_image`.

**E. Admin UI** (`/admin/seo-pages`)
- Trang quản lý landing pages: create/edit/preview/publish.
- Bulk generator: chọn ngành → AI tự generate H1 + sections + FAQs (dùng `generate-multichannel` infra hiện có với template prompt mới).

### 4.2. GEO Optimization (Tháng 1)

**Components mới trong `src/landing/components/seo/`:**
- `<TLDRBox>` — answer-engine friendly summary block (3-5 bullets)
- `<DefinitionCard>` — định nghĩa thuật ngữ + schema `DefinedTerm`
- `<KeyStats>` — số liệu trong card với schema `Dataset` mini
- `<ComparisonTable>` — schema `Table` + Product comparison
- `<FAQAccordion>` — đã có trong `FAQSection`, generalize ra reusable

**SEOHead extension:** thêm `<SpeakableSchema>` cho hero/TLDR (Google Assistant), `<HowToSEOSchema>` cho tutorial posts.

### 4.3. Internal Linking System

- Tạo `src/lib/seo/topicClusters.ts`: define hub-spoke map
- Component `<RelatedContent>` ở mọi blog/landing — query `related_slugs` + cluster.
- Hub pages mới: `/blog/ai-marketing` (hub cho cluster AI), `/blog/content-strategy`, `/blog/social-media`, `/blog/nganh-nghe`.

### 4.4. Content tooling cho lead-gen

- **Free tool 1**: `/cong-cu/caption-ai-mien-phi` — gọi `generate-multichannel` với rate-limit 5 lần/ngày/IP, gate email sau lần 3.
- **Free tool 2**: `/cong-cu/brand-voice-analyzer` — paste URL/text → AI analyze 6 traits → CTA upgrade.
- **Free tool 3**: `/cong-cu/content-calendar-generator` — chọn ngành + tháng → tạo 30-day calendar PDF download (gate email).
- Edge function mới: `seo-free-tool-rate-limit` (IP-based, 5/day, anonymous).

### 4.5. Performance & Core Web Vitals

- Lazy-load all sections dưới fold (`React.lazy` cho `IndustryMemorySection`, `TestimonialsSection`).
- Image optimization: convert og-image + hero PNG → WebP/AVIF, add `<picture>` srcset.
- Preload critical font weight only (400, 600).
- Audit current LCP/CLS qua web-vitals events trong GA4 → fix top offenders.

### 4.6. Image SEO

- Bulk rename storage images theo pattern `{slug}-{descriptive-alt}.webp`.
- Thêm `alt` text bắt buộc validation cho mọi blog post.
- Image sitemap entries trong sitemap plugin (đã có scaffolding).

### 4.7. Analytics enhancement

- GA4 conversion events: `signup_started`, `signup_completed`, `pricing_viewed`, `free_tool_used`, `lead_captured`.
- Custom dimension: `landing_page_type` (industry/comparison/use_case) → đo conversion theo loại.
- Weekly email digest từ GA4 → admin dashboard `/admin/seo-analytics`.

---

## Phần 5 — Content Operations (no-code)

### 5.1. Content production workflow (dùng chính Flowa)
1. AI Agent generate draft từ keyword brief (template prompt SEO).
2. Human edit (45 min/post): add E-E-A-T signals (author bio, screenshots, real cases).
3. Run GEO check: TL;DR present? FAQ ≥5? Stats with sources? Internal links ≥3?
4. Publish → auto add to sitemap → ping IndexNow + GSC URL Inspection API.

### 5.2. Editorial calendar (Tháng 1-3)
| Week | Money | Authority | TOFU |
|---|---|---|---|
| 1 | `/ai-tao-content` | "AI Marketing Agent vs AI Writing Tool" | "20 mẫu caption Tết hay" |
| 2 | `/ai-viet-quang-cao-facebook` | "GEO là gì — full guide" | "Hashtag TikTok 2026" |
| 3 | 5 industry LP | "Brand voice — 7 framework" | "Content pillar template" |
| 4 | 5 industry LP | "Industry compliance VN — Y tế" | "Caption Tết Instagram" |
| 5-8 | 32 industry + 5 comparison | 4 long-form | 4 templates/list |

### 5.3. Off-page (Tháng 5-6)
- 10 directory submissions (G2, Capterra, Product Hunt, BetaList, AlternativeTo, SaaSHub VN equivalents).
- 5 guest posts: Brands Vietnam, AdAsia, Marketing AI, Tomorrow Marketers, RGB.vn.
- HARO/Connectively: trả lời 3 query/tuần về AI marketing.
- Partnership backlinks: integrate page với Zalo OA, Mailchimp VN, Haravan, Sapo.

---

## Phần 6 — Success Metrics (KPI 6 tháng)

| Metric | Baseline | Tháng 3 | Tháng 6 |
|---|---|---|---|
| Indexed pages | ~15 | 100+ | 200+ |
| Organic clicks/month (GSC) | <100 | 1,500 | 5,000 |
| Ranking keywords (top 10) | 0-5 | 30 | 100 |
| AI citations (ChatGPT/Perplexity test) | 0 | 5 | 20 |
| Free tool signups/month | 0 | 50 | 200 |
| Organic → paid conversion | — | 2% | 4% |
| Domain Rating (Ahrefs) | <5 | 15 | 25 |

---

## Phần 7 — Deliverables Tháng 1 (concrete)

Sau khi approve plan này, Tháng 1 sẽ implement:
1. Migration `seo_landing_pages` + RLS.
2. Routes + `DynamicLandingPage` component + 4 templates (industry/comparison/use-case/feature).
3. GEO components (`TLDRBox`, `DefinitionCard`, `KeyStats`, `ComparisonTable`).
4. Sitemap plugin update (merge landing pages + image entries).
5. Edge function `generate-seo-landing` (AI bulk-generate landing content cho 1 industry).
6. Admin UI `/admin/seo-pages`.
7. 10 industry pages đầu tiên (top 10 ngành theo signups Flowa hiện tại).
8. 1 long-form pillar post: "AI Marketing Agent — hướng dẫn toàn diện 2026" (3000+ words, GEO-optimized).
9. Free tool MVP: caption-ai-mien-phi.
10. GA4 conversion events setup.

**Estimate**: 3-4 tuần dev + content (Lovable build mode).

---

## Câu hỏi cuối trước khi triển khai

Sau khi approve, tôi có cần làm thêm:
- (a) Detail spec cho từng landing page template (industry/comparison) trước khi code không?
- (b) Tạo trước file mock content cho 1 industry page mẫu để bạn review tone/format trước khi bulk-generate?
- (c) Bắt đầu code thẳng theo plan này?
