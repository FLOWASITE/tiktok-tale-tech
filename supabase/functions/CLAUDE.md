# Edge Functions Rules

## Runtime
- **Deno**, không phải Node. Import qua `https://esm.sh/...` hoặc relative path
- Supabase client: `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"`
- Một function = một folder `<name>/index.ts`

## Naming
- Pattern: `action-resource` (vd `generate-script`, `publish-tiktok`, `refresh-facebook-token`)
- Nhóm chính: `generate-*`, `publish-*`, `<platform>-oauth-callback`, `refresh-<platform>-token`, `test-<platform>-connection`, `topic-*`, `agent-*`
- Trước khi tạo function "thiếu", check `supabase/config.toml` xem nó có bị merge không (vd `regenerate-channel` → `generate-multichannel` với `action='regenerate'`)

## Auth pattern
- Public endpoint (webhook, payment callback, public generator) → khai báo `[functions.<name>]` `verify_jwt = false` trong `supabase/config.toml`, dùng `SUPABASE_SERVICE_ROLE_KEY`
- Authenticated endpoint → giữ default `verify_jwt = true`, lấy user qua `supabase.auth.getUser()` từ Authorization header
- Service role key chỉ dùng trong edge function, KHÔNG bao giờ leak ra client

## Skeleton
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { callAI } from "../_shared/ai-provider.ts";
import { saveMetrics, generateTraceId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withPerf({ functionName: '<name>', slowThresholdMs: 45000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    // ... logic
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[<name>] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
```

## Response format
- Success: `{ data: ... }` (hoặc field cụ thể như `{ script: ..., metadata: ... }`)
- Error: `{ error: "<message>" }` với status 4xx/5xx
- Luôn kèm `corsHeaders` + `Content-Type: application/json`
- Validate input sớm, return 400 với message tiếng Việt thân thiện

## Shared utilities — DÙNG, đừng duplicate
Trong `_shared/`:
- `ai-provider.ts` → `callAI()` multi-provider (Lovable Gateway / OpenRouter / OpenAI)
- `ai-config.ts` → `getAIConfig()` per function
- `prompt-utils.ts` → `buildExtendedBrandPrompt()`, brand context builders
- `self-critique.ts` → `runSelfCritiqueLoop()` cho AI quality
- `compliance-precheck.ts` → validate content theo industry rules
- `cache-utils.ts` + `cache/` → `withCache()`, `CACHE_TTL`, `CACHE_SCOPE`
- `logger.ts` → `saveMetrics()`, `generateTraceId()` cho observability
- `cost-estimator.ts` → `estimateCost()` track AI spend
- `middleware/perf.ts` → `withPerf()` wrap mọi `Deno.serve` call
- `errors/flowa-error.ts` → typed errors
- `country-language-map.ts` → `buildLocalizedDateContext()` cho multi-country

⚠️ **Edit `_shared/` ảnh hưởng tất cả 157 functions** — luôn confirm trước khi sửa.

## Logging
- `console.error("[<function-name>] <context>:", error)` — prefix function name
- `console.log` cho structured progress (input params, decisions)
- Metrics qua `saveMetrics({ traceId, model, cost, latency, ... })` cho persistent tracking

## AI calls
- Luôn qua `callAI()` từ `ai-provider.ts`, KHÔNG fetch trực tiếp OpenAI/Gemini API
- Cấu hình per-function trong `ai_function_configs` table; load qua `getAIConfig()`
- Nếu là long-running generation → cân nhắc `runSelfCritiqueLoop()` cho quality
- Cache deterministic AI results bằng `withCache(key, fn, { ttl, scope })`

## Compliance + Industry Memory
- Content generation phải fetch `brand_template` + `industry_template` (qua `industry_template_id` foreign key)
- Build merged rules theo cascade: Industry > Brand > Channel > Defaults
- Chạy `compliance-precheck` trước khi return content

## Khi thêm function mới
1. Tạo folder `<action-resource>/index.ts`
2. Nếu public → thêm entry vào `supabase/config.toml` với `verify_jwt = false`
3. Thêm test trong `__tests__/` (vitest pickup automatic từ `supabase/functions/**/*.test.ts`)
4. Document tên + purpose trong `docs/EDGE-FUNCTIONS.md` nếu là feature lớn
