
## Bối cảnh

User yêu cầu **audit vòng 2** — KHÔNG fix gì, chỉ READ + REPORT theo 9 sections với rule nghiêm: paste code thật + line numbers, không paraphrase. Đây là task READ-ONLY thuần, không có file change.

## Approach

Tôi sẽ thực hiện audit bằng các tool read-only:

**Round 1 — Files & Schema (parallel)**
- `code--view` các file core: `generate-carousel-image/index.ts`, `generate-carousel/index.ts`, `cache-utils.ts`, `compliance-postcheck.ts`, `compliance-hash.ts`, `color-utils.ts`, `circuit-breaker.ts`, `rate-limiter.ts`, `prompt-guard.ts`
- `code--view` provider wrappers: `poyo-image-generator.ts`, KIE wrapper, GeminiGen wrapper
- `code--view` frontend: `useImageGeneration.ts`, `CarouselViewer.tsx`

**Round 2 — Greps (parallel, where files unclear)**
- `code--search_files` cho: `sceneDescription`, `traceId|correlationId`, `rateLimit`, `sanitize`, `circuitBreaker`, `sharp|composite|overlay`, `formData.topic|formData.brandName`, `invalidate|deleteCache`

**Round 3 — Database (parallel)**
- `supabase--read_query` cho:
  - `\d carousel_images` (verify `scene_description` column exists)
  - `\d ai_metrics` (verify `trace_id`, `sampled_response`, `compliance_*`)
  - `SELECT * FROM ai_config WHERE function_name = 'generate-carousel-image'`
  - Check `compliance_violations` table existence
- `supabase--edge_function_logs` cho `generate-carousel-image` để verify trace prefix + sceneDescription log thực tế

**Round 4 — Color math test (manual)**
- Đọc `color-utils.ts` (đã có trong context — confirmed OKLCH).
- Tính tay 3 test cases: `lightenHex('#FF0000', 85)`, `lightenHex('#7C3AED', 85)`, `darkenHex('#FF0000', 40)` bằng cách trace OKLCH math từ code.

## Output structure

Markdown report 9 sections + summary table + Top 3 issues. Mỗi section:
- File path + line range
- Code snippet nguyên văn (paste, no paraphrase)
- Direct YES/NO/value cho từng câu hỏi
- Nếu NOT IMPLEMENTED → ghi rõ "đã grep pattern X, không tìm thấy"

## Estimate

~15-20 read tool calls (mostly parallel) + 4-5 DB queries + 1 edge log query. Single response. Không cần ask_questions vì user đã specify rất rõ format & rule.

## Scope clarification

- Không fix gì — pure audit
- Không tạo task tracking (single deliverable, không multi-step work)
- Không cần ask_questions

## Sau khi approve

Em chạy parallel reads + DB queries → assemble markdown report theo đúng format 9-section + summary table + Top 3 issues.
