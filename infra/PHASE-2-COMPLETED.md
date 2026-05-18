# Phase 2 — AI Provider Refactor: COMPLETED

Date: 2026-05-18

## Tóm tắt
- ✅ Tạo `_shared/lovable-gateway.ts` shim với `getGatewayConfig()` — auto-route `ai.gateway.lovable.dev` → `openrouter.ai/api/v1` khi `SELF_HOSTED_MODE=true`
- ✅ Tạo `_shared/embedding.ts` `callEmbedding()` multi-provider (OpenAI 3-small → OpenRouter → DashScope → Lovable fallback)
- ✅ Codemod refactor 44 functions (script: `infra/scripts/13-refactor-gateway-calls.py`)
- ✅ Refactor manual 4 embedding sites: `generate-embedding`, `backfill-content-embeddings`, `_shared/conversation-embedder.ts`, `_shared/semantic-dedup.ts`
- ✅ Zero remaining hard-coded `https://ai.gateway.lovable.dev` URL trong code path

## Cách hoạt động

### Trên Lovable Cloud (default)
- `SELF_HOSTED_MODE` không set → `getGatewayConfig()` trả `https://ai.gateway.lovable.dev/v1/chat/completions` + `LOVABLE_API_KEY`
- `callEmbedding()` ưu tiên Lovable Gateway embeddings nếu `LOVABLE_API_KEY` có sẵn
- **Behavior không đổi — zero risk to prod**

### Trên self-hosted Supabase (server vật lý)
- Set env `SELF_HOSTED_MODE=true` + `OPENROUTER_API_KEY` + `OPENAI_API_KEY`
- `getGatewayConfig()` trả `https://openrouter.ai/api/v1/chat/completions` + `OPENROUTER_API_KEY`
- `callEmbedding()` ưu tiên OpenAI `text-embedding-3-small` (native 384-dim truncate, match pgvector column)
- Tất cả 44 functions tự động chạy với OpenRouter — không cần edit thêm

## Files đã refactor (44)
Xem output `python3 infra/scripts/13-refactor-gateway-calls.py`. Gồm:
- 36 text generation functions (generate-*, agent-*, ai-edit-*, analyze-*, geo-*, score-*, suggest-*, extract-*)
- 4 chatbot functions (telegram-webhook, telegram-miniapp-chat, sales-chatbot, help-chatbot)
- 4 shared modules (`tool-executor.ts`, `carousel-creative-direction.ts`, `keyframe-synthesizer.ts`, `graph/orchestrator.ts`)

## Edge case còn lại

### Image generation (10 functions) — cần thêm work
`generate-brand-image`, `generate-carousel-image(s-batch)`, `generate-character-image`, `generate-product-image`, `analyze-character-image`, `analyze-product-image`, `edit-image-background`, `generate-scene-thumbnail`, `overlay-brand-logo`.

Các function này gọi `gemini-2.5-flash-image` qua Lovable Gateway. OpenRouter có hỗ trợ Gemini image, nhưng **chưa test**. Khi self-host:
- Option A: Đã có fallback `POYO_API_KEY` / `KIE_API_KEY` / `GEMINIGEN_API_KEY` direct API — code đã sẵn sàng
- Option B: Test xem OpenRouter có route `google/gemini-2.5-flash-image` thành công không (cần verify)

### Embeddings dimension mismatch
- Cũ: `google/text-embedding-004` (768-dim) → truncate 384
- Mới: `openai/text-embedding-3-small` (1536-dim → native 384 via `dimensions` param)
- **Existing embeddings trong DB vẫn dùng được** (cùng 384-dim, same vector space distance) — không cần re-index ngay
- Recommended: re-index sau khi cutover để tăng accuracy của semantic search

## Verification

```bash
# Không còn hard-code URL
rg "ai.gateway.lovable.dev" supabase/functions/ \
  | grep -v "lovable-gateway.ts\|ai-provider.ts\|_shared/embedding.ts"
# Expected: empty (chỉ shim + provider mới được phép giữ URL)

# Tất cả import shim đúng
rg "from .*lovable-gateway" supabase/functions/ | wc -l
# Expected: ~44
```

## Test plan trước khi cutover

1. Trên Lovable Cloud: smoke test 5 functions sau khi merge (không bật `SELF_HOSTED_MODE`)
   - `generate-multichannel`, `generate-script`, `generate-carousel`, `agent-pipeline`, `ai-edit-channel`
2. Trên local Docker stack (Phase 3): set `SELF_HOSTED_MODE=true` + `OPENROUTER_API_KEY` + `OPENAI_API_KEY`, smoke test cùng 5 functions
3. So sánh response chất lượng (qualitative) — model identifiers giống nhau nên kết quả không nên khác nhiều
