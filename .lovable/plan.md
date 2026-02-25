
Mục tiêu: xử lý dứt điểm việc chat “tạo nội dung” nhưng không tạo bản ghi trong Multichannel và không chạy trọn pipeline tạo nội dung.

1) Những gì đã xác minh từ log (nguyên nhân gốc)
- Content Agent đã gọi tool `generate_multichannel` đúng (có `topic`, `journey_stage`, `content_angle`, `userId`, `orgId`).
- Nhưng function `generate-multichannel` trả về lỗi auth:
  - `Auth error: invalid claim: missing sub claim`
  - `User ID from token: null`
  - `No valid user found from authorization header`
- Lý do trực tiếp:
  - Tool executor đang gọi `generate-multichannel` bằng service key (`Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`), trong khi `generate-multichannel` lại đang bắt buộc đọc user từ JWT “end-user” (`supabase.auth.getUser(token)`).
- Lý do khiến UI vẫn trả lời “đã tạo” dù thực tế fail:
  - Trong `executeAgent`, khi tool fail thì message trả lại model chỉ chứa `toolResult.result` (thường là `null`), không kèm `success/error`, nên model tiếp tục trả lời như thể đã hoàn tất.
  - Supervisor vì vậy vẫn đi tiếp các bước review/summarize, gây cảm giác “chỉ trả về chủ đề/summary”.

2) Hướng sửa đề xuất (ưu tiên theo luồng)
A. Sửa xác thực đầu-cuối cho luồng chat
- File: `src/hooks/useChatStreaming.ts`
  - Đổi cách gửi Authorization cho `chat-topics`: lấy access token của user hiện tại (như các hook streaming khác đang làm), không dùng publishable key làm bearer.
  - Gửi thêm `apikey` publishable key để giữ tương thích preflight.
- File: `supabase/functions/chat-topics/index.ts`
  - Đọc Authorization header, xác thực user từ token.
  - Nếu token hợp lệ: dùng user từ token làm nguồn sự thật (không tin tuyệt đối vào `userId` từ body).
  - Truyền token xuống execution context cho supervisor/agentic/tool chain.

B. Sửa invoke nội bộ tool `generate_multichannel`
- File: `supabase/functions/_shared/tool-executor.ts`
  - `executeGenerateMultichannel` ưu tiên dùng user access token (được truyền từ context) khi gọi `generate-multichannel`.
  - Đồng thời gửi đầy đủ field tương thích cả camelCase và snake_case cho user/org:
    - `userId`, `user_id`
    - `organizationId`, `organization_id`
  - Giữ nguyên strategic params (`journey_stage`, `content_angle`, `auto_research`) đã thêm trước đó.

C. Làm `generate-multichannel` chấp nhận đúng cả 2 ngữ cảnh gọi (an toàn)
- File: `supabase/functions/generate-multichannel/index.ts`
  - Flow auth chuẩn:
    1) Ưu tiên xác thực user từ JWT header.
    2) Nếu JWT không phải token user nhưng là internal trusted call (service role path), cho phép fallback user từ body (`userId`/`user_id`) để không gãy luồng chatbot nội bộ.
  - Đọc `organizationId`/`organization_id` linh hoạt.
  - Nếu dùng fallback, thêm kiểm tra membership org trước khi insert để tránh ghi sai workspace.
  - Giữ response lỗi rõ ràng (Unauthorized vs Missing user context).

D. Chặn “thành công giả” ở tầng Agent
- File: `supabase/functions/_shared/agents/agent-base.ts`
  - Khi gửi tool result ngược lại model, gửi đầy đủ object gồm `success`, `result`, `error` (không chỉ `result`).
  - Nếu tool tạo nội dung chính (`generate_multichannel` / `generate_script` / `generate_carousel`) fail mà không có tool thành công thay thế, trả `success: false` cho agent để supervisor dừng đúng trạng thái lỗi (không review/summarize như đã tạo xong).

3) Trình tự triển khai
- Bước 1: Sửa `useChatStreaming.ts` và `chat-topics/index.ts` để có user token thật trong execution context.
- Bước 2: Sửa `tool-executor.ts` để forward token + payload user/org nhất quán.
- Bước 3: Sửa `generate-multichannel/index.ts` để xử lý auth/fallback an toàn.
- Bước 4: Sửa `agent-base.ts` để error propagation đúng, tránh success giả.
- Bước 5: Kiểm thử end-to-end + kiểm chứng DB/log.

4) Kế hoạch kiểm thử (bắt buộc)
- Test 1 (E2E): vào chat, gửi “tạo nội dung cho hôm nay”.
- Test 2: xác nhận log không còn `missing sub claim` / `No valid user found`.
- Test 3: xác nhận có bản ghi mới trong `multi_channel_contents` với đúng `user_id`, `organization_id`, thời gian hiện tại.
- Test 4: reload `/multichannel`, nội dung mới phải xuất hiện ngay.
- Test 5: xác nhận trả lời chat không còn kiểu “đã tạo” khi tool thực tế fail.
- Test 6: thử mobile flow (vì bạn đang dùng chat mobile) và desktop flow.

5) Ghi chú phạm vi
- Không cần migration DB hoặc đổi RLS cho lỗi này (RLS hiện tại đã hợp lý cho `multi_channel_contents` và `generation_tasks`).
- Cảnh báo accessibility `DialogContent` (thiếu title/description) thấy trong console là issue riêng, không phải nguyên nhân của lỗi “không xuất hiện trong multichannel”; có thể xử lý ở task riêng sau khi fix xong luồng tạo nội dung.
