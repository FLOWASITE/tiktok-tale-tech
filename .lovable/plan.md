## Vấn đề

Admin đã set `import-brand-from-website` dùng **DashScope/Alibaba (Qwen)** trong `/admin/ai`, nhưng product extraction vẫn fail `CREDITS_EXHAUSTED` vì:

- `extractProductSuggestions` (line 696-792) **fetch trực tiếp** `https://ai.gateway.lovable.dev` với hard-code `model: "google/gemini-2.5-flash"` → bỏ qua admin config hoàn toàn.
- `extractBrandSuggestions` (shared) đã dùng `callAI()` đúng với multi-provider fallback Qwen → Lovable Gateway, nên brand extract OK; chỉ product extract fail.
- `suggest-products-from-website` (nút "Gợi ý từ Website" tay) cũng cùng pattern hard-code → cùng bug.

## Hướng fix

### 1. `supabase/functions/import-brand-from-website/index.ts`
- Refactor `extractProductSuggestions` → dùng `callAI({ functionName, organizationId, messages, tools, tool_choice })` từ `_shared/ai-provider.ts` thay vì fetch raw.
  - Tận dụng admin override (DashScope Qwen) + multi-provider fallback có sẵn (Qwen Plus → Qwen Turbo → Lovable Gateway Gemini Flash → Flash-Lite) giống `extractBrandSuggestions`.
  - Truyền `organizationId` từ `runImport` xuống (hiện chưa pass).
- Đăng ký function name `import-brand-products` (hoặc reuse `import-brand-from-website`) trong `AI_FUNCTIONS` registry để admin có thể override riêng nếu muốn — phương án ngắn gọn: reuse cùng functionName để 1 lần config áp cho cả brand + product.
- Map `tool_calls` từ kết quả `callAI` (đã chuẩn hoá OpenAI-compatible).
- Surface error code rõ trong `product_suggestions_meta.error` + log model thực tế đã dùng (`product_suggestions_meta.model`).

### 2. `supabase/functions/suggest-products-from-website/index.ts`
- Áp cùng refactor: bỏ fetch raw, dùng `callAI(functionName: "suggest-products-from-website", organizationId, …)` với fallback chain.
- Trả `errorCode: "CREDITS_EXHAUSTED" | "RATE_LIMIT"` rõ ràng để UI toast cụ thể qua `parseEdgeFunctionError`.

### 3. `src/hooks/useAIConfig.ts` (registry `AI_FUNCTIONS`)
- Đảm bảo có entry `import-brand-from-website` (đã có) — verify entry hiện ghi `currentModel` là `qwen-plus` hay `gemini-2.5-flash`. Nếu không khớp với model thực dùng → cập nhật để admin badge hiển thị đúng.
- Thêm entry `suggest-products-from-website` nếu chưa có.

### 4. `src/components/brand/BrandImportDialog.tsx`
- Đọc `raw_meta.product_suggestions_meta.error`. Nếu có lỗi → hiển thị 1 dòng cảnh báo nhỏ dưới palette: "Không trích được sản phẩm tự động (AI hết quota). Có thể thêm tay ở bước Sản phẩm." Không block import.

## Test
1. Admin set DashScope `qwen-plus` cho `import-brand-from-website` → import `taf.vn` → log show `[callAI] provider=dashscope model=qwen-plus`, `product_suggestions.length > 0`.
2. Force Qwen 402 → fallback Lovable Gateway thành công.
3. Tất cả provider fail → import vẫn 200, banner cảnh báo hiện trong dialog.
4. Bấm "Gợi ý từ Website" tay sau khi đã có DashScope config → cũng dùng Qwen, không hard-code Gemini.

## Không động đến
- `extractBrandSuggestions` (đã đúng).
- Schema DB, RLS, Firecrawl pipeline.
- `BrandCreate.tsx` hydrate logic.
