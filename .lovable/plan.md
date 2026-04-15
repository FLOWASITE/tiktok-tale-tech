

## Sửa routing topic-ai sang OpenRouter

### Vấn đề
Model `google/gemini-3.1-flash-lite-preview` bắt đầu bằng `google/gemini-` nên hệ thống tự động route sang Lovable Gateway (không hỗ trợ model này) → lỗi 400. Lần fix trước đã đổi model sang `google/gemini-2.5-flash-lite` (chạy trên Lovable) — không đúng ý bạn.

### Giải pháp
Cập nhật bảng `ai_function_configs` cho `topic-ai`:
- `model_override` → `google/gemini-3.1-flash-lite-preview`
- `force_provider` → `openrouter`

Hệ thống đã hỗ trợ sẵn cột `force_provider` — khi set giá trị này, nó sẽ bỏ qua auto-detection và route thẳng đến OpenRouter với API key đã cấu hình.

### Thực hiện
1 migration SQL duy nhất:
```sql
UPDATE ai_function_configs 
SET model_override = 'google/gemini-3.1-flash-lite-preview',
    force_provider = 'openrouter'
WHERE function_name = 'topic-ai';
```

### Files thay đổi
- 1 file migration SQL mới

