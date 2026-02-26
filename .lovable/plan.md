
Mục tiêu: xử lý triệt để lỗi “Core Content đứng ở 10%” và trường hợp tạo thất bại nhưng giao diện không báo lỗi rõ ràng.

1) Kết luận từ điều tra
- Luồng mạng của `generate-core-content` đang trả:
  - `progress=10` (generating)
  - nhiều `keepalive`
  - rồi `progress=95` + `error: Generated content too short`
- Log backend cho thấy model `qwen/qwen3.5-397b-a17b` (qua OpenRouter) có lúc trả rỗng (`content length: 0`), nên không có chunk text trong lúc chờ.
- Ở frontend, `useStreamingCoreContent` đang vô tình nuốt `event.type === 'error'` do `throw` nằm trong `try/catch` parse JSON, làm người dùng thấy “đứng im” mà không có thông báo lỗi đúng.

2) Thay đổi cần làm (không cần thay DB schema)
- File: `src/hooks/useStreamingCoreContent.ts`
  - Tách parse JSON và xử lý event:
    - `JSON.parse` lỗi mới `continue`
    - `event.type === 'error'` phải thoát ra outer catch (không bị nuốt)
  - Khi stream kết thúc mà không có `result`, trả lỗi rõ ràng (vd: “Không nhận được nội dung từ AI, vui lòng thử lại”).
  - Giữ `onError`/toast hoạt động đúng để user biết lý do và retry.

- File: `supabase/functions/generate-core-content/index.ts`
  - Gia cố `generateSinglePass`:
    - Thêm progress “mềm” theo thời gian (10% -> ~85%) kể cả khi chưa có token content, để không đứng ở 10%.
    - Vẫn ưu tiên progress thật từ chunk nếu có.
  - Gia cố fallback tạo nội dung:
    - Nếu streaming trả rỗng, thử non-stream cùng model.
    - Nếu vẫn rỗng/quá ngắn, tự động fallback sang model ổn định (`google/gemini-2.5-flash`) và phát progress step `fallback`.
    - Nếu tất cả thất bại, ném lỗi rõ ràng để frontend hiển thị.
  - Đảm bảo mọi nhánh lỗi đều gửi SSE `error` có message cụ thể.

- File: `supabase/functions/_shared/circuit-breaker.ts` (khuyến nghị)
  - Bổ sung mapping fallback cho `qwen/qwen3.5-397b-a17b` -> `google/gemini-2.5-flash` để tăng tự phục hồi khi model này lỗi lặp.

3) Kết quả kỳ vọng sau sửa
- Thanh tiến trình không còn đứng lâu ở 10% khi AI chưa stream content.
- Khi model trả rỗng, hệ thống tự thử fallback thay vì fail im lặng.
- Nếu vẫn fail, user nhận lỗi rõ ràng + có thể retry ngay.
- Tỷ lệ tạo Core Content thành công ổn định hơn ngay cả khi provider/model dao động.

4) Kiểm thử chấp nhận
- Test từ UI `/multichannel/new`:
  - Bấm tạo Core Content, xác nhận progress tăng dần (không kẹt 10%).
  - Trường hợp lỗi: có toast lỗi rõ ràng, không treo.
  - Trường hợp fallback: vẫn tạo được Core Content và lưu bản ghi bình thường.
- Đối chiếu network SSE:
  - Có progress tăng theo thời gian + (nếu cần) step fallback.
  - Có `result` hoặc `error` rõ ràng, không trạng thái lửng.
- Đối chiếu backend logs:
  - Ghi nhận nhánh fallback khi model chính trả rỗng.
  - Không còn pattern fail im lặng như trước.

5) Ghi chú phạm vi
- Không thay đổi cấu trúc dữ liệu hoặc quyền truy cập database.
- Chỉ chỉnh logic streaming/progress/recovery để xử lý đúng bản chất lỗi hiện tại.
