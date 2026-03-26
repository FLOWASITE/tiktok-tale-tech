

# Fix: Agent Model Config thực sự được áp dụng cho tất cả 6 Agents

## Vấn đề

Agent pipeline truyền `model_override` từ `ai_agent_model_configs` nhưng **không có edge function nào đọc và sử dụng nó**. Tất cả đều dùng model hardcoded hoặc Lovable Gateway mặc định.

```text
ai_agent_model_configs (DB) → agent-pipeline (đọc ✅, truyền ✅)
  → topic-ai: KHÔNG đọc model_override từ body ❌
  → agent-creator-v2: KHÔNG truyền xuống generate-multichannel ❌
  → quality (inline): hardcode google/gemini-2.5-flash ❌
  → generate-campaign-strategy: hardcode google/gemini-3-flash-preview ❌
```

## Giải pháp — 5 file cần sửa

### 1. `topic-ai/index.ts` — Đọc `model_override` từ request body

- Thêm `model_override?: string` và `temperature?: number` vào `TopicAIRequest` interface
- Trong `handleSuggest`, `handleRefine`, và các handler khác: nếu `params.model_override` tồn tại, truyền vào `callAIWithMetrics` qua field `modelOverride`
- Ưu tiên: `params.model_override` > hardcoded model > default từ `getAIConfig`

### 2. `agent-creator-v2/index.ts` — Truyền model override xuống downstream

- Thêm `model_override?: string`, `temperature?: number`, `max_tokens?: number` vào `CreatorInput` interface
- Truyền vào `callFunction("generate-core-content", { ..., model_override })` 
- Truyền vào `callFunction("generate-multichannel", { ..., model_override })`
- `generate-multichannel` đã hỗ trợ `modelOverride` trong `callAIWithMetrics` — chỉ cần đọc từ request body

### 3. `agent-pipeline/index.ts` — Quality stage sử dụng modelOverride thay vì hardcode

- Quality stage hiện gọi trực tiếp `fetch("https://ai.gateway.lovable.dev/...")` với hardcoded model
- Thay đổi: sử dụng `modelOverride` (đã fetch ở dòng 714) thay cho `"google/gemini-2.5-flash"`
- Cũng áp dụng cho Persona-fit scoring (thay `"google/gemini-2.5-flash-lite"`)
- **Quan trọng**: Nếu model được cấu hình KHÔNG phải Lovable Gateway (ví dụ `qwen/`, `deepseek/`), cần route qua `callAIWithMetrics` thay vì gọi trực tiếp Lovable Gateway
- Refactor 2 lệnh `fetch` trực tiếp trong quality stage thành `callAIWithMetrics` để tự động route theo provider

### 4. `generate-campaign-strategy/index.ts` — Đọc config từ DB

- Query `ai_agent_model_configs` cho agent `strategy` trước khi gọi AI
- Sử dụng `model_override` thay vì hardcode `"google/gemini-3-flash-preview"`
- **Quan trọng**: Nếu model không phải Lovable Gateway, cần route qua `callAIWithMetrics` thay vì gọi trực tiếp Lovable Gateway URL
- Import và sử dụng `callAIWithMetrics` từ `_shared/ai-provider.ts`

### 5. `generate-multichannel/index.ts` — Đọc agent-level override từ body

- Function đã hỗ trợ `modelOverride` trong `callAIWithMetrics` ✅
- Chỉ cần thêm logic: nếu body có `model_override`, dùng nó làm fallback khi không có channel-level config
- Ưu tiên: channel config > agent config (body.model_override) > function config > default

## Điểm then chốt — Routing provider

`callAIWithMetrics` (trong `_shared/ai-provider.ts`) đã có logic auto-route:
- `google/gemini-*`, `openai/gpt-5*` → Lovable Gateway
- `qwen/`, `deepseek/`, `anthropic/` → OpenRouter (cần API key)
- `gpt-*` → Direct OpenAI

Vì vậy chỉ cần **truyền đúng `modelOverride`** vào `callAIWithMetrics` là hệ thống tự route đúng provider. Các chỗ gọi trực tiếp `fetch("https://ai.gateway.lovable.dev/...")` phải được refactor thành `callAIWithMetrics`.

## Kết quả

Admin cấu hình model `qwen/qwen3.5-397b-a17b` cho Strategy → pipeline thực sự gọi Qwen qua OpenRouter. Admin cấu hình `openai/gpt-5` cho Creator → pipeline gọi GPT-5 qua Lovable Gateway. Mỗi agent stage độc lập, không ảnh hưởng lẫn nhau.

