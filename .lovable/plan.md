## Vấn đề
Các edge function liên quan đến SEO (keyword research, enrichment, clustering, landing, rank tracker) **chưa xuất hiện** trong Admin → AI Management → Functions, nên admin không thể đổi model / cache TTL / temperature như các function khác. Hiện chúng hard-code model trực tiếp trong code (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`).

GEO functions đã có sẵn trong category `analysis`; SEO thì thiếu hoàn toàn.

## Phạm vi

### 1. Thêm category mới `seo`
- Migration insert vào `ai_function_categories` (system-level, `organization_id IS NULL`):
  - slug `seo`, label `SEO`, icon `search`, sort_order `7` (đẩy `research`/`utility`/`video`/`audio` xuống 1 nấc — hoặc dùng `7.5` bằng cách set `sort_order=7` cho seo, các slug khác giữ nguyên thì seo nằm cạnh research, chấp nhận tie).

### 2. Đăng ký 7 function vào `AI_FUNCTIONS` (`src/hooks/useAIConfig.ts`)
| Function | Type | Default model |
|---|---|---|
| `keyword-research-v2` | text | google/gemini-2.5-pro |
| `keyword-research` | text | google/gemini-2.5-pro |
| `keyword-research-save` | text | google/gemini-2.5-flash-lite |
| `enrich-keyword-serp` | text | google/gemini-2.5-flash-lite |
| `suggest-cluster-topics` | text | google/gemini-2.5-flash |
| `generate-seo-landing` | text | google/gemini-2.5-flash |
| `seo-rank-tracker` | text | google/gemini-2.5-flash-lite |

Tất cả category `'seo'`. Bổ sung tương ứng vào `DEFAULT_CONFIGS` trong `supabase/functions/_shared/ai-config.ts` (model + temperature + cacheTtlHours).

### 3. Refactor edge functions để đọc override từ DB
Thay vì hard-code `model: "google/gemini-2.5-..."`, gọi `getAIConfig(functionName, organizationId)` và dùng `config.model` + `config.temperature` + `config.maxTokens` khi build payload tới Lovable Gateway.

Áp dụng cho:
- `supabase/functions/keyword-research-v2/index.ts` (cả Pro chính + fallback Flash giữ nguyên — chỉ override model chính)
- `supabase/functions/keyword-research/index.ts`
- `supabase/functions/enrich-keyword-serp/index.ts`
- `supabase/functions/suggest-cluster-topics/index.ts`
- `supabase/functions/generate-seo-landing/index.ts`
- `supabase/functions/seo-rank-tracker/index.ts` (kiểm tra & wire nếu có gọi LLM)
- `supabase/functions/keyword-research-save/index.ts` (chỉ wire nếu có LLM call; nếu chỉ DB upsert thì skip — vẫn đăng ký metadata cho admin biết)

Pattern dùng lại từ `web-search-fallback.ts` đã có sẵn trong codebase.

### 4. Memory
Update `mem://features/seo/research-lab-v2-vn.md` ghi chú: model giờ ưu tiên admin override → default → hardcoded fallback.

## Không thay đổi
- Không tạo lại GEO functions (đã đăng ký).
- Không động vào `topic-ai`, `chat-topics` (đã có sẵn).
- Không thay đổi UI Admin AI page — function mới sẽ tự xuất hiện trong category SEO mới (collapsed by default).

## Kết quả
Admin vào `/admin/ai → Functions` sẽ thấy section **SEO** với 7 function, đổi được model/temperature/cache như các category khác. Edge function tự nhận override qua `getAIConfig()`.
