
Mục tiêu: làm cho luồng tạo nội dung đa kênh và tạo ảnh nền chịu lỗi tốt hơn khi mạng/Edge Function bị ngắt giữa chừng, để UI không báo fail giả khi backend vẫn đang xử lý hoặc đã lưu kết quả.

1. Kết luận nguyên nhân hiện tại
- Có 3 điểm hỏng chính đang chồng nhau:
  1) `src/hooks/useStreamingGeneration.ts`
     - tạo `generation_tasks` trước khi gọi `generate-multichannel`
     - nhưng nếu stream bị `Failed to fetch`, `network error`, watchdog abort, hoặc proxy cắt kết nối, UI fail ngay
     - hook này chưa tận dụng `generation_tasks.result_id` để tự khôi phục kết quả đã tạo ở nền
  2) `supabase/functions/generate-brand-image/index.ts`
     - đã cố save `channel_image_history` kiểu fire-and-forget
     - nhưng chỉ comment “waitUntil pattern”, chưa dùng `EdgeRuntime.waitUntil(...)` thật
     - nếu response kết thúc sớm hoặc runtime bị cắt, ảnh có thể đã generate xong nhưng chưa persist đủ để frontend recover
  3) `src/hooks/ai/useHookAI.ts`
     - `quickSuggestions` và `multiChannel` đang gọi `generate-hooks` trực tiếp
     - khi mạng chập chờn sẽ log lỗi dày đặc, làm trải nghiệm “AI đang hay bị lỗi” dù đây không phải luồng chính tạo nội dung

2. Hướng sửa tổng thể
- Không coi lỗi transport là lỗi business ngay lập tức.
- Với tạo nội dung:
  - ưu tiên stream để UX nhanh
  - nếu stream hỏng, fallback sang “recover từ background task/result đã lưu”
- Với tạo ảnh:
  - đảm bảo backend persist chắc chắn sau khi có ảnh
  - frontend chỉ fail thật khi polling/recovery cũng không thấy kết quả
- Với hook/phụ trợ:
  - degrade gracefully, không làm hỏng luồng chính

3. Sửa recovery cho tạo nội dung đa kênh
- File: `src/hooks/useStreamingGeneration.ts`
- Thêm lớp recovery sau các case:
  - `AbortError`
  - `TypeError: Failed to fetch`
  - `network error`
  - stream đóng trước khi nhận `result`
- Nếu đã có `taskId`, hook sẽ:
  - poll `generation_tasks`
  - nếu `status = completed` và có `result_id` -> fetch `multi_channel_contents`
  - trả kết quả về như một success bình thường
- Nếu task vẫn `pending/generating`:
  - giữ trạng thái “đang xử lý nền”
  - dùng polling ngắn để chờ thay vì báo fail ngay
- Nếu task `failed`:
  - mới báo lỗi thật

4. Thêm helper recovery riêng cho multichannel
- Tạo helper mới, ví dụ:
  - `src/lib/recoverGeneratedMultichannel.ts`
- Chức năng:
  - detect recoverable transport errors
  - poll `generation_tasks`
  - fetch `multi_channel_contents` theo `result_id`
  - fallback cuối cùng: tìm content mới nhất cùng user/topic trong cửa sổ thời gian ngắn để bắt case task update chậm
- Mục tiêu:
  - dùng chung cho `useStreamingGeneration` và các chỗ gọi `generate-multichannel` non-stream nếu cần

5. Dùng background task đúng nghĩa trong UI tạo nội dung
- File: `src/pages/MultiChannelCreate.tsx`
- Khi `streamGenerate(...)` không trả result ngay nhưng recovery tìm thấy content:
  - vẫn set `generatedContentId`
  - vẫn chuyển `generationState` sang `complete`
  - vẫn cho Step 5 hoạt động bình thường
- Khi task vẫn đang chạy:
  - chuyển UI sang trạng thái “đang hoàn tất ở nền”
  - tránh reset về error quá sớm

