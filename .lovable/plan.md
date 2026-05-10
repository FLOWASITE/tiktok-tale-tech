## Mục tiêu
Tăng độ chính xác khi import Brand:
1. **Footer** (công ty / địa chỉ / SĐT / email / website / social links / MST) — hiện chưa được trích xuất.
2. **Logo** — đang lấy nhưng còn nhiễu (favicon nhỏ, og:image banner). Cần ranking tốt hơn + nguồn mới (JSON-LD, `<header>` logo).

## 1. Footer extraction (website)

**File:** `supabase/functions/import-brand-from-website/index.ts`

Thêm hàm `extractFooterSignals(html, baseUrl)` chạy ngay sau `extractVisualSignals`:

- Cô lập khối `<footer>...</footer>` (lấy block cuối nếu có nhiều). Nếu không có `<footer>`, fallback sang 30% cuối của `<body>`.
- Strip HTML → text, rồi regex pattern (Vietnam-aware):
  - **Email**: `/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi` + ưu tiên `mailto:`
  - **Phone VN**: `/(?:\+84|0)(?:\d[\s.-]?){8,10}\d/g` + ưu tiên `tel:`
  - **Tax code (MST)**: `/(?:MST|Mã số thuế|Tax code)[:\s]*([0-9]{10}(?:-[0-9]{3})?)/i`
  - **Address**: lookup keyword "Địa chỉ", "Address", "Trụ sở", "Văn phòng" → lấy 1 dòng kế tiếp (max 200 chars). Hoặc lấy `itemprop="address"`.
  - **Company name**: từ "Công ty", "Co., Ltd", "JSC" trong footer; fallback `og:site_name`; fallback domain.
  - **Website**: dùng `targetUrl` (canonical) — không cần extract.
- **Social links**: scan toàn bộ `<a href>` (cả footer + header) match domain whitelist: `facebook.com`, `instagram.com`, `youtube.com`, `tiktok.com`, `linkedin.com`, `twitter.com|x.com`, `threads.net`, `zalo.me|zalo.vn|zalo.com`, `pinterest.com`, `t.me` → output object `{ facebook: url, instagram: url, ... }`. Ignore share/intent links (`facebook.com/sharer`, `twitter.com/intent/tweet`).
- Bonus: parse JSON-LD `<script type="application/ld+json">` tìm `Organization`/`LocalBusiness` → `name`, `address` (PostalAddress), `telephone`, `email`, `sameAs[]` → nguồn ưu tiên cao hơn regex.

Output shape (camelCase, gắn vào `raw_meta.footer_info`):
```ts
{
  company_name: string | null,
  address: string | null,
  phone: string | null,
  email: string | null,
  website: string | null,
  tax_code: string | null,
  social_links: Record<string, string>,  // { facebook, instagram, ... }
}
```

## 2. Logo extraction nâng cấp

**File:** `supabase/functions/import-brand-from-website/index.ts`, refactor `extractVisualSignals`.

Thêm 3 nguồn mới + scoring:
- **JSON-LD Organization.logo** (highest score, 100): parse JSON-LD blocks.
- **`<header>` `<img>`**: ưu tiên img nằm trong `<header>` hoặc class chứa `nav|navbar|brand|logo`.
- **Filter rác**:
  - Loại URL có pattern `1x1`, `pixel`, `tracking`, `gtag`, `gtm`.
  - Loại favicon < 32px nếu xác định được từ `sizes="16x16"`.
  - Loại og:image quá rộng (banner) — KHÔNG loại trực tiếp, chỉ giảm score (vẫn hiển thị làm fallback).
- **Scoring** mỗi candidate: SVG +30, có "logo" trong URL/alt/class +20, từ JSON-LD +50, apple-touch-icon +15, og:image +10, favicon +5, twitter:image +8.
- **Sort desc theo score**, dedupe url → trả `logo_candidates: [{ url, source, score }]`.
- `logo_url` (default) = top 1 sau sort thay vì first inserted.

