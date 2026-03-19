

# Thông báo chuông khi hoàn thành các bước tạo Carousel

## Ý tưởng
Khi các mốc quan trọng trong quá trình tạo carousel hoàn tất, tự động insert notification vào bảng `notifications` trong database. Nhờ realtime subscription đã có sẵn trong `useNotifications`, icon chuông trên header sẽ tự động cập nhật số thông báo chưa đọc.

## Các mốc gửi thông báo
1. **Phase 1 hoàn tất** (prompt done) — "Nội dung carousel đã được tạo xong"
2. **Toàn bộ hoàn tất** (all done) — "Carousel đã hoàn tất! X/Y slide tạo ảnh thành công"

## Thay đổi

### File: `src/components/carousel/CarouselGenerationTracker.tsx`
- Import `supabase` client và `useAuth` để lấy `user.id`
- Thêm 2 `useEffect`:
  - Khi `promptDone` chuyển `true` → insert notification type `carousel_prompt_done`
  - Khi `allDone` chuyển `true` → insert notification type `carousel_generation_complete` kèm data `{ carousel_id, success_count, total_count }`
- Dùng `useRef` để đảm bảo mỗi notification chỉ gửi 1 lần

### File: `src/components/NotificationDropdown.tsx`
- Thêm 2 type config mới vào `notificationTypeConfig`:
  - `carousel_prompt_done`: icon `PenLine`, màu blue
  - `carousel_generation_complete`: icon `Images`, màu emerald
- Thêm navigation handler: click vào notification carousel → navigate `/carousel`

## Chi tiết kỹ thuật

```typescript
// Insert notification
await supabase.from('notifications').insert({
  user_id: user.id,
  type: 'carousel_generation_complete',
  title: 'Carousel đã hoàn tất!',
  message: `${successCount}/${totalCount} slide đã tạo ảnh thành công`,
  data: { carousel_id: carousel.id }
});
```

Realtime subscription trong `useNotifications` sẽ tự động nhận notification mới và cập nhật badge trên icon chuông — không cần thay đổi gì thêm.

