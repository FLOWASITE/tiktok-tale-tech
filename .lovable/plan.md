## Mục tiêu
Khi user import brand từ website (BrandImportDialog) → AI trích luôn danh sách **Sản phẩm/Dịch vụ** trong cùng lượt scrape, đính kèm vào payload import. Bước "Sản phẩm" trong wizard sẽ pre-populate từ data đó (kèm checkbox cho user xác nhận), không cần click "Gợi ý từ Website" lần thứ 2 (nút giữ lại làm fallback/refetch).

## Vì sao
- Edge function `import-brand-from-website` đã scrape homepage + auto-discover subpage chứa `san-pham`, `dich-vu`, `services`, `products`. Toàn bộ markdown đã có sẵn trong `combinedContent` truyền cho AI extractor.
- Hiện tại AI chỉ extract brand fields. Bước products lại gọi `suggest-products-from-website` → scrape lại lần 2 (Firecrawl tốn credit + chậm + UX rời rạc).
- Gộp vào 1 lượt: tiết kiệm Firecrawl, kết quả đến cùng lúc với brand info, user thấy ngay sản phẩm đề xuất ở step Products.

## Thay đổi

### 1. Edge function `import-brand-from-website/index.ts`
- Boost subpage discovery: tăng `discoverSubpages` cap **3 → 5** và ưu tiên các path khớp `san-pham|dich-vu|services?|products?|shop|collections?|courses?` (rerank để product page chắc chắn được scrape khi tồn tại).
- Sau khi `extractBrandSuggestions` xong, gọi thêm 1 LLM call song song (`extractProductSuggestions`) dùng `combinedContent` đã có sẵn — **không scrape lại Firecrawl**. Tool-call schema giống `suggest-products-from-website` (name, category, description, price_display, image_url, USPs, keywords, source_url), max 10 items, locale-aware.
- Nếu LLM call này lỗi/quota → swallow, log warn, trả `product_suggestions: []` + `product_suggestions_error: code` (không fail toàn bộ import).
- Append vào response:
  ```json
  raw_meta: {
    ...,
    product_suggestions: ProductSuggestion[],
    product_suggestions_meta: { source: "import", error?: "RATE_LIMIT" | ... }
  }
  ```
- Stream branch: emit thêm `progress { step: "ai_products", percent: 75 }` trước khi parse.

### 2. `BrandImportDialog.tsx`
- Thêm preview row mới "Sản phẩm phát hiện" (collapsed bằng `Collapsible`) dưới palette: hiển thị badge `N sản phẩm` + danh sách tên ngắn gọn, có checkbox toàn bộ (mặc định tick) — không yêu cầu user chọn từng cái ở đây để giữ dialog gọn.
- Khi user `Apply`, đính kèm `product_suggestions` (kèm flag selected) vào payload `importedSuggestion.raw_meta.product_suggestions` (đã có sẵn từ edge → chỉ cần forward).

### 3. `BrandCreate.tsx` (hydrate)
- Trong `useEffect` hydrate (line 267): nếu `meta.product_suggestions?.length`, map thành `LocalProduct[]` với `id: temp-import-{i}`, `is_active: true`, gắn vào state `localProducts` (chưa có thì khởi tạo, có rồi thì merge dedupe theo `name.toLowerCase()`).
- Toast bổ sung: "Đã đề xuất N sản phẩm từ website".

### 4. `BrandFormStepProducts.tsx`
- Banner mới (chỉ hiện nếu có `localProducts` mang prefix `temp-import-`): "N sản phẩm tự động từ website. Hãy chỉnh hoặc xoá nếu không phù hợp."
- Giữ nút "Gợi ý từ Website" làm tùy chọn refetch (vẫn dùng `SuggestProductsFromWebsiteDialog` cũ — không bỏ, vì user có thể đổi `websiteUrl` hoặc muốn rescan).

### 5. Không động đến
- `suggest-products-from-website` (giữ làm refetch backend).
- Schema DB (`brand_products`) — không cần migration.

## Test
1. Import `https://taf.vn` → mong đợi `raw_meta.product_suggestions` có ≥1 sản phẩm, dialog hiện preview, vào BrandCreate step "Sản phẩm" thấy danh sách đã pre-populate.
2. Website không có product page → `product_suggestions: []`, không hiện banner, nút "Gợi ý từ Website" vẫn dùng được.
3. AI quota exhausted → import brand vẫn thành công, products rỗng, log warn.