## 3. AI prompt + tool schema

**File:** `supabase/functions/_shared/brand-extractor.ts`

- Thêm field `footer_info` vào `BrandSuggestion` interface + `TOOL_SCHEMA`:
  ```ts
  footer_info?: {
    company_name?: string | null,
    address?: string | null,
    phone?: string | null,
    email?: string | null,
    tax_code?: string | null,
  } | null
  ```
- Update `SYSTEM_PROMPT`: thêm rule "Extract footer_info từ legal/contact section ở cuối trang. Không bịa số điện thoại / địa chỉ".
- Sanitize trong return: trim + length cap.

## 4. Merge regex + AI footer

**File:** `import-brand-from-website/index.ts` (response builder)

Footer cuối cùng = **regex extraction (deterministic) merge với AI footer_info (smarter)**:
- Regex thắng cho: phone, email, tax_code (vì AI hay bịa số).
- AI thắng cho: company_name, address (vì format tự nhiên hơn).
- Social links: chỉ regex (deterministic).

Gắn vào response:
```ts
raw_meta: {
  ...existing,
  footer_info: mergedFooter,
}
```

## 5. Frontend hydrate + dialog

**File 1:** `src/hooks/useBrandImport.ts` — thêm `'footer_info'` vào union `ImportableField`.

**File 2:** `src/components/brand/BrandImportDialog.tsx`
- Thêm vào `ALL_FIELDS`: `{ key: 'footer_info', label: 'Thông tin footer (SĐT, địa chỉ, MST)', group: 'Contact' }` và `{ key: 'social_links', label: 'Liên kết mạng xã hội', group: 'Contact' }` (nếu social_links có data).
- `useEffect` auto-select: nếu `result.raw_meta.footer_info` có ≥1 field non-null → check `footer_info`.
- `renderPreviewValue('footer_info')`: trả `"company • phone • email • address"` (truncate).
- `buildUpdates()`: nếu chọn `footer_info` → set `updates.footer_info = { ...result.raw_meta.footer_info, social_links: result.raw_meta.footer_info?.social_links }`.

**File 3:** `src/pages/BrandCreate.tsx` (hydrate effect line 219-255)
- Sau khối hydrate logo/color, thêm:
  ```ts
  const footer = meta.footer_info;
  if (footer && (footer.company_name || footer.phone || footer.email || footer.address)) {
    setFooterInfo({
      company_name: footer.company_name || '',
      phone: footer.phone || '',
      email: footer.email || '',
      website: footer.website || meta.source_url || '',
      address: footer.address || '',
      social_links: footer.social_links || undefined,
    });
  }
  ```

## 6. Fanpage parity

**File:** `supabase/functions/import-brand-from-fanpage/index.ts`
- Mở rộng Graph API `fields=`: thêm `emails,phone,single_line_address,location,whatsapp_number`.
- Build `footer_info` trực tiếp từ Graph response → gắn vào `raw_meta.footer_info`.
- Social links: thêm fanpage URL chính (`https://facebook.com/${pageId}`) + `infoData.website` (nếu khác).

## Out of scope
- Không đổi UI BrandViewOverviewTab (đã render footer_info sẵn).
- Không touch `_shared/middleware/perf.ts` hay AI provider.
- Không thêm field mới vào DB (footer_info đã là JSONB column).
- Không scrape sub-pages thêm để tìm footer (footer thường ở mọi page → homepage là đủ).

## Verify
1. `curl_edge_functions` POST `import-brand-from-website` `{ url: "https://taf.vn", stream: false }` → response chứa `raw_meta.footer_info` non-null + `logo_candidates` đã sort theo score.
2. UI: `/brands/new` → Import Website `taf.vn` → preview dialog hiển thị nhóm "Contact" với footer + social → tích → Tiếp tục → form BrandCreate auto-fill footer step.
3. Test fanpage: import 1 fanpage có phone/address → footer step được fill.
