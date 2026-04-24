

## Mục tiêu
Bổ sung các model Qwen thế hệ mới (Qwen3 / Qwen3.5 / Qwen-VL mới / Qwen-Coder) cho provider DashScope (Alibaba Cloud), để admin có thể chọn trong:
- AI Management → Functions / Agents / Channels / Group overrides
- Bộ lọc provider "DashScope" trong `ModelSelector` và `InlineModelPicker`

## Model sẽ thêm (DashScope native, gọi qua endpoint OpenAI-compatible đã sẵn)
Theo dòng Qwen mới nhất Alibaba đã phát hành trên DashScope International:

Text / Reasoning
- `qwen3-max` — flagship Qwen3, suy luận mạnh, đa ngôn ngữ
- `qwen3-plus` — cân bằng chất lượng / chi phí, thay thế dần `qwen-plus`
- `qwen3-turbo` — rẻ, nhanh, batch
- `qwen3-flash` — nhanh nhất, dùng cho classification / quick suggestions
- `qwen-plus-latest` — alias luôn trỏ bản plus mới nhất (giữ tương thích cũ)
- `qwen-max-latest` — alias bản max mới nhất

Long context
- `qwen3-long` — context dài kế nhiệm `qwen-long`

Multimodal (Vision)
- `qwen3-vl-max` — VL thế hệ mới
- `qwen3-vl-plus` — VL nhẹ hơn, rẻ hơn

Code
- `qwen3-coder-plus` — chuyên code, thay cho dùng GPT-5-codex khi cần tiết kiệm

Lưu ý: tất cả đều khớp prefix `qwen-` / `qwen3` đã có trong `MODEL_TYPE_PATTERNS` của `ai-provider.ts`, nên backend KHÔNG cần đổi routing — tự động đi qua DashScope.

## File cần sửa

1. `src/types/aiProvider.ts`
   - Cập nhật mảng `models` cho entry `dashscope` trong `AI_PROVIDERS`
   - Cập nhật `description` (liệt kê Qwen3 series)

2. `src/hooks/useAIConfig.ts`
   - `MODELS_BY_TYPE.text` — thêm các model text/reasoning Qwen3
   - `MODELS_BY_TYPE.image` (nếu có VL được dùng cho image-understanding) — thêm `qwen3-vl-*`
   - `MODEL_INFO` (block từ dòng ~692) — thêm metadata cho từng model mới: `shortName`, `description`, `speed`, `quality`, `cost`, `bestFor`, `provider: 'dashscope'`
   - Đánh dấu `qwen3-plus` là `isRecommended: true` thay cho `qwen-plus` (giữ qwen-plus nhưng bỏ recommend, để không phá org đang dùng)
   - Cập nhật `DASHSCOPE_MODEL_PREFIXES` — bổ sung `'qwen3'` để regex catch
   - Cập nhật mảng `dashscope` trong `MODELS_BY_PROVIDER` (dòng 1370) — thêm full danh sách model mới

3. `src/components/admin/ai/InlineModelPicker.tsx`
   - `isDashScopeModel` đang hardcode list cũ (dòng 27) → đổi sang dùng helper `isDashScopeModel` từ `useAIConfig` (đã export sẵn) để tránh phải maintain 2 chỗ. Đồng thời tự động nhận model mới.

4. `supabase/functions/_shared/ai-provider.ts`
   - `MODEL_TYPE_PATTERNS` — bổ sung `"qwen3": "dashscope"` để chắc chắn route đúng (hiện chỉ có `qwen-` và `qwen2`).
   - Không cần sửa logic call vì endpoint giữ nguyên.

## Tiêu chí nghiệm thu

- Vào AI Management → Functions / Channels → ô "Override model" lọc theo provider DashScope thấy đầy đủ:
  - qwen3-max, qwen3-plus, qwen3-turbo, qwen3-flash, qwen3-long, qwen3-vl-max, qwen3-vl-plus, qwen3-coder-plus, qwen-plus-latest, qwen-max-latest
  - cùng 5 model cũ (giữ tương thích).
- Mỗi model mới có badge speed/quality/cost và mô tả tiếng Việt.
- Khi chọn `qwen3-plus` cho channel `instagram`, request thực sự đi qua DashScope (`https://dashscope-intl.aliyuncs.com/...`), không rớt sang Lovable Gateway.
- `InlineModelPicker` (chip-style picker) cũng hiển thị nhóm DashScope với đầy đủ model mới.
- Group override "Text" trong `/admin/ai` có thể đổi default từ `qwen-plus` → `qwen3-plus` mà không lỗi runtime.

