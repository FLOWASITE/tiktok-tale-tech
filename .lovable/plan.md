## Mục tiêu
Cho phép admin cấu hình model AI cho luồng Import Brand (website + fanpage) tại trang **/admin/ai → Functions**, giống các function khác, kèm fallback chain để né lỗi 402.

## Hiện trạng
- `import-brand-extractor` đã đăng ký ở `useAIConfig.ts` (frontend catalog) và `ai-config.ts` (backend defaults). → Đã hiển thị trong Admin AI Functions ✅
- Tuy nhiên function thực thi `extractBrandSuggestions` đang gọi `callAI` truyền cứng `functionName: "import-brand-extractor"` mà không đọc `model_override` từ DB → admin đổi model sẽ không có hiệu lực nếu `callAI` không tự lookup. Cần xác nhận + bổ sung fallback model.
- Chưa có config riêng cho `import-brand-from-website` và `import-brand-from-fanpage` (đây là orchestrator, không trực tiếp gọi AI nhưng admin cần thấy để bật/tắt + theo dõi).

## Phạm vi triển khai

### 1. Đăng ký 2 orchestrator function vào catalog (UI Admin)
File: `src/hooks/useAIConfig.ts` (mục Brand Functions)
- Thêm `import-brand-from-website` — category `brand`, type `text`, default `google/gemini-2.5-flash`, tag `orchestrator`
- Thêm `import-brand-from-fanpage` — tương tự

### 2. Backend defaults
File: `supabase/functions/_shared/ai-config.ts`
- Thêm 2 entry tương ứng với `is_enabled: true` để admin có thể bật/tắt từ UI; orchestrator sẽ check `is_enabled` trước khi chạy.

### 3. Fallback model chain cho extractor (giải quyết edge case #1, #2 đã báo cáo)
File: `supabase/functions/_shared/brand-extractor.ts`
- Đọc config từ `getAIConfig('import-brand-extractor')` để lấy `model` + `fallback_models` (admin set).
- Nếu `callAI` trả 402/429 → tự retry với `google/gemini-2.5-flash-lite` rồi `google/gemini-3-flash-preview`.
- Nếu vẫn fail → return error code chuẩn (`AI_QUOTA_EXHAUSTED`) thay vì string mơ hồ.

File: `supabase/functions/import-brand-from-website/index.ts` + `import-brand-from-fanpage/index.ts`
- Map error code `AI_QUOTA_EXHAUSTED` → HTTP 402 (giữ nguyên status từ AI gateway thay vì 502).

### 4. Frontend xử lý 402
File: `src/hooks/useBrandImport.ts`
- Detect status 402 → toast với CTA "Nạp thêm credit" trỏ tới `/settings/usage` (tận dụng `QuotaExhaustedBanner` pattern đã có).

### 5. Kiểm tra trước khi gọi
File: `import-brand-from-website/index.ts` + `import-brand-from-fanpage/index.ts`
- Trước khi tốn Firecrawl/FB API, gọi `getAIConfig('import-brand-extractor')` — nếu `is_enabled === false` → trả 503 với message "Tính năng Import Brand đang tạm ngưng (Admin)".

## Không làm trong phạm vi này
- Cache scrape per URL (edge case #3) — sẽ tách task riêng
- Rate-limit per user (edge case #4)
- Same-origin validation cho `extra_paths` (edge case #5)
- Auto-fill `logo_url` từ `og_image` (edge case #6) — task UI riêng

## Verification
- Mở `/admin/ai` → Functions → search "import" → thấy 3 function (extractor + 2 orchestrator), có thể đổi model + toggle.
- Test: tắt `import-brand-extractor` → bấm Import từ UI → nhận thông báo "tạm ngưng" (không tốn Firecrawl).
- Test: với account đang 402 credit → nhận toast "Nạp credit" thay vì lỗi mơ hồ.
