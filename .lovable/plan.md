## Mục tiêu
Khi user Import Brand từ website, hệ thống tự động phát hiện và gợi ý danh sách **sản phẩm/dịch vụ** từ nội dung scrape được, để user chọn add vào `brand_products` ngay trong wizard — không phải nhập tay từng cái.

## Flow đề xuất

```text
[Import Website URL]
   ↓ Firecrawl scrape (markdown + rawHtml + links)
   ↓ extract-brand-from-website (đã có)
   ↓ NEW: extract-products-from-website (Gemini Vision + text)
[Brand Import Dialog]
   ├─ Tab "Thông tin chung" (đã có: name, voice, color, logo)
   └─ Tab "Sản phẩm gợi ý" (MỚI)
       ├─ List 5-15 SP với checkbox
       │   • name, category, description, price (nếu detect)
       │   • image_url (lấy từ <img> trong product card)
       │   • USP suggestions (3 bullet)
       └─ [Chọn tất cả] [Bỏ qua] [Import N sản phẩm]
   ↓ Save → bulk insert vào brand_products
```

## Phần Backend

**Edge function mới: `suggest-products-from-website`**
- Input: `website_url`, `brand_template_id` (optional, nếu null thì preview only)
- Pipeline:
  1. Reuse Firecrawl scrape (cache lại từ `import-brand-from-website` nếu vừa chạy → tránh double credit)
  2. Tìm các URL có pattern `/product/`, `/shop/`, `/san-pham/`, `/dich-vu/`, `/services/` từ `links[]` → ưu tiên scrape top 10
  3. Hoặc detect product cards trong HTML chính (schema.org `Product`, `og:type=product`, `<article class*=product>`)
  4. Gọi Gemini 2.5 Flash với tool calling, schema:
     ```ts
     { products: [{ name, category, description, price_display, image_url, usp[3], keywords[] }] }
     ```
  5. **Soft-fail 402/429** y như `suggest-industry`: trả `{ products: [], fallback: true, errorCode }`
- Output: `{ products: ProductSuggestion[], source_urls: string[], cached: boolean }`

**Tái sử dụng:**
- `_shared/brand-extractor.ts` pattern (tool calling + AI gateway)
- `analyze-product-image` cho enrichment ảnh nếu user accept

## Phần Frontend

**`src/components/brand/ProductSuggestionsStep.tsx`** (mới)
- Hiển thị grid các product card với checkbox + thumbnail
- Inline edit: sửa name/price trước khi import
- Bulk action: "Chọn tất cả featured", "Chỉ nhập sản phẩm có ảnh"

**Integration điểm:**
- `BrandImportDialog.tsx` → thêm step "Sản phẩm" sau "Visual"
- `BrandCreate.tsx` → sau khi save brand template → bulk insert via `useProductCatalog.createProduct` (loop hoặc tạo `bulkCreate`)

**Hydration:**
- Lưu suggestions vào `importedProductsRef` để không mất khi user chuyển step

## Edge cases & guardrails
- **No products detected** → ẩn step, không block flow
- **Trùng tên** → warn "Đã có sản phẩm tương tự" (fuzzy match)
- **Credit exhausted (402)** → toast "Hết credit AI, bạn có thể nhập sản phẩm thủ công sau"
- **Rate limit Firecrawl** → reuse cached scrape, không gọi lại
- **Ảnh sản phẩm là external URL** → lưu trực tiếp `image_url` (giống logo flow), không re-upload

## Câu hỏi cần xác nhận trước khi build
1. Giới hạn số SP gợi ý mặc định: **5, 10, hay 15**?
2. Có muốn cho phép gợi ý thêm từ **Fanpage** (qua `import-brand-from-fanpage` + analyze post images) không, hay chỉ Website ở phase này?
3. Khi Brand chưa save mà đã chọn SP → lưu tạm `sessionStorage` rồi insert sau khi `brand_template_id` có, hay chặn cho đến khi brand save xong?

Trả lời 3 câu trên rồi mình sẽ tinh chỉnh plan và bắt tay implement.