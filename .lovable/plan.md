
## Bối cảnh
Anh yêu cầu audit nghiêm ngặt 15 câu hỏi với rule absolute: paste raw code + grep output, không sửa file, không recommend. Em đang ở READ-ONLY mode — đúng mode cho task này, không cần switch sang default.

## Approach
Chạy reads + greps + DB queries song song, assemble report markdown 15 Q&A theo format chính xác + table tổng kết + self-verification. Output trực tiếp trong chat (không tạo file, không exec).

**Round 1 — Greps song song**
- `sceneDescription` trong `generate-carousel-image/index.ts`
- `previousSceneDescription` trong `supabase/functions/` + `src/`
- `singleRefImage` trong `generate-carousel-image/`
- `inputImages|multipleImages|referenceImages` trong shared + carousel-image
- `invalidate|deleteCache|clearCache|purgeCache` trong `_shared/` + admin
- `sharp|composite|overlay|Jimp|canvas` trong `supabase/functions/`
- `scene_description` trong `supabase/migrations/`
- `function hashComplianceRules|hashComplianceRules =` trong `supabase/functions/`

**Round 2 — Reads song song**
- `generate-carousel-image/index.ts` (full hoặc các line ranges từ grep)
- `generate-carousel/index.ts` (line ranges quanh withCache + validate)
- `_shared/cache-utils.ts` (full withCache function)
- `_shared/cache/compliance-hash.ts` (đã có 1 phần, đọc lại confirm)
- `_shared/poyo-image-generator.ts` (đã có context, paste signature)
- `_shared/geminigen-image-generator.ts` (đã có context, paste signature)
- KIE wrapper file (cần list_dir `_shared/` để locate)

**Round 3 — DB query**
- `SELECT function_name, default_model, fallback_models FROM ai_config WHERE function_name LIKE '%carousel-image%'`
- Check column `scene_description` trong `carousel_images` qua `information_schema`

## Output
Single response markdown:
- 15 Q&A blocks theo format `Q[X.Y] / Command run / File / Lines / Snippet / Direct answer / Evidence`
- Table 4 rows status
- Self-verification 5 items

Mỗi snippet paste raw từ tool output, không paraphrase. Mỗi NOT FOUND list ≥3 patterns + files đã check.

## Estimate
~8-10 grep calls, ~7 read calls, 2 DB queries, all parallel-batched. Single message ~10-12K chars markdown.

## Sau khi approve
Em chạy parallel greps/reads/DB → assemble 15 Q&A + table + SV trực tiếp output trong chat. Không sửa file, không tạo file, không exec script.
