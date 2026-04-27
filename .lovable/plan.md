# 🎯 Mục tiêu
Đồng bộ logic chọn AI model: đảm bảo mọi function dùng `qwen-*` đều route DashScope với fallback an toàn, sửa model name không khớp, dọn inconsistency `force_provider`.

## 🔍 Vấn đề chính phát hiện

| # | Vấn đề | Function bị ảnh hưởng |
|---|---|---|
| 1 | `force_provider=NULL` nhưng dùng qwen → phụ thuộc auto-detect | `topic-ai`, `analyze-dashboard-insights`, `analyze-script`, `chat-topics`, `auto-suggest-connections`, `generate-brand-guideline`, `generate-carousel`, `generate-core-content`, `generate-multichannel`, `generate-storyboard`, `regenerate-carousel-caption` |
| 2 | Model name không tồn tại trong DashScope catalog | `topic-ai` (`qwen3-flash` ⚠️ list chỉ có turbo/plus/max/long), `generate-script` (`qwen-max` qua OpenRouter ⚠️ OpenRouter dùng `qwen/qwen3.5-*`) |
| 3 | Không có fallback khi DashScope down (qwen-* không Lovable-compatible) | Tất cả 28 function dùng qwen-* |
| 4 | `overlay-brand-logo` dùng `poyo/*` lệch group default `geminigen/*` | overlay-brand-logo |

## 🛠️ Thay đổi đề xuất

### Migration 1 — Chuẩn hoá `force_provider` cho mọi function dùng qwen
SET `force_provider='dashscope'` cho 11 function ở vấn đề #1 → loại bỏ auto-detect, làm rõ ràng cho admin nhìn UI.

### Migration 2 — Sửa model name không khớp
- `topic-ai`: `qwen3-flash` → `qwen-flash` (hoặc `qwen3-turbo` nếu muốn dòng qwen3)
- `generate-script`: `qwen-max` (force=openrouter) → đổi sang `qwen-max-latest` + force=`dashscope` (đồng bộ với generate-multichannel) — HOẶC giữ OpenRouter nhưng dùng đúng tên `qwen/qwen3.5-397b-a17b`

### Code fix — Fallback chain cho qwen models
File `supabase/functions/_shared/ai-provider.ts` (~line 814-827):
- Khi `primaryProvider=dashscope` fail, hiện tại return error luôn (vì `isLovableCompatibleModel` = false cho qwen).
- **Thêm 2-tier fallback**:
  1. DashScope qwen-flash → DashScope qwen-plus (model fallback nội bộ)
  2. Nếu cả 2 fail → fallback sang `google/gemini-2.5-flash` qua Lovable Gateway (last resort, có credits mới chạy)
- Tránh "credit storm": disable Lovable Gateway trong isolate sau lần 402 đầu tiên.

### Quality of life
- Thêm validation lúc admin lưu config: nếu chọn provider X mà model name không thuộc catalog X → cảnh báo UI.
- Log rõ ở `[ai-provider]`: source = individual / group / default + chosen provider để debug nhanh trên Edge Function logs.

## 📦 Files sẽ sửa
1. `supabase/migrations/<new>.sql` — UPDATE force_provider cho 11 function + sửa model name 2 function
2. `supabase/functions/_shared/ai-provider.ts` — thêm 2-tier fallback logic + isolate-level kill switch khi 402
3. (optional) `src/components/admin/AIFunctionConfigForm.tsx` — validation provider/model khớp catalog

## ✅ Kết quả mong đợi
- 100% function dùng qwen-* đều force `dashscope` rõ ràng (không phụ thuộc auto-detect)
- DashScope down → tự fallback qwen-flash → qwen-plus → Gemini Flash qua Lovable
- UI Admin AI Function Config phản ánh đúng provider thực tế đang chạy
- Credit storm 402 không còn lặp đi lặp lại trong cùng 1 request

## 🚧 Out of scope
- Không đổi pricing logic
- Không refactor cách lưu credentials
- Không đụng image generation (đã ổn với GeminiGen/PoYo)
