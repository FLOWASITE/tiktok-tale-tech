---
name: SEO Admin AI Config
description: 7 SEO edge function (keyword-research-v2/v1/save, enrich-keyword-serp, suggest-cluster-topics, generate-seo-landing, seo-rank-tracker) đăng ký vào ai_function_categories slug=seo + DEFAULT_CONFIGS, override admin model qua ai_function_configs
type: feature
---

## Setup
- DB: `ai_function_categories` insert slug=`seo` (system, sort_order=7).
- FE: `AI_FUNCTIONS` (`src/hooks/useAIConfig.ts`) thêm 7 function category=`seo`.
- Edge: `_shared/ai-config.ts` DEFAULT_CONFIGS + getFunctionTypeGroup → `text` group.

## Pattern override
Mỗi edge function tự query `ai_function_configs` (function_name + org/global) lấy `model_override` + `temperature`, fallback hardcoded nếu không có. Riêng `keyword-research-v2` còn fallback `gemini-2.5-flash` khi primary fail (non-429/402).

## Models mặc định
- pro: keyword-research-v2, keyword-research
- flash: suggest-cluster-topics, generate-seo-landing
- flash-lite: enrich-keyword-serp, keyword-research-save, seo-rank-tracker

## Guardrail trong callAI
`_shared/ai-provider.ts` `callAI()` THROW nếu `functionName` rỗng và CẢNH BÁO console.error nếu không có trong DEFAULT_CONFIGS (admin override sẽ bị bỏ qua). `generate-seo-landing` + `suggest-cluster-topics` đã chuyển sang `callAI()` để hưởng guardrail + admin override thay vì fetch trực tiếp.
