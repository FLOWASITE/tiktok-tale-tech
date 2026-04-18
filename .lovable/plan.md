
## Bối cảnh
User nêu 5 vấn đề quan sát được sau audit pipeline carousel. Cần verify trước khi fix vì codebase đã có sẵn nhiều primitive (`prompt-guard.ts`, `tracing.ts`, `request-validator.ts`). Tránh duplicate work.

## Phase 0 — Investigation (đã thấy trong context)

Có sẵn:
- ✅ `supabase/functions/_shared/prompt-guard.ts` — `sanitizeInput()` + `logSecurityEvent()` (chưa biết có dùng trong generate-carousel chưa)
- ✅ `supabase/functions/_shared/tracing.ts` — W3C trace context (chưa biết áp dụng vào carousel chưa)
- ✅ `supabase/functions/_shared/pipeline/request-validator.ts` — rate limit util qua `checkRateLimit()` (chưa biết generate-carousel có gọi không)

Cần đọc để xác nhận:
1. `supabase/functions/generate-carousel/index.ts` — có gọi `sanitizeInput`, `validateRequest`, `createTrace` không?
2. `supabase/functions/generate-carousel-image/index.ts` — có gọi `createTrace`/`getTraceHeaders` không? Provider fallback chain code path?
3. `supabase/functions/_shared/rate-limiter.ts` — có config `'carousel'` không?
4. `src/lib/colorUtils.ts` (hoặc tương đương) — `lightenHex` đang RGB hay HSL?
5. Bảng logs/metrics — có cột `correlation_id` / `trace_id` chưa?

## Giải pháp — 5 vấn đề (chia priority theo impact × effort)

### 2.1 — HIGH: Prompt injection guard + rate limit per org

**File**: `supabase/functions/generate-carousel/index.ts`, `generate-carousel-image/index.ts`

```typescript
import { sanitizeInput, logSecurityEvent } from "../_shared/prompt-guard.ts";
import { validateRequest } from "../_shared/pipeline/request-validator.ts";

// At entry, after parse body:
const topicGuard = sanitizeInput(topic || "");
const brandGuide = sanitizeInput(brandGuideline || "");
if (topicGuard.riskLevel === "high") {
  await logSecurityEvent(supabase, userId, organizationId, topicGuard);
  return new Response(JSON.stringify({
    error: "INPUT_BLOCKED",
    reason: "Detected prompt injection patterns",
    flagged: topicGuard.flaggedPatterns,
  }), { status: 400, headers: corsHeaders });
}
// Use sanitized strings downstream
const safeTopic = topicGuard.sanitizedMessage;
const safeBrandGuide = brandGuide.sanitizedMessage;

// Rate limit (extend rate-limiter config to include 'carousel')
const validation = await validateRequest(supabase, userId, corsHeaders, logger);
if (!validation.allowed) return validation.errorResponse!;
```

**File**: `supabase/functions/_shared/rate-limiter.ts` — thêm config:
```typescript
carousel: { free: { perHour: 10 }, starter: { perHour: 30 }, pro: { perHour: 100 }, enterprise: { perHour: 500 } }
```

### 2.2 — HIGH: Circuit breaker cho image provider fallback

**New file**: `supabase/functions/_shared/circuit-breaker.ts`

```typescript
// In-memory + Postgres-backed circuit breaker
// Window: 60s sliding, threshold: 50% fail rate min 5 requests, open duration: 5min
interface ProviderState { failures: number; total: number; openedAt?: number; }
const STATE = new Map<string, ProviderState>();

export function shouldSkip(provider: string): boolean {
  const s = STATE.get(provider);
  if (!s?.openedAt) return false;
  if (Date.now() - s.openedAt > 5 * 60_000) { STATE.delete(provider); return false; }
  return true;
}

export function recordResult(provider: string, ok: boolean): void { /* update + open if needed */ }
```

**File**: `supabase/functions/generate-carousel-image/index.ts` — wrap mỗi provider call:
```typescript
for (const provider of ["poyo", "kie", "gemini-gen", "lovable-gateway"]) {
  if (shouldSkip(provider)) { console.log(`[circuit] SKIP ${provider}`); continue; }
  try {
    const result = await callProvider(provider, ...);
    recordResult(provider, true);
    return result;
  } catch (err) {
    recordResult(provider, false);
  }
}
```

Persist breaker state vào table `provider_circuit_state` (uuid, provider text, opened_at, failures, total) để chia sẻ giữa instance edge function.

### 2.3 — MEDIUM: sceneDescription extraction robust

**File**: `supabase/functions/generate-carousel-image/index.ts` — đã có `describeImageForContinuity` (vừa tạo Phase 1). Cập nhật prompt + extraction:

