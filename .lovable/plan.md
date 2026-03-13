

## Cập nhật OpenRouter Models (March 2026)

### Models mới phát hiện từ openrouter.ai/models

| Model ID | Tên | Giá (input/output per 1M) | Ghi chú |
|----------|-----|---------------------------|---------|
| `x-ai/grok-4.20-beta` | Grok 4.20 | $2/$6 | Flagship mới nhất xAI, 2M context |
| `x-ai/grok-4.20-multi-agent-beta` | Grok 4.20 Multi-Agent | $2/$6 | Multi-agent variant |
| `openai/gpt-5.4` | GPT-5.4 | $2.50/$15 | Unifies Codex + GPT, 1M context |
| `openai/gpt-5.4-pro` | GPT-5.4 Pro | $30/$180 | Most advanced OpenAI |
| `openai/gpt-5.3-codex` | GPT-5.3 Codex | $1.75/$14 | Agentic coding |
| `openai/gpt-5.3-chat` | GPT-5.3 Chat | $1.75/$14 | Chat-optimized |
| `google/gemini-3.1-flash-lite-preview` | Gemini 3.1 Flash Lite | $0.25/$1.50 | Half cost of Gemini 3 Flash |
| `qwen/qwen3.5-397b-a17b` | Qwen 3.5 397B | $0.39/$2.34 | Flagship Qwen MoE |
| `qwen/qwen3.5-flash-02-23` | Qwen 3.5 Flash | $0.10/$0.40 | Fast Qwen |
| `inception/mercury-2` | Mercury 2 | $0.25/$0.75 | 1000+ tok/s diffusion LLM |
| `stepfun/step-3.5-flash` | Step 3.5 Flash | $0.10/$0.30 | 256K context, MoE |
| `bytedance-seed/seed-2.0-lite` | Seed 2.0 Lite | $0.25/$2 | ByteDance multimodal |

### Models cần xóa/cập nhật
- `x-ai/grok-4.1-fast` → thay bằng `grok-4.20-beta` (flagship mới hơn)
- `openai/gpt-5.2` → giữ lại, thêm `gpt-5.4` làm recommended
- `openai/gpt-5.2-codex` → giữ lại, thêm `gpt-5.3-codex`

### Thay đổi (4 files)

#### 1. `src/types/aiProvider.ts` — OpenRouter provider models list
- Thêm các model mới vào `models` array
- Update description

#### 2. `src/hooks/useAIConfig.ts` — MODEL_INFO + AVAILABLE_MODELS
- Thêm MODEL_INFO entries cho ~12 model mới
- Thêm vào `AVAILABLE_MODELS.openrouter`
- Đánh dấu `gpt-5.4` và `grok-4.20-beta` là `isRecommended`
- Bỏ recommend từ `gpt-5.2`

#### 3. `supabase/functions/fetch-openrouter-models/index.ts` — POPULAR_MODELS set
- Thêm model IDs mới vào POPULAR_MODELS
- Xóa model cũ không còn relevant

#### 4. `supabase/functions/_shared/cost-estimator.ts` — MODEL_PRICING
- Thêm pricing entries cho model mới

