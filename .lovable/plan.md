

# So sánh Step-by-Step: Thủ công (Manual) vs AI Agent

Dựa trên phân tích code thực tế trong `generate-multichannel/index.ts` (5250 dòng), dưới đây là toàn bộ pipeline từ Input → Output của cả hai luồng.

---

## Pipeline đầy đủ

```text
Step  Manual Mode                              Agent Mode                    Status
────  ─────────────────────────────────────     ────────────────────────────  ──────
 1    Detect Target Audience (DB query)         ✅ Chạy (shared code)         ✅ SAME
 2    Derive Content Goal (journey→goal map)    ✅ Chạy (shared code)         ✅ SAME
 3    Build Smart Context (RAG, hooks, CTAs)    ✅ qualityMode≠fast           ✅ SAME *
 4    Knowledge Graph Context (regulations)     ✅ qualityMode≠fast           ✅ SAME *
 5    Build System Prompt (brand+industry)      ✅ getSystemPrompt()          ✅ SAME
 6    Fetch Targeted Product/Persona            ✅ DB query                   ✅ SAME
 7    Build Hook Sections (per channel)         ✅ buildHookSection()         ❌ SKIP
 8    Build User Prompt (topic+hooks+edits)     Rich prompt + hook + edits   Simple prompt
 9    Build Tool Schema (structured JSON)       ✅ tool_calling               ❌ SKIP
10    Multi-Model Grouping (per channel)        ✅ groupChannelsByModel       ❌ SKIP
11    Content Generation                        Parallel (Promise.all)        Parallel ✅
      - Format                                  Structured JSON (tool_call)   Plain text
      - Retry (website word count)              ✅ MAX_RETRIES=2              ✅ retry 2x
12    Cache (withCache wrapper)                 ✅ 7-day TTL                   ❌ NO CACHE
13    SEO Post-Processing (website)             ✅ Auto-fix score/density      ❌ SKIP
14    Self-Critique Loop                        ✅ qualityMode≠fast            ✅ SAME *
15    Length Validation + Auto-Expansion         ✅ qualityMode≠fast            ✅ SAME *
16    Semantic Dedup (vs DB content)            ✅ embedding (fail-open)       ✅ SAME
17    Cross-Channel Dedup                       ✅ text-based Jaccard          ✅ SAME
18    Footer Info Append                        ✅ Per-channel formatting       ✅ SAME
19    Save to DB                                ✅ Structured fields            ✅ Same table
20    Return Response + Metadata                Full metadata bundle           Basic response
```

\* Đánh dấu "SAME" sau upgrade gần đây (qualityMode: "balanced")

---

## Chi tiết các Gap còn lại (7 điểm khác biệt)

### Gap 1: Hook Sections bị bỏ qua (Step 7-8)
- **Manual**: `buildHookOverview()` + `buildHookSection()` per channel → inject vào user prompt
- **Agent**: User prompt chỉ có `channelDesc` ngắn gọn, KHÔNG có hook instructions
- **Impact**: Agent không sử dụng được các hook pattern mà user đã chọn

### Gap 2: User Prompt thiếu Edited Previews (Step 8)
- **Manual**: Nếu user đã edit preview, nội dung gốc + chỉnh sửa được inject vào prompt để AI học theo phong cách
- **Agent**: Không inject `editedPreviews` → không học từ feedback của user
- **Impact**: Agent bỏ lỡ cơ hội personalization từ user edits

### Gap 3: Không dùng Tool Calling / Structured JSON (Step 9)
- **Manual**: Dùng `tool_calling` với JSON schema chi tiết cho mỗi channel (đặc biệt website có ~15 SEO fields riêng)
- **Agent**: Plain text generation → không có structured output
- **Impact**: Website content từ Agent là string thay vì object có `seo_title`, `meta_description`, `focus_keyword`...
- **Lý do**: Giữ tương thích với mọi model (Qwen, Claude...) vì không phải model nào cũng support tool_calling

### Gap 4: Multi-Model Grouping bị skip (Step 10)
- **Manual**: Nhóm channels theo model config từ Admin → mỗi nhóm chạy với model riêng
- **Agent**: Đã dùng `channelModelConfigs.get(channel)` per channel → **Thực tế đã fix**, mỗi channel lấy model riêng
- **Impact**: Thấp — Agent đã handle multi-model ở mức per-channel

### Gap 5: Cache bị skip hoàn toàn (Step 12)
- **Manual**: Dùng `withCache()` wrapper, TTL 7 ngày, validate cache trước khi dùng
- **Agent**: Không wrap qua cache → luôn generate mới
- **Impact**: Agent luôn tốn AI call, không reuse nội dung cho cùng topic

### Gap 6: SEO Post-Processing bị skip (Step 13)
- **Manual**: Auto-calculate `keyword_density_percent`, `seo_score_estimate`, `og_title`, `og_description`, `reading_time_minutes` cho website
- **Agent**: Website content là plain text → KHÔNG có SEO metadata
- **Impact**: Nếu agent tạo nội dung cho kênh website, thiếu toàn bộ SEO data

### Gap 7: Response Metadata thiếu (Step 20)
- **Manual**: Trả về `dedupWarning`, `personaFit`, `strategyValidation`, `lengthCompliance`, `crossChannelDedup`, `channelPrioritization`
- **Agent**: Trả về basic `generatedData` qua `agent-creator-v2`
- **Impact**: UI không hiển thị được quality insights cho content từ Agent

---

## Tóm tắt theo Priority

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| **P0** | Hook Sections + Edited Previews vào agent prompt | Thấp | Cao - chất lượng prompt |
| **P1** | SEO Post-Processing cho website channel | Trung bình | Cao - website SEO data |
| **P2** | Cache wrapper cho agent mode | Thấp | Trung bình - tiết kiệm cost |
| **P3** | Tool Calling (structured output) | Cao | Trung bình - phá tương thích model |
| **P4** | Response Metadata enrichment | Thấp | Thấp - UI enhancement |

---

## Đề xuất

Nếu muốn tiếp tục nâng cấp, ưu tiên **P0** (inject hooks + edited previews vào agent prompt) và **P1** (SEO post-processing) vì effort thấp nhưng impact lớn nhất. Cache (P2) cũng dễ thêm. Tool Calling (P3) nên giữ nguyên plain text để đảm bảo tương thích đa model.

