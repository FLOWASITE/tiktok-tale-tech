
## Bối cảnh
Anh yêu cầu audit READ-ONLY 11 câu hỏi (Section 1: Q1.1-1.5, Section 4: Q4.1-4.6). Output paste raw code/grep, không sửa file, không recommend. Em đang ở chat mode → không exec được, dùng read-only tools (search_files, view, supabase--read_query).

## Approach

**Round 1 — Greps & list_dir song song**
- `code--search_files` "sceneDescription" trong `supabase/functions/generate-carousel-image/`
- `code--search_files` "previousSceneDescription" trong `supabase/functions/` + `src/`
- `code--search_files` "singleRefImage" trong `supabase/functions/generate-carousel-image/`
- `code--search_files` "inputImages|multipleImages|referenceImages|images\[" trong `supabase/functions/`
- `code--search_files` "sharp|composite|overlay|Jimp" trong `supabase/functions/`
- `code--search_files` "scene_description" trong `supabase/migrations/`
- `code--list_dir` `supabase/functions/_shared/` (locate KIE wrapper)

**Round 2 — Reads song song** (dựa vào line numbers từ Round 1)
- `generate-carousel-image/index.ts` — các block chứa sceneDescription assignment per provider + Response JSON + singleRefImage logic
- KIE wrapper file (sau khi locate)
- PoYo + GeminiGen wrappers — đã có context, paste signature từ context có sẵn
- Migration file cho `scene_description`

**Round 3 — DB queries song song**
- `SELECT function_name, default_model, fallback_models FROM ai_config WHERE function_name LIKE '%carousel-image%'`
- `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='carousel_images' AND column_name='scene_description'`

## Output
Single message markdown:
- 11 Q&A blocks: `Q[X.Y] / Command / File / Lines / Snippet (raw) / Direct answer / Evidence`
- Table 2 rows (Section 1, Section 4)
- Self-Verification 5 items, SV-5 = 11

Mỗi NOT FOUND list ≥3 patterns + files đã check. Không paraphrase, không recommend.

## Sau khi approve
Em chạy parallel search_files + list_dir → parallel reads + DB queries → assemble report 11 Q&A trực tiếp trong chat.
