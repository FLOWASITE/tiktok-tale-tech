

# Thông báo chuông khi tạo Content đa kênh

## Thay đổi

### File: `src/pages/MultiChannelCreate.tsx`
Thêm logic insert notification vào database tại 2 mốc:

1. **Nội dung text hoàn tất** (khi `generationState` chuyển sang `'complete'`):
   - Insert notification type `multichannel_content_done`
   - Title: "Nội dung đa kênh đã sẵn sàng!"
   - Message: `Đã tạo X kênh cho "{topic}"`
   - Data: `{ content_id: generatedContentId }`

2. **Ảnh đa kênh hoàn tất** (khi `imagePipeline.phase === 'done'`):
   - Insert notification type `multichannel_images_done`
   - Title: "Ảnh đa kênh đã hoàn tất!"
   - Message: `X/Y ảnh đã tạo thành công cho "{topic}"`
   - Data: `{ content_id: generatedContentId }`

- Import `supabase` và `useAuth`
- Dùng `useRef` để đảm bảo mỗi notification chỉ gửi 1 lần

### File: `src/components/NotificationDropdown.tsx`
- Thêm 2 type config:
  - `multichannel_content_done`: icon `Sparkles`, màu purple
  - `multichannel_images_done`: icon `Images`, màu emerald
- Navigation: click → navigate `/multichannel?content={content_id}`

Realtime subscription trong `useNotifications` sẽ tự động cập nhật badge chuông — không cần thay đổi thêm.

