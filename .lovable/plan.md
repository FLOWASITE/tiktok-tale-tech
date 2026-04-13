

## Perplexity trong hệ thống và giải pháp thay thế

### Perplexity đang làm gì?

Perplexity được dùng ở **2 chỗ** với mục đích duy nhất: **tìm kiếm web real-time có citations** (điều mà LLM thông thường không làm được).

**1. Topic Suggestions** (`topic-utils.ts`)
- `searchIndustryData()`: Tìm thống kê ngành, case studies, xu hướng thị trường VN mới nhất
- `searchAudienceQuestions()`: Tìm câu hỏi thực tế của khách hàng trên forums, cộng đồng
- Kết quả được đưa vào prompt AI để sinh topic suggestions chất lượng hơn

**2. GEO Brand Scanning** (`geo-scan-brand/index.ts`)
- Quét brand visibility trên Perplexity AI (1 trong 3 engines: ChatGPT, Gemini, Perplexity)
- Đo lường xem AI có đề cập thương hiệu không khi user hỏi câu liên quan

### Hiện trạng
- Perplexity: **hết quota** (401 insufficient_quota)
- Khi không có Perplexity key, hệ thống đã **tự skip** web search → topic suggestions vẫn hoạt động nhưng thiếu dữ liệu real-time

### Giải pháp thay thế

Thay Perplexity bằng **OpenRouter + model có web search** (đã có API key hoạt động):

- OpenRouter cung cấp các model Perplexity (perplexity/sonar) qua API tương thích OpenAI
- Chi phí thấp hơn, dùng chung key OpenRouter đã có
- Giữ nguyên logic: tìm industry data + audience questions, trả về JSON + citations

**Thay đổi cụ thể:**

1. **`supabase/functions/_shared/topic-utils.ts`**
   - Thay `fetch('https://api.perplexity.ai/...')` bằng `fetch('https://openrouter.ai/api/v1/chat/completions')` với model `perplexity/sonar`
   - Dùng `OPENROUTER_API_KEY` (user's key, đã có) thay vì `PERPLEXITY_API_KEY`
   - Giữ nguyên prompt, timeout, parse logic

2. **`supabase/functions/geo-scan-brand/index.ts`**
   - Engine "perplexity" chuyển sang dùng OpenRouter + `perplexity/sonar` thay vì gọi trực tiếp Perplexity API
   - Fallback: nếu OpenRouter cũng fail → simulate như các engine khác

3. **`supabase/functions/_shared/topic-utils.ts`** — `shouldSkipWebSearch()`
   - Kiểm tra `OPENROUTER_API_KEY` thay vì `PERPLEXITY_API_KEY`

### File cần sửa
- `supabase/functions/_shared/topic-utils.ts` — đổi 2 hàm search sang OpenRouter
- `supabase/functions/geo-scan-brand/index.ts` — đổi engine perplexity sang OpenRouter

### Kết quả
- Web search hoạt động trở lại không cần thêm API key mới
- Topic suggestions có dữ liệu real-time từ web
- GEO scan engine Perplexity dùng model thật thay vì simulate

