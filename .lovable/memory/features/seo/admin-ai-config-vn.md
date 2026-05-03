---
name: SEO Admin AI Config
description: 7 SEO edge functions registered in ai_function_categories slug=seo + DEFAULT_CONFIGS, all AI calls go through callAI()/callAIWithMetrics() for admin model override + ai_metrics logging + circuit breaker
type: feature
---

## Setup
- DB: `ai_function_categories` insert slug=`seo` (system, sort_order=7).
- FE: `AI_FUNCTIONS` (`src/hooks/useAIConfig.ts`) thêm 7 function category=`seo`.
- Edge: `_shared/ai-config.ts` DEFAULT_CONFIGS + getFunctionTypeGroup → `text` group.

## Pattern (unified)
TẤT CẢ edge function SEO gọi AI qua `callAIWithMetrics(supabase, { functionName, organizationId, userId, ... })` từ `_shared/ai-provider.ts`:
- Tự load `model_override` + `temperature` từ `ai_function_configs` (org > global > default).
- Tự log vào `ai_metrics` (input/output tokens, cost, duration, error).
- Circuit breaker + retry tự động.
- 429/402 surface qua `result.error` → caller tự convert sang status code.

`keyword-research-v2` có thêm fallback thủ công: nếu primary fail (non-429/402), gọi lại `callAIWithMetrics` với `modelOverride: "google/gemini-2.5-flash"`.

## Models mặc định
- pro: keyword-research-v2, keyword-research
- flash: suggest-cluster-topics, generate-seo-landing
- flash-lite: enrich-keyword-serp, keyword-research-save, seo-rank-tracker

## Guardrail trong callAI
`_shared/ai-provider.ts` `callAI()` THROW nếu `functionName` rỗng và CẢNH BÁO console.error nếu không có trong DEFAULT_CONFIGS.

## Migrated functions (no more raw fetch)
- ✅ generate-seo-landing
- ✅ suggest-cluster-topics
- ✅ keyword-research-v2 (với manual fallback flash)
- ✅ keyword-research (v1)
- ✅ enrich-keyword-serp (intent classification)
- N/A keyword-research-save, seo-rank-tracker (không gọi LLM trực tiếp; rank tracker chỉ Firecrawl)
