## Mục tiêu
1. Đổi default model 3 function `import-brand-*` từ `qwen-plus` (DashScope) → `deepseek-chat` (DeepSeek Direct, rẻ + ổn định, đã có ENV `DEEPSEEK_API_KEY`).
2. Mở rộng fallback regex trong `brand-extractor.ts` để 400 cũng trigger fallback (tránh hard-fail khi provider trả 400).
3. Bổ sung `suggest-products-from-website` (cũng đang `qwen-plus`) đồng bộ → `deepseek-chat`.
4. Đảm bảo 4 function này hiển thị đúng trong Admin → AI Settings → Functions (chúng đã có trong `AI_FUNCTIONS`, chỉ cần cập nhật `currentModel` để UI hiển thị default mới).

## Thay đổi cụ thể

### A. `supabase/functions/_shared/ai-config.ts` (lines 133-156)
Đổi `model: 'qwen-plus'` → `model: 'deepseek-chat'` cho:
- `import-brand-extractor`
- `import-brand-from-website`
- `import-brand-from-fanpage`

Tìm thêm entry `suggest-products-from-website` (nếu có) → đổi cùng.

### B. `src/hooks/useAIConfig.ts` (lines 104-107)
Đổi `currentModel: 'qwen-plus'` → `currentModel: 'deepseek-chat'` cho 4 function brand import. Đây là metadata UI để Admin → Functions hiển thị "Default: deepseek-chat" + cho phép override.

### C. `supabase/functions/_shared/brand-extractor.ts` (line 193, 199)
Mở rộng regex retry:
```ts
const isRetryable = /\b(400|402|429|500|502|503)\b|quota|payment|rate limit|arrearage|insufficient|invalid model/i.test(lastError);
```
→ DashScope/DeepSeek 400 (key hết, model sai, arrearage) sẽ rơi xuống fallback chain thay vì hard-fail.

Cập nhật FALLBACK_MODELS chain (line 159-164) ưu tiên DeepSeek trước:
```ts
const FALLBACK_MODELS = [
  undefined,                       // primary (deepseek-chat sau khi đổi default)
  "deepseek-v4-flash",             // DeepSeek rẻ hơn
  "google/gemini-2.5-flash",       // Lovable Gateway
  "google/gemini-2.5-flash-lite",  // Lovable cheapest
];
```

## Phạm vi không động tới
- KHÔNG đổi default các function khác đang dùng DashScope/Gemini.
- KHÔNG đổi schema DB.
- KHÔNG sửa UI component (AI_FUNCTIONS list đã có sẵn 4 entry).
- KHÔNG cần migration — `ai_function_configs` chỉ cần khi user muốn override; default được đọc từ `DEFAULT_CONFIGS` trong code.

## Kết quả
- Brand import gọi DeepSeek trực tiếp (rẻ ~5%, có prompt caching).
- 400 errors auto-fallback → không còn lỗi UI "DashScope error 400".
- Admin → AI Settings → Functions thấy 4 function này với default mới + option override sang DeepSeek/Gemini/OpenAI qua dropdown ModelSelector hiện có.