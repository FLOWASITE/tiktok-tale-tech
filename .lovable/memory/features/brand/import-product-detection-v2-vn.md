---
name: Brand Import Product Detection v3
description: 5-layer product extraction in import-brand-from-website (JSON-LD/OG/microdata + expanded HTML cards/containers, multi-source sitemap with subdomain fallback, AI enrich with confidence filter, OG enrichment for missing images, markdown regex fallback)
type: feature
---

## Pipeline (`supabase/functions/import-brand-from-website/index.ts`)

### Layer 1 — `extractStructuredProducts(html, baseUrl)`
- JSON-LD `Product|Service|IndividualProduct|ProductModel|Offer` (incl. `ItemList`/`OfferCatalog` walking).
- OpenGraph `og:type=product` + `product:price:*`.
- Microdata `itemtype="schema.org/Product|Service"`.
- **HTML cards 4a (anchor)**: `<a>` matching `PRODUCT_PATH_LEAF_RE` (must have a slug — blocks category roots like `/products/`) containing `<img>`. Uses `extractImgFromBlock` to also catch `data-src`, `data-original`, `data-lazy-src`, `srcset`, `background-image: url()`.
- **HTML cards 4b (container)**: `<article|li|div|section class="product-item|product-card|woocommerce-loop-product|grid__item|sapo-product|haravan-product|nv-product|...">` blocks. Picks first leaf-path `<a>` + first H1-H6 / anchor / img-alt as title; works even when `<img>` is sibling of `<a>` or anchor wraps only the title.
- Price detection uses `PRICE_ANY_RE` = standard `PRICE_RE` ∪ `PRICE_RE_VN` (`500k`, `2tr5`, `1.5 triệu`, `Liên hệ`, `contact for price`).
- Cap raised: 20 → 40 per-page work cap; 15 → 25 final returned.
- Source labels: `jsonld | opengraph | microdata | html | html-card`.

### Layer 2 — Multi-source sitemap (always runs, in parallel)
- Firecrawl `/v2/map` AND direct fetch of `/sitemap.xml`, `/sitemap_index.xml`, `/product-sitemap.xml`, `/product_sitemap.xml`, `/sitemap-products.xml`, `/sitemap_products.xml` via `fetchSitemapUrls()` (1.5s timeout each, free, parses `<loc>`).
- `<sitemapindex>` recurses 1 level into product-related child sitemaps.
- Filters by same-origin OR same e-TLD (`shop.brand.vn` accepted) + `PRODUCT_PATH_LEAF_RE` + not-already-scraped.
- **Subdomain fallback**: if pool < 3 and homepage links to `*.<root>`, retries `firecrawlMap(includeSubdomains: true)`.
- Scrape budget: 0 if structured ≥ 5 (skip extra), else top 5 product URLs with `["markdown","rawHtml"]` (was 3).

### Layer 3 — Cross-page enrichment
`enrichProductFromUrl()` for ≤ 4 structured products that have `source_url` but missing `image_url` or `description`. Scrapes the URL once and pulls `og:image`, meta description, or first `<img class*="product">`. Surfaces `enriched_count` in meta.

### Layer 4 — AI (`extractProductSuggestions` with `structuredHints`)
- **Sub-pages first, homepage last** in combined content (40k slice less likely to truncate product pages).
- Per sub-page slice raised 4000 → 5000 chars.
- AI cap raised 10 → 15 products; merge cap raised 12 → 15.
- Prompt: structured list MUST be kept verbatim; only ADD when there's clear name + price/CTA/"add to cart".
- New optional `confidence: "high"|"medium"|"low"` field — filter low when no structured hint exists.
- Multi-provider fallback chain unchanged: admin → qwen-turbo → Gemini Flash → Flash-Lite.

### Layer 5 — Markdown regex fallback
`extractProductsFromMarkdown()` runs only when `final < 3`. Two patterns:
- A: heading/bold title followed within 3 lines by a price line.
- B: bullet `- Name: 500k` / `- Name — Liên hệ`.
Filters generic words (`about`, `liên hệ`, `categor*`, `home`). Cap 8. Source label `markdown`.

## Meta surfaced (`raw_meta.product_suggestions_meta`)
`{ count, structured_count, ai_count, enriched_count, markdown_fallback_count, final_count, sources, sitemap_used, sitemap_sources, subdomain_used, error?, model? }`.

## UI (`src/components/brand/BrandImportDialog.tsx`)
Banner now shows enriched + markdown-fallback counts. Chips: `schema.org` (preferred) | `HTML card` | `heuristic` (when markdown fallback contributed).

## Why v3 vs v2
- v2 sitemap fallback only ran when structured < 3, single-source, easily missed VN sites without schema.org.
- v2 HTML card heuristic required `<img>` directly inside the anchor — missed sibling-img layouts (Sapo, Haravan, NukeViet, custom landing).
- v2 missed VN price formats (`500k`, `2tr5`, `Liên hệ`).
- v2 had no enrichment loop → many structured products had no image.
- v2 had no markdown fallback → empty result when both schema and AI fail.
- v3 fixes all 5 + always runs sitemap discovery in parallel + adds subdomain detection.
