---
name: Brand Import Product Detection v2
description: 4-layer product extraction in import-brand-from-website (JSON-LD/OG/microdata/HTML cards → sitemap map fallback → AI enrich → merge); structured wins on name/price/image, AI wins on description/USP
type: feature
---

## Pipeline (`supabase/functions/import-brand-from-website/index.ts`)

### Layer 1 — `extractStructuredProducts(html, baseUrl)`
Parses (in order, dedup by `slugifyName`):
- JSON-LD `@type: Product | Service | IndividualProduct | ProductModel | Offer` (incl. `ItemList`/`OfferCatalog` walking).
- OpenGraph `og:type=product` + `product:price:*`.
- Microdata `itemtype="schema.org/Product|Service"`.
- HTML product cards: `<a>` with path matching `PRODUCT_PATH_RE` (`/product|/san-pham|/dich-vu|/shop|/p|/collection|/course/...`), containing `<img>`, with optional price regex.
- Returns `ProductSuggestion[]` with `source: jsonld|opengraph|microdata|html`. Cap 15.

### Layer 2 — Sitemap fallback
- Triggered only when `structuredProducts.length < 3` after homepage + sub-pages.
- `firecrawlMap(targetUrl, "product san-pham dich-vu service shop", 30)` via `/v2/map`.
- Filter same-origin + `PRODUCT_PATH_RE`, dedupe vs already-scraped, take top 3, scrape with `["markdown","rawHtml"]`, re-run Layer 1.

### Layer 3 — AI (`extractProductSuggestions` with `structuredHints`)
- Prompt: structured list is ground truth (do not rename/remove); refuse to pad < 2 real products; content slice 40k chars (was 25k); sub-pages prefixed `## Source: <url>`.
- Existing multi-provider fallback chain preserved: admin override → qwen-turbo → Gemini Flash → Flash-Lite.

### Layer 4 — `mergeProducts(structured, ai)`
- Structured wins: `name`, `price_display`, `image_url`, `source_url`.
- AI wins: `description`, `unique_selling_points`, `keywords`, `category`.
- Cap 12.

## Sub-page changes
- All sub-pages now scraped with `["markdown","rawHtml"]` (Firecrawl returns both in same call → no extra credits) so Layer 1 can mine them.
- `discoverSubpages` cap raised 6 → 8.

## Meta surfaced (`raw_meta.product_suggestions_meta`)
`{ count, structured_count, ai_count, final_count, sources: ("jsonld"|"opengraph"|"microdata"|"html"|"ai")[], sitemap_used, error?, model? }`.

## UI (`src/components/brand/BrandImportDialog.tsx`)
- Emerald banner: shows `final_count` + how many came from schema; `schema.org` chip when JSON-LD/OG/microdata contributed.
- Amber banner: shown when `final_count === 0` (separate from quota error message).

## Why
Old flow: 1 homepage markdown + max 5 nav sub-pages → AI guesses → fails on landing pages, Shopify catalogs, taf.vn-style sites. New flow gets deterministic ground truth from schema.org markup most modern sites publish, falls back to sitemap when missing, only uses AI to enrich. Recall jumps without extra Firecrawl/AI quota.
