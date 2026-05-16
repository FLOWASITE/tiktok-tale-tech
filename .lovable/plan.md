## Mục tiêu
Thêm 9Router làm **image provider thứ 4** (sau PoYo, KIE, GeminiGen), tái dùng pattern hiện có (circuit breaker, fallback, async polling). Admin có thể chọn `9router/<provider>/<model>` cho các image functions và carousel pipeline.

## Phạm vi
- ✅ Adapter `_shared/ninerouter-image-generator.ts` (sync + async polling)
- ✅ Đăng ký vào `generate-carousel-image`, `generate-brand-image`, `generate-character-image`, `generate-product-image`, `edit-image-background`
- ✅ Admin UI: image models tab nhận 9Router (model picker + circuit breaker view)
- ✅ Fallback chain mở rộng (PoYo → KIE → 9Router → GeminiGen → Lovable Gateway)
- ❌ KHÔNG tự fetch realtime `/v1/models/image` ở client (giữ allowlist hard-code, refresh thủ công)
- ❌ KHÔNG enable `codex/gpt-5.4-image` (yêu cầu ChatGPT Plus, không stable)
- ❌ KHÔNG đổi cost-estimator / quota logic ở bước này

## Kiến trúc

```text
Caller (generate-carousel-image / generate-*-image)
        │
        ▼
detectProvider(model)  ── "9router/..." ──┐
        │                                  ▼
        │                          generateNineRouterImage()
        │                                  │
        │                       POST /v1/images/generations
        │                       (Bearer NINE_ROUTER_API_KEY)
        │                                  │
        │              ┌──────── provider quirk router ────────┐
        │              │ sync (openai/gemini/recraft/minimax)  │
        │              │ async poll (flux/fal/nanobanana)      │
        │              └───────────────────────────────────────┘
        │                                  │
        ▼                          { url | b64_json }
  circuit-breaker.ts  ◄────────────  metrics + retry
```

## Thay đổi cụ thể

### 1. Adapter mới — `supabase/functions/_shared/ninerouter-image-generator.ts`
- Export `generateNineRouterImage({ prompt, model, aspectRatio, inputImage, resolution }): Promise<{ url: string; b64?: string; modelUsed: string }>`
- Strip prefix `9router/` → forward phần còn lại làm `model` field
- Map `aspectRatio` → `size` (`1:1` → `1024x1024`, `16:9` → `1792x1024`, `9:16` → `1024x1792`, …); với gemini/nano-banana thì **bỏ size** (provider ignore)
- Hỗ trợ `inputImage` (img2img) cho FLUX / Fal / Nano-banana edit qua field `image`
- Detect async response (`status: "pending"` hoặc có `task_id`) → poll `/v1/tasks/{id}` mỗi 3s, timeout 90s
- Sử dụng `?response_format=url` mặc định, không xử lý binary để khớp pipeline hiện tại
- ENV bắt buộc: `NINE_ROUTER_BASE_URL`, `NINE_ROUTER_API_KEY` (đã có từ chat provider trước đó)
- Error mapping: 401/403 → `AUTH`, 402 → `CREDITS_EXHAUSTED`, 429 → `RATE_LIMIT`, 5xx → throw để circuit breaker count

### 2. Allowlist model — `src/hooks/useAIConfig.ts`
Thêm `NINEROUTER_IMAGE_MODELS` (~10 model curated):
- `9router/gemini/gemini-3-pro-image-preview`
- `9router/gemini/gemini-3.1-flash-image-preview`
- `9router/openai/gpt-image-1`
- `9router/openai/dall-e-3`
- `9router/black-forest-labs/flux-1.1-pro`
- `9router/black-forest-labs/flux-kontext-pro` (img2img)
- `9router/fal-ai/flux-pro-1.1-ultra`
- `9router/stability-ai/sd3.5-large`
- `9router/recraft/recraft-v3`
- `9router/minimax/image-01`

Spread vào `MODELS_BY_TYPE.image`, thêm `isNineRouterImageModel(id)` helper.

