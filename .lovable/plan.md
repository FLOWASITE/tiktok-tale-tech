

# Sửa lỗi Telegram tạo bài: sai brand, sai tiêu đề, thiếu ảnh, thiếu nội dung X

## Chẩn đoán

Khi user chat trong Telegram bot "tạo bài đăng FB" / "tạo bài đăng X", flow hiện tại:
1. Webhook nhận message → route sang chat agent (orchestrator → content-node)
2. `content-node` gọi `generate_multichannel` với **`channels: ['facebook', 'instagram', 'tiktok']` hard-coded** (xem `supabase/functions/_shared/graph/nodes/content-node.ts` dòng 77)
3. Không truyền `brandTemplateId` đúng từ Telegram binding → fallback brand mặc định
4. Không gọi `image-node` → không có ảnh
5. Tiêu đề trên Multichannel page lấy từ `userMessage` thô ("tạo bài đăng FB") thay vì topic được generate

Đây là 4 bug riêng biệt, cần sửa cùng lúc.

## Kế hoạch sửa

### A. Parse channel từ message người dùng (fix bug #2 - X không có nội dung)
File: `supabase/functions/_shared/graph/nodes/content-node.ts`

- Thêm hàm `extractChannelsFromMessage(userMessage)`:
  - Regex match: `facebook|fb|fanpage` → `facebook`
  - `twitter|x\b|tweet` → `twitter`
  - `instagram|ig` → `instagram`
  - `tiktok|tt` → `tiktok`
  - `linkedin|li` → `linkedin`
  - `zalo|oa` → `zalo_oa`
  - `threads`, `youtube`, `email`, `website|blog` → tương ứng
- Nếu match được ≥1 channel → dùng list đó. Nếu không match → fallback `['facebook', 'instagram', 'tiktok']`
- Áp dụng ở cả fast-path và fallback path

### B. Truyền brand context đúng từ Telegram binding (fix bug #1 - sai brand)
File: `supabase/functions/telegram-webhook/index.ts`

- Khi handler chat message resolve user_id từ telegram, đọc thêm `active_brand_template_id` từ `telegram_chat_bindings` (hoặc binding hiện hành của org)
- Truyền `brandTemplateId` + `brandName` + `industry` xuống graph context (orchestrator → content-node ctx)
- Nếu binding chưa có brand → fetch brand mặc định của org (`brand_templates` order by created_at limit 1)

### C. Sinh topic/title đúng thay vì dùng raw message (fix bug #1 - tiêu đề sai)
File: `supabase/functions/_shared/graph/nodes/content-node.ts`

- Trong fast-path, hiện đang lấy `topic = state.bestTopic || extractTopicFromPlan(...) || state.userMessage`
- Vấn đề: từ Telegram, `bestTopic` và `contentPlan` đều null → rơi vào `userMessage = "tạo bài đăng FB"` → topic xấu
- Fix: nếu `userMessage` match pattern "tạo bài [đăng/post] cho/trên <channel>" mà không có chủ đề cụ thể → **bỏ fast-path**, chạy fallback path để LLM tự sinh topic dựa trên brand context (industry, content_pillars)
- Heuristic: regex `^(tạo|làm|viết)\s+(bài|post)` + length < 40 ký tự → coi là "thiếu topic" → đi fallback

### D. Gọi image-node sau content-node khi user yêu cầu bài đăng (fix bug #1, #2 - thiếu ảnh)
File: `supabase/functions/_shared/graph/orchestrator.ts` (hoặc nơi build pipeline DAG)

- Khi intent = `create_content` và message chứa keyword "bài đăng / post / đăng" → thêm node `image` chạy song song hoặc tuần tự sau `content`
- `image-node` đã có sẵn (`image-node.ts`) — chỉ cần plan trong DAG include nó
- Truyền `contentSummary` + `channel` từ output của content-node vào image-node để sinh ảnh đúng kênh
- Lưu image URL vào `multi_channel_contents.channel_images[channel]` cùng lúc khi save content

### E. Hiển thị title đúng trên Multichannel page
File: `supabase/functions/_shared/tool-executor.ts` (hàm `executeGenerateMultichannel`) 

- Verify: khi insert vào `multi_channel_contents`, field `topic`/`title` đang lấy từ đâu?
- Đảm bảo lưu **topic do AI generate** (từ output `generate_multichannel`), không phải `userMessage` raw
- Nếu cần — thêm bước extract title từ first generated channel content (heading đầu tiên)

## Files sẽ sửa

- `supabase/functions/_shared/graph/nodes/content-node.ts` — channel parser + smart fast-path skip
- `supabase/functions/telegram-webhook/index.ts` — truyền brand context vào graph
- `supabase/functions/_shared/graph/orchestrator.ts` — thêm image node vào DAG khi intent là create_content
- `supabase/functions/_shared/tool-executor.ts` — verify title saving logic

## Rủi ro

Trung bình. Thay đổi DAG (thêm image node) có thể tăng thời gian sinh ~10-20s. Sẽ giữ image generation **không block** content save — nếu image fail vẫn save content.

## Ngoài phạm vi

- Cải thiện UI Telegram để chọn channel/brand trước khi generate (sẽ làm sau khi base flow ổn)
- Đa ngôn ngữ trong channel parser (giờ chỉ VI/EN)

