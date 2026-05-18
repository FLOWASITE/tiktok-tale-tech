# AI Provider Migration Audit

Phase 2.1 — Tìm mọi chỗ còn dependency vào Lovable Gateway.

## Tóm tắt

- **247 edge functions** total
- **50 functions** dùng `LOVABLE_API_KEY` env var
- **36 functions** hard-code `ai.gateway.lovable.dev` URL (bypass `callAI()`)
- **1 shared module** centralized: `_shared/ai-provider.ts` (đã có shim `SELF_HOSTED_MODE`)

## Nhóm 1 — Đã centralize qua `callAI()` ✅
Những function này chỉ cần bật `SELF_HOSTED_MODE=true` là chạy được vì đi qua shim.

→ Mọi function KHÔNG có trong "Nhóm 2" bên dưới đều thuộc nhóm này.

## Nhóm 2 — Hard-code `ai.gateway.lovable.dev` (cần refactor) ⚠️

### 2a. Image generation (5 functions) — gọi `gemini-2.5-flash-image`
- `analyze-character-image`
- `analyze-product-image`
- `generate-brand-image`
- `generate-character-image`
- `generate-product-image`
- `generate-scene-thumbnail`
- `generate-carousel-image`
- `generate-carousel-images-batch`
- `edit-image-background`
- `overlay-brand-logo`

**Migration plan**: Đã có `POYO_API_KEY` + `KIE_API_KEY` + `GEMINIGEN_API_KEY` làm fallback. Đổi default sang Gemini direct (Google AI Studio API) hoặc PoYo.

### 2b. Embeddings (3 functions) — gọi `text-embedding-004`
- `embed-content`
- `backfill-content-embeddings`
- `generate-embedding`
- `_shared/conversation-embedder.ts`
- `_shared/semantic-dedup.ts`

**Migration plan**: Đổi sang `openai/text-embedding-3-small` qua OpenRouter, native truncate xuống 384-dim. Add helper `callEmbedding()` vào `_shared/ai-provider.ts`.

### 2c. Text generation (20+ functions) — gọi `gemini-2.5-flash` direct
- `ai-edit-channel`, `agent-quality`, `analyze-regulation-impact`
- `enrich-industry-profiles`, `extract-broll-keywords`, `extract-regulation-content`
- `generate-sample-text`, `generate-report-insights`, `generate-video-prompt`
- `geo-generate-prompts`, `geo-scan-brand`, `parse-regulation-document`
- `score-ad-creative`, `suggest-ad-fix`, `suggest-industry`, `import-brand-from-website`
- `_shared/carousel-creative-direction.ts`, `_shared/graph/orchestrator.ts`, `_shared/keyframe-synthesizer.ts`

**Migration plan**: Refactor để dùng `callAI({ provider: 'openrouter', model: 'google/gemini-2.5-flash' })` từ `ai-provider.ts`. Một pattern duy nhất.

### 2d. Streaming chat (2 functions) — dùng AI SDK
- `telegram-webhook` / `telegram-miniapp-chat`

**Migration plan**: Swap `createLovableAiGatewayProvider` → `createOpenAICompatible({ baseURL: 'https://openrouter.ai/api/v1' })`.

## Nhóm 3 — Shared modules cần update

| File | Việc cần làm |
|---|---|
| `_shared/ai-provider.ts` | Mở rộng shim: route `google/*` qua OpenRouter khi self-hosted; thêm `callEmbedding()` helper |
| `_shared/conversation-embedder.ts` | Dùng `callEmbedding()` mới |
| `_shared/semantic-dedup.ts` | Dùng `callEmbedding()` mới |
| `_shared/tool-executor.ts` | Audit AI SDK provider creation |
| `_shared/carousel-creative-direction.ts` | Chuyển sang `callAI()` |
| `_shared/keyframe-synthesizer.ts` | Chuyển sang `callAI()` |
| `_shared/graph/orchestrator.ts` | Chuyển sang `callAI()` |

## Secrets cần có khi self-host

Lấy từ `infra/snapshots/functions-manifest.json`, đã loại trừ Lovable-managed:

**AI providers**:
- `OPENROUTER_API_KEY` ✅ (đã có)
- `NINE_ROUTER_API_KEY` ✅
- `PERPLEXITY_API_KEY`
- `GEMINIGEN_API_KEY`, `POYO_API_KEY`, `KIE_API_KEY` (image)
- `ELEVENLABS_API_KEY`, `CREATOMATE_API_KEY` (audio/video)
- `FIRECRAWL_API_KEY` (web scrape)
- ❌ KHÔNG cần `LOVABLE_API_KEY` nữa sau khi refactor

**OAuth providers** (21 platforms — xem `OAUTH-MIGRATION.md`):
- `PINTEREST_CLIENT_ID/SECRET`, `SHOPIFY_CLIENT_ID/SECRET`, `WIX_APP_ID/SECRET`
- `X_CLIENT_ID/SECRET`, `X_CALLBACK_URL`, `TWITTER_CONSUMER_KEY/SECRET`
- (Facebook/Google/etc. quản qua GoTrue config, không phải env)

**Encryption**:
- `AI_ENCRYPTION_KEY`, `CREDENTIAL_ENCRYPTION_KEY` (BẮT BUỘC copy nguyên từ Lovable Cloud để decrypt social tokens cũ)

**Payment**:
- `PAYOS_API_KEY/CLIENT_ID/CHECKSUM_KEY`, `VNPAY_*`, `PAYMENT_WEBHOOK_SECRET`

**Telegram**:
- `FLOWA_DEFAULT_BOT_TOKEN/USERNAME/WEBHOOK_SECRET`, `TELEGRAM_LINK_SECRET`, `TELEGRAM_MINIAPP_URL`, `TELEGRAM_WEBHOOK_SECRET`

**Admin**:
- `FLOWA_SUPERADMIN_USER_IDS`

**Domain**:
- `SITE_URL=https://app.flowa.one`, `FRONTEND_URL=https://app.flowa.one`, `PUBLIC_BLOG_DOMAIN=flowa.one`

## Test plan

1. Refactor 1 function pilot (`generate-sample-text` — simple, no side effects)
2. Set `SELF_HOSTED_MODE=true` chỉ cho function đó qua per-function env
3. Verify output identical với production
4. Rollout từng nhóm (image → text → embedding → streaming)
5. Cuối cùng tắt `LOVABLE_API_KEY` khỏi env, verify không function nào break
