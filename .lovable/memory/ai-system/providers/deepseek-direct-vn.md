---
name: DeepSeek Direct Provider
description: Direct DeepSeek API (api.deepseek.com) song song với route OpenRouter; prefix deepseek-chat/reasoner/v4-*, ENV DEEPSEEK_API_KEY, fallback Lovable Gateway gemini-2.5-flash
type: feature
---

## Routing
- Prefix `deepseek-chat`, `deepseek-reasoner`, `deepseek-v4*`, `deepseek/native/*` → provider `deepseek` (direct).
- Prefix `deepseek/...` (legacy, vd `deepseek/deepseek-v3.2`) vẫn đi OpenRouter — không phá override cũ.
- Endpoint: `https://api.deepseek.com/v1/chat/completions` (OpenAI-compatible).
- Auth: `Bearer $DEEPSEEK_API_KEY` (env hoặc `ai_provider_configs.deepseek`).

## Models
`deepseek-chat` (V3 general), `deepseek-reasoner` (R1 CoT), `deepseek-v4-flash`, `deepseek-v4-pro`. Context 128K. Prompt caching tự động server-side (giảm 50–75% cost prompt lặp).

## Fallback chain
Tier 1: model yêu cầu → Tier 2: Lovable Gateway `google/gemini-2.5-flash` (trừ khi 401/402/Payment).

## Pricing (cost-estimator)
- deepseek-chat / v4-pro: $0.27 / $1.10 per 1M (in/out)
- deepseek-reasoner: $0.55 / $2.19
- deepseek-v4-flash: $0.07 / $0.27

## UI
Admin AI Provider Manager card "DeepSeek (Direct)" + filter chip "DeepSeek" trong ModelSelector. Models list trong `MODELS_BY_PROVIDER.deepseek` + `MODELS_BY_TYPE.text`.

## Why
Giá gốc rẻ hơn OpenRouter ~5%, có prompt caching native, không markup, latency thấp hơn cho EU/Asia.
