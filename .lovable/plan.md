## Bối cảnh

Trong **Admin → AI Management → Functions**, function `generate-storyboard` **đã có sẵn** trong catalog (`src/hooks/useAIConfig.ts` dòng 55, category `content`, type `text`, default `google/gemini-2.5-flash`). Picker model cũng **đã liệt kê đầy đủ Qwen của Alibaba (DashScope)** — `qwen3-max`, `qwen3-plus`, `qwen3-turbo`, `qwen3-flash`, `qwen3-long`, `qwen3-vl-max/plus`, `qwen3-coder-plus`, `qwen-max-latest`, `qwen-plus-latest`, …

**Vấn đề thực tế:** edge function `supabase/functions/generate-storyboard/index.ts` hard-code:
- `model: "google/gemini-2.5-flash"`
- gọi thẳng `https://ai.gateway.lovable.dev/v1/chat/completions`

→ Bỏ qua `ai_function_configs` hoàn toàn. Chọn Qwen trong Admin **không có tác dụng**, và đây là lý do vẫn 402 (Lovable Gateway hết credits) dù muốn dùng Alibaba.

## Mục tiêu

Khi admin chọn model `qwen3-*` cho `generate-storyboard` trong Admin UI → request được route sang **DashScope (Alibaba Cloud)**, không đụng Lovable Gateway.

## Thay đổi

### 1. `supabase/functions/generate-storyboard/index.ts` — chuyển sang `callAI`

Thay block `fetch("https://ai.gateway.lovable.dev/...")` (dòng ~209-245) bằng shared helper `callAIWithMetrics` (đã được dùng trong `generate-script`, `generate-hooks` …):

- `import { callAIWithMetrics } from "../_shared/ai-provider.ts"`
- Bỏ check `LOVABLE_API_KEY` cứng (helper tự xử lý theo provider)
- Truyền `functionName: 'generate-storyboard'`, `organizationId`, `messages`, `userId`, `traceId`
- Helper sẽ:
  - đọc `ai_function_configs` (org-level → global → fallback)
  - nếu `model_override` là `qwen3-*` hoặc `force_provider='dashscope'` → gọi DashScope qua `DASHSCOPE_API_KEY`
  - tự `saveMetrics` (giữ behavior hiện tại) — bỏ block `saveMetrics` trùng lặp ở cuối hàm
- Giữ nguyên 402/429 mapping ra response error tiếng Việt

### 2. `src/hooks/useAIConfig.ts` — không đổi

Entry `generate-storyboard` đã có. Giữ default `google/gemini-2.5-flash` để org chưa cấu hình vẫn chạy bình thường; admin chuyển sang Qwen qua UI.

### 3. Secret check

Cần `DASHSCOPE_API_KEY` đã có trong Lovable Cloud secrets. Sẽ verify bằng `secrets--fetch_secrets` trước khi implement; nếu thiếu sẽ yêu cầu user thêm qua `add_secret` trước.

## Cách dùng sau khi xong

1. Vào **Admin → AI → Functions**, search "storyboard"
2. Mở `generate-storyboard`, chọn provider **DashScope (Alibaba Cloud)** → model `qwen3-plus` (khuyến nghị) hoặc `qwen3-flash` (rẻ/nhanh)
3. Lưu → lần render storyboard kế tiếp sẽ gọi Alibaba, không tốn credit Lovable AI

## Out of scope

- Không thay đổi schema DB, không tạo migration
- Không sửa UI Admin (đã đầy đủ)
- Không đổi default model global (giữ Gemini Flash) — tránh ảnh hưởng workspace khác