```typescript
async function describeImageForContinuity(imageUrl: string, lovableApiKey: string) {
  const resp = await fetch(GATEWAY, {
    method: "POST",
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [{ role: "user", content: [
        { type: "text", text: "Describe this image's visual style. Respond ONLY with JSON: {\"scene\": \"...2-3 sentences plain prose, no markdown...\"}" },
        { type: "image_url", image_url: { url: imageUrl } },
      ]}],
      tools: [{ type: "function", function: {
        name: "describe_scene",
        parameters: { type: "object", properties: { scene: { type: "string" }}, required: ["scene"]}
      }}],
      tool_choice: { type: "function", function: { name: "describe_scene" }},
    }),
  });
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = args ? JSON.parse(args) : {};
  return sanitizeSceneDescription(parsed.scene || "").slice(0, 300);
}
```

Fallback: nếu tool call fail → regex extract `Scene:\s*(.+)` từ raw text → cuối cùng mới slice 300 chars.

### 2.4 — MEDIUM: Color lightening dùng OKLCH

**File**: tìm `lightenHex` trong codebase — likely `src/lib/colorUtils.ts` hoặc `supabase/functions/_shared/image-prompt-style-computer.ts`.

Replace RGB linear interp bằng OKLCH:
```typescript
// OKLCH is perceptually uniform — preserves hue when lightening
function lightenHex(hex: string, amount: number): string {
  const { l, c, h } = hexToOklch(hex);
  const newL = l + (1 - l) * amount; // amount 0..1
  return oklchToHex({ l: newL, c: c * (1 - amount * 0.3), h }); // slight chroma reduce for natural pastel
}
```

Sử dụng lib `culori` (Deno port: `https://esm.sh/culori@4`) để khỏi tự implement chuyển đổi không gian màu.

Test fixture: 20 màu đa dạng (red/blue/purple/orange/cyan/lime/magenta...) → assert lightened version giữ hue (delta H < 5°).

### 2.5 — LOW: Correlation ID xuyên function

**File**: `generate-carousel/index.ts` — tạo `traceId = carouselId` (nếu đã có) hoặc fresh uuid:
```typescript
import { createTrace, getTraceHeaders } from "../_shared/tracing.ts";

const trace = createTrace(req.headers.get("x-trace-id") || carouselId);
const childSpan = createSpan(trace, trace.rootSpanId, "generate-carousel-image-call");

// When invoking generate-carousel-image:
await fetch(`${SUPABASE_URL}/functions/v1/generate-carousel-image`, {
  headers: { ...getTraceHeaders(trace.traceId, childSpan.spanId), Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ ..., traceId: trace.traceId }),
});
```

**Frontend** `useImageGeneration.ts`: forward `traceId` (= `carouselId`) trong body.

**Logging**: Thêm `[trace=${traceId}]` prefix vào mọi `console.log` trong cả 2 function.

**Sampling raw AI response** — migration:
```sql
ALTER TABLE ai_metrics ADD COLUMN IF NOT EXISTS trace_id text;
ALTER TABLE ai_metrics ADD COLUMN IF NOT EXISTS sampled_response text; -- truncated 2000 chars
CREATE INDEX IF NOT EXISTS ai_metrics_trace_id_idx ON ai_metrics(trace_id);
```

Logic sample: `if (Math.random() < 0.1) metric.sampled_response = aiResponse.slice(0, 2000);`

## Files dự kiến sửa

- **Edit**: `supabase/functions/generate-carousel/index.ts` (sanitize + rate limit + trace)
- **Edit**: `supabase/functions/generate-carousel-image/index.ts` (sanitize + circuit breaker + structured scene + trace)
- **Edit**: `supabase/functions/_shared/rate-limiter.ts` (add 'carousel' bucket)
- **New**: `supabase/functions/_shared/circuit-breaker.ts`
- **Edit**: `src/lib/colorUtils.ts` hoặc image-prompt style computer (OKLCH)
- **Edit**: `src/hooks/useImageGeneration.ts` (forward traceId)
- **Migration**: `provider_circuit_state` table + `ai_metrics.trace_id` + `ai_metrics.sampled_response`

## Trade-off

- **Cost**: Sanitize ~0ms (regex). Circuit breaker ~5ms (in-memory + occasional DB write). Structured scene call same cost as current describe. OKLCH conversion ~1ms/color.
- **Latency**: Rate limit check ~10ms. Trace headers ~0ms.
- **False positive**: Circuit breaker có thể trip oan khi network blip — giảm bằng `min 5 requests` rule.
- **Backward compat**: Cũ vẫn chạy nếu thiếu `traceId` (auto-generate fallback).

## Out of scope

- Distributed circuit breaker với Redis (in-memory + DB là đủ cho hiện tại)
- LLM-judge cho injection (regex đủ cho high-severity patterns)
- Full OpenTelemetry export (chỉ logging in-house)

## Sau khi approve

Triển khai theo thứ tự: 2.1 (input safety + rate limit) → 2.2 (circuit breaker) → 2.5 (trace ID — quick) → 2.3 (structured scene) → 2.4 (OKLCH).
