
# Cap nhat danh sach OpenRouter Models moi nhat (Feb 2026)

## Hien trang
Danh sach POPULAR_MODELS va MODEL_INFO trong du an dang loi thoi, con dang dung cac model cu nhu `gpt-4o`, `gpt-4-turbo`, `claude-3.5-sonnet`, `gemini-pro-1.5`. OpenRouter hien co 627+ models voi nhieu model moi flagship.

## Thay doi

### 1. `supabase/functions/fetch-openrouter-models/index.ts`

**Cap nhat POPULAR_MODELS** - thay the danh sach cu bang top models moi nhat theo weekly ranking:

Bo: `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-opus`, `anthropic/claude-3-haiku`, `openai/gpt-4o`, `openai/gpt-4-turbo`, `openai/o1`, `openai/o1-mini`, `meta-llama/llama-3.1-405b-instruct`, `google/gemini-pro-1.5`, `google/gemini-flash-1.5`, `mistralai/mixtral-8x22b-instruct`, `cohere/command-r-plus`, `qwen/qwen-2.5-coder-32b-instruct`

Them:
- `anthropic/claude-sonnet-4.6` - Sonnet moi nhat
- `anthropic/claude-sonnet-4.5` - Flagship Sonnet
- `anthropic/claude-opus-4.6` - Opus moi nhat
- `anthropic/claude-opus-4.5` - Opus truoc do
- `anthropic/claude-haiku-4.5` - Haiku moi
- `openai/gpt-5.2` - GPT moi nhat
- `openai/gpt-5.2-codex` - Codex cho coding
- `openai/gpt-5-mini` - GPT-5 Mini
- `openai/gpt-5-nano` - GPT-5 Nano
- `openai/gpt-oss-120b` - Open source cua OpenAI
- `google/gemini-3.1-pro-preview` - Gemini moi nhat
- `google/gemini-3-flash-preview` - Flash moi
- `google/gemini-2.5-flash` - Flash stable
- `google/gemini-2.5-flash-lite` - Flash Lite
- `deepseek/deepseek-v3.2` - DeepSeek moi nhat
- `deepseek/deepseek-chat-v3.1` - V3.1
- `moonshotai/kimi-k2.5` - Kimi K2.5 (#2 weekly)
- `minimax/minimax-m2.5` - MiniMax M2.5 (#1 weekly)
- `x-ai/grok-4.1-fast` - Grok moi nhat
- `x-ai/grok-code-fast-1` - Grok Code
- `z-ai/glm-5` - GLM 5 (#3 weekly)
- `qwen/qwen3-235b-a22b-2507` - Qwen3 moi
- `qwen/qwen3-coder-next` - Qwen3 Coder
- `xiaomi/mimo-v2-flash` - MiMo V2

**Cap nhat providerMap** - them cac provider moi:
- `moonshotai` -> `MoonshotAI`
- `minimax` -> `MiniMax`
- `z-ai` -> `Z.ai`
- `xiaomi` -> `Xiaomi`
- `stepfun` -> `StepFun`
- `arcee-ai` -> `Arcee AI`
- `writer` -> `Writer`

**Cap nhat categorizeModel** - them pattern nhan dien moi:
- `codex` -> coding
- `v3.2`, `v3.1` -> flagship (DeepSeek)
- `mimo` -> coding
- `glm-5` -> flagship
- `kimi-k2.5` -> flagship

### 2. `src/hooks/useAIConfig.ts`

**Cap nhat MODEL_INFO** - thay the cac entry OpenRouter cu bang models moi:

Bo: `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `openai/gpt-4-turbo`, `google/gemini-pro-1.5`

Giu: `anthropic/claude-sonnet-4-20250514` (van hop le), `deepseek/deepseek-chat`, `meta-llama/llama-3.3-70b-instruct`, `mistralai/mistral-large`, `qwen/qwen-2.5-72b-instruct`

Them moi:
- `anthropic/claude-sonnet-4.6` - premium, Sonnet moi nhat
- `anthropic/claude-sonnet-4.5` - premium, Sonnet 4.5
- `anthropic/claude-opus-4.6` - premium, Opus moi nhat
- `anthropic/claude-haiku-4.5` - fast, gia re
- `openai/gpt-5.2` - premium, GPT moi nhat
- `openai/gpt-5.2-codex` - coding chuyen dung
- `google/gemini-3.1-pro-preview` - Gemini Pro moi nhat
- `google/gemini-3-flash-preview` - Flash moi
- `deepseek/deepseek-v3.2` - flagship DeepSeek moi
- `moonshotai/kimi-k2.5` - multimodal, coding
- `minimax/minimax-m2.5` - #1 weekly, coding
- `x-ai/grok-4.1-fast` - 2M context, agentic
- `z-ai/glm-5` - open source, coding
- `qwen/qwen3-coder-next` - coder chuyen dung

**Cap nhat MODELS_BY_PROVIDER.openrouter** - dong bo voi MODEL_INFO moi

### 3. `supabase/functions/_shared/cost-estimator.ts`

**Cap nhat MODEL_PRICING** - them gia models moi:

```text
anthropic/claude-sonnet-4.6:  input $3, output $15
anthropic/claude-sonnet-4.5:  input $3, output $15
anthropic/claude-opus-4.6:    input $5, output $25
anthropic/claude-opus-4.5:    input $5, output $25
anthropic/claude-haiku-4.5:   input $1, output $5
openai/gpt-5.2:               input $1.75, output $14
openai/gpt-5.2-codex:         input $1.75, output $14
openai/gpt-oss-120b:          input $0.039, output $0.19
google/gemini-3.1-pro-preview: input $2, output $12
google/gemini-3-flash-preview: input $0.50, output $3
deepseek/deepseek-v3.2:       input $0.26, output $0.38
deepseek/deepseek-chat-v3.1:  input $0.15, output $0.75
moonshotai/kimi-k2.5:         input $0.23, output $3
minimax/minimax-m2.5:         input $0.30, output $1.10
x-ai/grok-4.1-fast:           input $0.20, output $0.50
z-ai/glm-5:                   input $0.30, output $2.55
qwen/qwen3-coder-next:        input $0.12, output $0.75
xiaomi/mimo-v2-flash:         input $0.09, output $0.29
```

### 4. `src/types/aiProvider.ts`

**Cap nhat OpenRouter models list** trong AI_PROVIDERS:

```text
models: [
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-5.2',
  'google/gemini-3-flash-preview',
  'deepseek/deepseek-v3.2',
  'minimax/minimax-m2.5',
]
```

Cap nhat description: `'Claude 4.6, GPT-5.2, Gemini 3, DeepSeek V3.2, MiniMax...'`

### Ket qua
- Danh sach POPULAR_MODELS cap nhat 30+ model moi nhat (Feb 2026)
- MODEL_INFO frontend co du thong tin cho ~20 model pho bien nhat
- Cost estimator chinh xac theo gia hien tai cua OpenRouter
- Provider map ho tro cac provider moi: MiniMax, Z.ai, MoonshotAI, Xiaomi, StepFun
