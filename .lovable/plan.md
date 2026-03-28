

# Refactor 3 GEO Edge Functions để sử dụng `callAI` tập trung

## Vấn đề
3 edge functions GEO gọi thẳng `https://ai.gateway.lovable.dev/...` với model hardcoded, bỏ qua hoàn toàn hệ thống `callAI()` từ `_shared/ai-provider.ts`. Kết quả: dù Admin đã cấu hình model Qwen (DashScope) trong trang Cài đặt, các function GEO vẫn dùng Lovable Gateway → hết credits thì lỗi 402.

Hệ thống `callAI()` đã xử lý đầy đủ: đọc model override từ DB → route đúng provider (DashScope, OpenRouter...) → fallback tự động. Chỉ cần chuyển sang dùng nó.

## Thay đổi

### 1. `supabase/functions/geo-score-content/index.ts`
- Import `callAI` từ `../_shared/ai-provider.ts`
- Xóa biến `MODELS`, `buildBody`, và vòng lặp fetch trực tiếp
- Thay bằng `callAI({ functionName: 'geo-score-content', organizationId, messages, tools, toolChoice })`
- Giữ nguyên prompt, tool schema, logic xử lý response (parse tool_calls)

### 2. `supabase/functions/geo-generate-schema/index.ts`
- Import `callAI` từ `../_shared/ai-provider.ts`
- Xóa fetch trực tiếp đến Lovable Gateway
- Thay bằng `callAI({ functionName: 'geo-generate-schema', messages })`
- Giữ nguyên prompt và logic clean JSON-LD

### 3. `supabase/functions/geo-track-competitors/index.ts`
- Import `callAI` từ `../_shared/ai-provider.ts`
- Xóa fetch trực tiếp đến Lovable Gateway
- Thay bằng `callAI({ functionName: 'geo-track-competitors', messages, tools, toolChoice })`
- Giữ nguyên prompt và logic parse competitive analysis

## Kết quả
- Cả 3 functions sẽ **dùng đúng model đã cấu hình** trong trang Cài đặt (ví dụ: `qwen-plus`) ngay từ đầu
- Không còn phụ thuộc vào Lovable Gateway credits
- Tự động hưởng circuit breaker, retry, và cost tracking từ `callAI()`

