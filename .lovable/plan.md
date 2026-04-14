

## Sửa lỗi "Không tạo được chủ đề"

### Nguyên nhân gốc

Từ logs edge function `topic-ai`, có 2 vấn đề:

1. **Web search vẫn gọi Perplexity trực tiếp** — dù code đã sửa để ưu tiên OpenRouter, function chưa được deploy lại. Logs cho thấy: `[Perplexity] API error: 401 - You exceeded your current quota`

2. **Thời gian xử lý quá dài (58s)** — model `qwen-plus` qua DashScope mất ~55 giây để generate topics, gây timeout ở phía client (`Failed to fetch`)

3. **File `web-search-fallback.ts`** vẫn hardcode `PERPLEXITY_API_KEY` và gọi trực tiếp `api.perplexity.ai`, chưa được migrate sang OpenRouter

### Thay đổi

**1. Redeploy edge function `topic-ai`**
- Deploy lại để code mới (OpenRouter fallback) có hiệu lực

**2. Migrate `supabase/functions/_shared/data-fetchers/web-search-fallback.ts`**
- Thêm `OPENROUTER_API_KEY` fallback giống `topic-utils.ts`
- Đổi URL và model khi có OpenRouter key
- Giữ backward compatibility với Perplexity key cũ

**3. Tăng timeout phía client (`useTopicAI.ts`)**
- Function `topic-ai` mất ~58s, nhưng `supabase.functions.invoke()` dùng default fetch timeout (~60s)
- Sử dụng `invokeWithTimeout` thay vì `supabase.functions.invoke()` cho action `suggest` với timeout 90s để tránh client-side timeout

### File cần sửa
- `supabase/functions/_shared/data-fetchers/web-search-fallback.ts` — migrate sang OpenRouter
- `src/hooks/ai/useTopicAI.ts` — dùng `invokeWithTimeout` cho suggest action
- Deploy lại `topic-ai` edge function

### Kết quả
- Web search hoạt động qua OpenRouter (không bị 401 Perplexity quota)
- Client không bị timeout khi LLM xử lý lâu
- Topic suggestions tạo được bình thường