### 3. Router detection — `supabase/functions/_shared/image-provider-router.ts` *(file mới)*
- Centralize logic `detectImageProvider(model)` trả về `'poyo' | 'kie' | 'geminigen' | 'ninerouter' | 'gateway'`
- Export `generateImage(params)` switch theo provider — các function caller chỉ gọi 1 entry point này
- Refactor `generate-carousel-image`, `generate-brand-image`, `generate-character-image`, `generate-product-image`, `edit-image-background` để dùng router (giảm if/else hiện có)

### 4. Fallback chain — `supabase/functions/_shared/circuit-breaker.ts` + carousel orchestrator
- Thêm `'ninerouter'` vào danh sách provider được track
- Cập nhật fallback chain mặc định cho carousel: `[primaryModel, '9router/gemini/gemini-3.1-flash-image-preview', 'poyo/nano-banana-pro', 'google/gemini-3-flash-image-preview']`
- Khi PoYo + KIE đều open → 9Router làm cứu cánh trước khi rớt về Lovable Gateway

### 5. Admin UI
**`src/components/admin/ai/ImageModelPicker.tsx`** (hoặc tương đương — check component tồn tại):
- Thêm provider tab `9Router` (slate-600 dot, label "9R", helper text yêu cầu `NINE_ROUTER_API_KEY`)
- Group `9router/*` models theo sub-provider (Gemini / OpenAI / FLUX / Fal / Stability / Recraft / MiniMax) bằng split `/`
- Badge "img2img" cho models hỗ trợ edit (flux-kontext, nano-banana-edit, fal)

**`AIProviderManager.tsx`** đã có 9Router card (từ task trước) — chỉ cần verify nó hiển thị badge "Image: ✓" sau khi adapter sẵn sàng.

### 6. Observability
- `ai_metrics.provider` chấp nhận `'ninerouter'`
- `cost-estimator.ts` thêm rough price stub `9router/*` = `null` (chưa track exact cost, log size + duration)
- Circuit breaker panel `/admin/ai/observability` tự động pick up vì đọc từ Redis key prefix

### 7. Test
- `_shared/__tests__/ninerouter-image-generator.test.ts` — mock fetch, verify:
  - prefix stripping
  - aspect ratio → size mapping
  - gemini bỏ size
  - 402 → throw `CreditsExhaustedError`
  - async polling success path
- Smoke test thực tế (manual): gọi `generate-carousel-image` với `model: '9router/gemini/gemini-3.1-flash-image-preview'`, kiểm tra ảnh được upload Storage

## Rủi ro & ghi chú
- **Cost tracking lệch**: 9Router chưa expose token/cost trong response → log thời gian + size, để task riêng làm cost mapping sau
- **Async timeout**: FLUX có thể > 60s → giữ pattern `EdgeRuntime.waitUntil` đã có ở carousel, không block client
- **Self-hosted gateway**: nếu user chạy 9Router local (`localhost:20128`) thì edge function không reach được → Admin UI phải cảnh báo "Base URL phải public-accessible" (đã có helper text từ task trước)
- **Provider quirks dày**: codex / nanobanana / fal có schema riêng → giai đoạn 1 chỉ support 10 models curated trong allowlist; mở rộng sau khi có usage data

## Acceptance criteria
1. Admin chọn `9router/gemini/gemini-3-pro-image-preview` ở `/admin/ai → Image Functions` cho `generate-carousel-image` và save thành công
2. Generate 1 slide carousel với model 9Router → ảnh xuất hiện trong UI, log có `provider=ninerouter`, `modelUsed=9router/gemini/...`
3. Force kill PoYo (set circuit breaker open) → carousel tự fallback sang 9Router, vẫn ra ảnh
4. Test với img2img: `flux-kontext-pro` + `previousImageUrl` → ra ảnh seamless chain
5. Unit tests pass; không regress generate-brand/character/product-image

## Out of scope (task sau)
- Realtime model discovery từ `/v1/models/image`
- Cost dashboard chi tiết cho 9Router
- Support `codex/gpt-5.4-image` (SSE stream, OAuth subscription)
- Video generation qua 9Router (Runway/Topaz)
