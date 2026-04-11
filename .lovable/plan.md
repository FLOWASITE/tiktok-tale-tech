

# Fix: Thêm lại OpenRouter models vào MODELS_BY_TYPE.text và InlineModelPicker

## Vấn đề

Khi refactor InlineModelPicker, các danh sách hardcoded cũ (`OPENROUTER_TEXT_MODELS`) đã bị xóa, nhưng các model OpenRouter **không được thêm vào** `MODELS_BY_TYPE.text` trong `useAIConfig.ts`. Do đó, InlineModelPicker không hiển thị provider OpenRouter cho text functions.

Ngoài ra, hàm `getProviderGroups()` trong `InlineModelPicker.tsx` không có logic phân loại model OpenRouter (các model có prefix như `anthropic/`, `x-ai/`, `deepseek/`, `minimax/`, `qwen/qwen3...`, `inception/`, `stepfun/`, `bytedance-seed/`).

## Thay đổi

### 1. `src/hooks/useAIConfig.ts` — Thêm OpenRouter models vào `MODELS_BY_TYPE.text`

Thêm các model từ `AI_PROVIDERS` OpenRouter vào danh sách text:
```
'openai/gpt-5.4', 'openai/gpt-5.4-pro', 'openai/gpt-5.3-codex', 'openai/gpt-5.3-chat', 'openai/gpt-5.2',
'x-ai/grok-4.20-beta', 'x-ai/grok-4.20-multi-agent-beta',
'anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4.5',
'google/gemini-3.1-flash-lite-preview', 'google/gemini-3-flash-preview',
'deepseek/deepseek-v3.2', 'minimax/minimax-m2.5',
'qwen/qwen3.5-397b-a17b', 'qwen/qwen3.5-flash-02-23',
'inception/mercury-2', 'stepfun/step-3.5-flash', 'bytedance-seed/seed-2.0-lite'
```

Thêm `ModelInfo` entries cho các model mới (shortName, description, speed, quality, cost, provider: 'openrouter').

### 2. `src/components/admin/ai/InlineModelPicker.tsx` — Thêm logic phân loại OpenRouter

Thêm hàm `isOpenRouterModel()` để nhận diện các model có prefix không thuộc lovable/poyo/kie/geminigen/dashscope (ví dụ: `anthropic/`, `x-ai/`, `deepseek/`, `minimax/`, `inception/`, `stepfun/`, `bytedance-seed/`).

Cập nhật `getProviderGroups()` để thêm nhóm OpenRouter.

### 3. `src/hooks/useAIConfig.ts` — Thêm `MODEL_INFO` entries

Thêm entries cho tất cả OpenRouter models mới với provider = 'openrouter'.

| File | Thay đổi |
|------|----------|
| `src/hooks/useAIConfig.ts` | Thêm OpenRouter models vào `MODELS_BY_TYPE.text` + `MODEL_INFO` |
| `src/components/admin/ai/InlineModelPicker.tsx` | Thêm `isOpenRouterModel()` + cập nhật `getProviderGroups()` |

