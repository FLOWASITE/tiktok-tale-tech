

# Sửa tiêu đề Multichannel: bỏ prefix "Bài đăng [Kênh] cho [Brand]"

## Vấn đề

Trên Page Multichannel, card hiển thị title:
- `Bài đăng Linkedin cho Flowa - Agentic Content Marketing P...` ← **prefix thừa**
- `Tạo 1 bài đăng cho X` ← raw user prompt chưa clean kỹ

Nguyên nhân: trong `handleGenerateSingle` (telegram-webhook), khi:
- AI topic suggestion thất bại / trả < 20 ký tự (timeout, brand thiếu industry/pillars, hoặc cache miss + lỗi tạm thời) → rơi xuống fallback
- Fallback hiện tại: `effectiveTopic = "Bài đăng <Channel> cho <Brand>"` → ghi thẳng vào DB title vì Telegram đã set `useTopicAsTitle: true`

→ Title nhìn rất "máy móc", không phải tiêu đề content thực sự.

## Mục tiêu

Title trên DB phải là **một headline có ý nghĩa** (do AI sinh, dựa trên brand + industry), **không bao giờ** chứa cụm `"Bài đăng [Kênh] cho [Brand]"` nữa.

## Thay đổi

### 1. Tăng độ tin cậy của AI topic suggestion (file `supabase/functions/telegram-webhook/index.ts`, hàm `suggestTopicFromAI` ~1345-1394)

- **Tăng timeout**: 12s → **18s** (topic-ai cold-start có thể 8-12s; 12s đang hay bị abort).
- **Hạ ngưỡng accept**: `topic.length >= 20` → `>= 12` (hook ngắn vẫn ổn, vd "Lý do nên dùng AI agent" = 24 ký tự thì pass; "Flowa Marketing AI" = 18 cũng nên dùng nếu AI trả vậy).
- **Retry 1 lần** với `forceRefresh: true` nếu lần 1 fail/empty (chỉ khi còn budget thời gian < 8s đã trôi qua) — tăng tỉ lệ thành công khi cache miss kèm transient error.
- Log rõ lý do fail (`status_code`, `empty_suggestions`, `topic_too_short`).

### 2. Thay logic fallback — không bao giờ dùng prefix "Bài đăng X cho Y" làm title (block `handleGenerateSingle` ~1454-1473)

Thứ tự mới:
1. **B1 AI suggestion** → nếu có (≥ 12 ký tự) → dùng làm title ✅
2. **B2 cleanedTopic** từ user prompt → nếu sau khi clean còn ≥ 4 ký tự → dùng làm title
3. **B3 Brand-driven heuristic title** (KHÔNG còn fallback raw "Bài đăng X cho Y"):
   - Nếu brand có `industry` → tạo headline ngắn từ industry + 1 trong các template:
     - `"<Industry>: Bí quyết & xu hướng đáng chú ý"` 
     - `"Cập nhật mới nhất về <Industry> cho thương hiệu <Brand>"`
     - Random pick 1 template để tránh trùng lặp giữa các bài.
   - Nếu brand không có industry → `"Cập nhật từ <Brand>"` hoặc `"<Brand> — bài viết mới"`.
   - Nếu cả brand cũng rỗng → chỉ dùng `"Bài viết mới"` (không kèm channel — vì channel đã hiển thị qua icon trên card).

### 3. Cải thiện regex `cleanTopicFromTelegramPrompt` (~1211-1230) — xử lý "Tạo 1 bài đăng cho X"

Pattern `/^(facebook|fb|...|x|tweet|...)\s*/iu` đang dùng `\s*` ở cuối nên match cụm rồi không cần ký tự sau. Nhưng vấn đề: regex `/^(cho|trên|tại|on|for)\s+/iu` yêu cầu **có space sau** — nếu user gõ "cho X" cuối câu, sau strip "cho " → còn "X" → strip "x" cần `\s*` (đã có). Cần verify:

- Test case `"Tạo 1 bài đăng cho X"`: 
  - strip `tạo ` → `"1 bài đăng cho X"`
  - strip `1 ` → `"bài đăng cho X"`
  - strip `bài đăng ` (pattern 3 match `bài` + optional `đăng`) → `"cho X"`
  - strip `cho ` → `"X"`
  - strip `x` (pattern 5 với `\s*` cuối) → `""`
  - → cleanedTopic = "" → đi xuống B3 (brand-driven heuristic). ✅ **Đúng kết quả mong muốn** sau khi sửa B3.

- Sửa nhỏ: pattern channel name cuối câu cần `\b` boundary để không strip nhầm "Xin chào" → "in chào". Đổi `/^(facebook|...|x|...)\s*/iu` → `/^(facebook|...|x|...)(?=\s|$)/iu`.

### 4. Cập nhật message kết quả Telegram (block ~1488+)

Vì title giờ đẹp hơn, header "📝 *<title>*" sẽ tự động cải thiện. Không cần thay layout. Chỉ thêm **note nhỏ** dưới title nếu `titleSource = "fallback"`:
- `_💡 Tiêu đề tạm — bạn có thể đổi trên Mini App_`

Để user biết có thể tinh chỉnh.

### 5. Verify: không có file frontend nào prepend "Bài đăng" vào title khi render

Đã check `src/utils/channelColors.ts` và Multichannel page render `content.title` thẳng — confirm vấn đề 100% ở phía edge function generate, không phải UI.

## Files sẽ sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | (a) `suggestTopicFromAI`: timeout 18s + retry với forceRefresh; threshold 12 ký tự; log chi tiết. (b) `cleanTopicFromTelegramPrompt`: dùng `(?=\s|$)` lookahead cho pattern channel. (c) Block fallback title: thay `"Bài đăng <Channel> cho <Brand>"` bằng heuristic dựa trên industry/brand. (d) Thêm note "tiêu đề tạm" khi fallback. |

## Edge cases

- **Brand mới chưa có industry**: heuristic dùng brand_name → "Cập nhật từ Flowa" thay vì "Bài đăng Linkedin cho Flowa - Agentic Content Marketing..." (gãy giữa chừng vì brand_name dài quá).
- **Brand_name rất dài (>40 ký tự)**: truncate xuống 40 trước khi nhét vào template.
- **User prompt hợp lệ nhưng AI vẫn fail** (vd "viết bài về serum mới"): cleanedTopic = "serum mới" → B2 dùng → title = "serum mới" (acceptable, không lý tưởng nhưng không bị "Bài đăng FB cho..." nữa).
- **Bài cũ trong DB**: chỉ áp dụng cho bài tạo mới; không backfill — user có thể edit title trên Mini App nếu muốn.

## Rủi ro

Thấp. Tăng timeout 6s → một số case Telegram message kết quả có thể chậm thêm 3-6s, nhưng đã có message "đang viết… 20-40 giây" nên user không sốt ruột. Heuristic fallback đơn giản, no extra API call.

## Ngoài phạm vi

- Thêm command `/edit_title <id>` cho phép user đổi title qua Telegram (defer)
- Backfill title cũ trong DB (sẽ làm script riêng nếu user yêu cầu)

