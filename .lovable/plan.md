

## Tại sao thấy nhiều popup "Đa kênh"

Đây không phải nhiều multichannel job đang chạy. Đó là tác dụng phụ của vấn đề carousel chưa fix:

1. Mỗi lần bấm tạo carousel, code chèn 1 row `carousel_image` vào `generation_tasks` với status `generating`.
2. Pipeline ảnh fail (timeout / 402 / nested HTTP chết) trước khi update status sang `completed`/`failed`.
3. Row vẫn nằm lại với status `generating` mãi mãi → mỗi lần thử là +1 zombie task.
4. DB hiện có **7 task carousel_image bị kẹt** ở `generating` (xác nhận qua query).
5. `ActiveTasksIndicator` hiển thị mọi task `pending`/`generating` của user → ra 5+ popup chồng nhau.
6. Bug nhãn phụ: tại `ActiveTasksIndicator.tsx` line 94, label hardcode `task.task_type === 'core_content' ? 'Core Content' : 'Đa kênh'` — task `carousel_image` cũng bị gọi nhầm là "Đa kênh", gây hiểu lầm rằng đang chạy 5 job multichannel.

## Kế hoạch sửa (2 phần)

### Phần A — Dọn ngay zombie tasks (1-shot)
- Migration cập nhật mọi `generation_tasks` đang `pending`/`generating` quá lâu (ví dụ `updated_at < now() - interval '10 minutes'`) → set `status='failed'`, `error_message='Auto-recovered: stale background task'`.
- Áp dụng riêng cho user hiện tại trước, sau đó bật cho cả hệ thống.
- Hiệu ứng tức thì: 5 popup biến mất khỏi màn hình.

### Phần B — Chặn không cho zombie tái sinh
1. **Auto-recover ở frontend khi load**
   - Trong `useBackgroundGeneration.checkActiveTasks`, sau khi fetch task, với task nào `updated_at` cũ hơn N phút thì tự dismiss/mark failed luôn.
   - Tránh chờ cron.

2. **Cron tự dọn**
   - Thêm một pg_cron mỗi vài phút quét `generation_tasks` cũ hơn ngưỡng và set `failed` + `error_message` rõ ràng.
   - Đồng bộ với pattern `recover_stuck` đã có cho agent pipeline.

3. **Sửa nhãn ở `ActiveTasksIndicator`**
   - Map đúng theo `task_type`:
     - `core_content` → "Core Content"
     - `multichannel` → "Đa kênh"
     - `carousel_image` → "Tạo ảnh Carousel"
   - Icon cũng tách: `carousel_image` dùng icon Images thay vì Layers để không nhầm với multichannel.

4. **Giới hạn số popup hiển thị**
   - Trong `ActiveTasksIndicator`, nếu `tasks.length > 3`, gộp lại thành 1 card "Đang chạy N tác vụ" với nút mở rộng.
   - Tránh phủ kín màn hình mobile.

5. **Liên kết với fix pipeline carousel đã chốt trước**
   - Đảm bảo `generate-carousel-images-batch` luôn `completeTask` hoặc `failTask` trong khối `finally`, kể cả khi nested call fail/timeout. Đây là nguồn gốc tạo zombie.

## File dự kiến đụng tới
- migration mới: dọn `generation_tasks` cũ + tạo cron auto-recover
- `src/hooks/useBackgroundGeneration.ts`: tự bỏ qua / mark failed task quá hạn khi load
- `src/components/multichannel/ActiveTasksIndicator.tsx`: sửa label/icon theo task_type, gộp khi quá nhiều
- `supabase/functions/generate-carousel-images-batch/index.ts`: bọc `finally` để luôn close task

## Kết quả mong đợi
- Màn hình không còn 5 popup "Đa kênh" treo vĩnh viễn
- Task carousel hiển thị đúng nhãn "Tạo ảnh Carousel", không bị nhầm thành multichannel
- Task fail/timeout sẽ tự đóng trong vài phút thay vì kẹt mãi
- Mobile không bị popup phủ kín UI

