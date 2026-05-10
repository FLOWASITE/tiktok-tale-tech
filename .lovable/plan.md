## Vấn đề
Test trước báo 402 do cả 3 model fallback của `import-brand-extractor` đều thuộc Lovable Gateway (`gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-3-flash-preview`). Khi workspace hết credit Lovable AI, toàn bộ chain fail.

Trong khi đó các brand function tương tự (`generate-brand-guideline`, `geo-scan-brand`) admin đã set `qwen-plus` (DashScope/Alibaba) — provider có credit riêng, không phụ thuộc Lovable Gateway.

## Phạm vi sửa

### 1. Đồng bộ default model với các brand function khác
File: `supabase/functions/_shared/ai-config.ts`
- Đổi default cho 3 entry `import-brand-extractor`, `import-brand-from-website`, `import-brand-from-fanpage` từ `google/gemini-2.5-flash` → **`qwen-plus`** (giống `generate-brand-guideline`).
- Lý do: Qwen-plus support tool-calling tốt, đa ngôn ngữ (đặc biệt VI), giá rẻ hơn, và workspace đã có DashScope credit.

File: `src/hooks/useAIConfig.ts`
- Cập nhật `currentModel` của 3 entry tương ứng → `qwen-plus` (chỉ ảnh hưởng badge hiển thị mặc định trong Admin UI; admin vẫn override được).

### 2. Multi-provider fallback chain
File: `supabase/functions/_shared/brand-extractor.ts`
- Đổi `FALLBACK_MODELS` thành chain xen kẽ provider để né 402 từng nhà:
  ```
  undefined           // primary từ admin config (qwen-plus)
  "qwen-turbo"        // DashScope rẻ hơn, vẫn cùng provider
  "google/gemini-2.5-flash"       // sang Lovable Gateway
  "google/gemini-2.5-flash-lite"  // Lovable Gateway tier rẻ nhất
  ```
- Giữ logic chỉ fallback khi error là 402/429/quota; lỗi khác break ngay.
- Giữ return code `AI_QUOTA_EXHAUSTED` khi cả 4 đều fail.

### 3. Không động vào
- `ai-provider.ts` (đã hỗ trợ DashScope routing sẵn từ prefix `qwen-`).
- Logic 402 mapping ở 2 orchestrator + frontend toast (đã đúng).
- Tool-calling schema (Qwen OpenAI-compatible, dùng được cùng schema).

## Verification
- Test lại `import-brand-from-website` với `https://flowa.one` → mong đợi primary `qwen-plus` thành công ngay (vì workspace có DashScope key).
- Mở `/admin/ai` → 3 function `import-brand-*` hiển thị default `qwen-plus`.
- Nếu admin set lại model_override khác, fallback vẫn chạy đúng theo thứ tự trên.

## Rủi ro
- Qwen-plus tool-calling đôi khi trả args trong shape hơi khác — extractor đã có 3 tầng parse (`choices[0].message.tool_calls` → `data.tool_calls` → JSON regex từ content) nên đã an toàn.