6. Làm hook gợi ý không phá UX chính
- File: `src/hooks/ai/useHookAI.ts`
- Với `quickSuggestions` và `multiChannel`:
  - thêm timeout/retry nhẹ hoặc silent degradation
  - nếu lỗi fetch thì chỉ clear suggestion + log gọn
  - không bắn chuỗi lỗi gây cảm giác toàn bộ hệ thống hỏng
- Mục tiêu:
  - hook generator là phụ trợ, không làm người dùng tưởng “ko tạo được nội dung”

7. Sửa persistence cho ảnh nền ở backend
- File: `supabase/functions/generate-brand-image/index.ts`
- Đổi phần save history/json sync từ “fire-and-forget promise” sang:
  - `EdgeRuntime.waitUntil(...)` thật
  - hoặc await persistence tối thiểu trước response cho các dữ liệu recovery-critical
- Dữ liệu cần đảm bảo có:
  - `channel_image_history.is_selected = true`
  - `multi_channel_contents.channel_images[channel]`
- Như vậy frontend recovery hiện có (`recoverGeneratedBrandImage.ts`) mới đáng tin cậy

8. Tăng recovery cho ảnh nền ở frontend
- File: `src/hooks/useAutoImageGeneration.ts`
- Chuẩn hóa các case recoverable:
  - timeout
  - 504
  - aborted / clone failed
  - network/fetch interruption
- Sau lỗi recoverable:
  - poll `channel_image_history` + `multi_channel_contents.channel_images`
  - nếu thấy ảnh thì tiếp tục flow như success
  - timeline/debug phải ghi rõ “request failed but image recovered from persisted result”

9. Giảm fail giả trong manual image flow
- File: `src/hooks/useSocialImageGeneration.ts`
- Đồng bộ logic recovery với auto flow:
  - nếu request lỗi nhưng ảnh đã persist -> trả imageUrl luôn
  - toast thành công kiểu “ảnh đã hoàn tất ở nền”
- Mục tiêu:
  - manual và auto không lệch hành vi

10. Làm debug trả lời đúng “hỏng ở đâu”
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung trạng thái recovery:
  - request interrupted
  - recovered from history
  - recovered from content json
  - persistence missing
- Với content generation, thêm hiển thị trạng thái background task ở UI đang dùng Step 4/5 hoặc panel liên quan:
  - streaming live
  - stream interrupted
  - resumed from background task
  - task failed thật

11. File cần sửa
- `src/hooks/useStreamingGeneration.ts`
- `src/pages/MultiChannelCreate.tsx`
- `src/hooks/ai/useHookAI.ts`
- `src/lib/recoverGeneratedMultichannel.ts` (mới)
- `supabase/functions/generate-brand-image/index.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/hooks/useSocialImageGeneration.ts`
- `src/components/ui/RenderDebugTimeline.tsx`

12. Tiêu chí nghiệm thu
- Tạo nội dung:
  - nếu stream bị ngắt nhưng backend đã lưu `multi_channel_contents`, UI vẫn tự khôi phục và hoàn tất
  - không còn fail giả chỉ vì `Failed to fetch` hoặc `network error`
- Tạo ảnh nền:
  - nếu request bị cắt sau khi ảnh đã generate xong, ảnh vẫn xuất hiện lại nhờ recovery
  - không còn case “backend làm xong nhưng UI báo fail”
- Hook gợi ý:
  - lỗi gợi ý không làm luồng chính bị kẹt hoặc spam lỗi
- Debug phải phân biệt rõ:
```text
stream/network interrupted
hay backend task failed thật
hay image generated nhưng persistence thiếu
hay provider tạo ảnh fail thật
```

13. Chi tiết kỹ thuật
- Mẫu xử lý nên dùng:
  - optimistic streaming + durable task/result recovery
  - transport error != generation failed
- Recovery content:
  - nguồn chính: `generation_tasks.result_id -> multi_channel_contents`
- Recovery image:
  - nguồn chính: `channel_image_history`
  - nguồn phụ: `multi_channel_contents.channel_images`
- Backend ảnh:
  - dùng `EdgeRuntime.waitUntil` đúng chỗ cho persistence hậu response
- Frontend:
  - chỉ show error cuối cùng sau khi polling recovery thất bại
