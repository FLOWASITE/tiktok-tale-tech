

## Cập nhật cài đặt Model AI cho OpenRouter trong AI Management

### Vấn đề hiện tại
- `MODELS_BY_TYPE.search` chỉ có `sonar-pro` và `sonar` (model Perplexity trực tiếp cũ)
- `MODEL_INFO` ghi nhận provider là `'lovable'` cho các model search, trong khi thực tế đã chuyển sang OpenRouter
- `AI_FUNCTIONS` vẫn ghi `currentModel: 'sonar'` cho các function search, cần đổi thành `perplexity/sonar`
- Thiếu model info cho các OpenRouter model phổ biến (Claude, Grok, DeepSeek, etc.)

### Thay đổi

**File: `src/hooks/useAIConfig.ts`**

1. Cập nhật `MODELS_BY_TYPE.search` — thêm `perplexity/sonar-pro` và `perplexity/sonar` (qua OpenRouter), giữ lại model cũ cho backward compatibility

2. Cập nhật `MODEL_INFO` — đổi provider của `sonar-pro`/`sonar` sang `'openrouter'`, thêm entries mới cho `perplexity/sonar-pro` và `perplexity/sonar`

3. Cập nhật `AI_FUNCTIONS` — đổi `currentModel` của các function search từ `'sonar'`/`'sonar-pro'` sang `'perplexity/sonar'`/`'perplexity/sonar-pro'`

4. Thêm `MODEL_INFO` cho các OpenRouter text model chưa có info (Claude 4.6, Grok 4.20, DeepSeek V3.2, MiniMax M2.5, etc.) để hiển thị đẹp trên UI

### Kết quả
- Admin có thể chọn model OpenRouter (bao gồm Perplexity Sonar) cho các function search trong AI Management UI
- Hiển thị đúng provider indicator (OpenRouter) thay vì Lovable
- Tất cả model OpenRouter text đã có trong danh sách đều hiển thị info đầy đủ

