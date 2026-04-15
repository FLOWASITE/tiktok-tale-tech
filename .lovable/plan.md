

## Đồng bộ trạng thái Carousel sau khi đăng bài Social

### Vấn đề
1. **Edge functions đã ghi log** vào `content_publishing_logs` khi publish thành công (publish-facebook, publish-twitter, etc.), nhưng CarouselViewer query log với `action = 'published'` — cần xác nhận action value edge functions ghi là gì
2. **`channel-publisher` chỉ update status cho `multi_channel_contents`**, không update `carousels` table → sau khi publish thành công qua social, carousel status vẫn giữ nguyên
3. **`handlePublishSuccess` trong CarouselViewer** đã có logic update carousel status, nhưng phụ thuộc vào `publishedChannels` từ query `content_publishing_logs` — nếu log chưa được ghi hoặc action value không khớp, status sẽ không cập nhật đúng

### Kế hoạch

**1. Sửa `channel-publisher/index.ts` — thêm logic update carousel status**
- Sau khi publish thành công, kiểm tra nếu `contentId` tồn tại trong bảng `carousels` (thay vì chỉ `multi_channel_contents`)
- Nếu là carousel, update `carousels.status` tương tự logic `multi_channel_contents`

**2. Sửa CarouselViewer — đồng bộ query `content_publishing_logs`**
- Bỏ filter `action = 'published'` cứng, thay bằng check action phù hợp (edge functions ghi `action` là `published` hay giá trị khác)
- Đảm bảo `handlePublishSuccess` cũng ghi log vào `content_publishing_logs` nếu edge function chưa ghi

**3. Sửa `DirectPublishButton` — ghi log cho Instagram publish**
- Hiện tại `DirectPublishButton` không hỗ trợ `publishToInstagram` (switch case thiếu `instagram`)
- Thêm case `instagram` vào switch để carousel có thể publish lên Instagram

### Files thay đổi
- `supabase/functions/channel-publisher/index.ts` — thêm carousel status update
- `src/components/CarouselViewer.tsx` — sửa query filter + fallback log
- `src/components/social/DirectPublishButton.tsx` — thêm Instagram publish case

### Technical detail
```text
channel-publisher flow:
  1. Route action → publish-{platform}
  2. On success → update multi_channel_contents status ✅
  3. NEW: Also check carousels table → update status ✅
  
DirectPublishButton flow:
  1. User clicks publish → handlePublish()
  2. Call publishTo{Platform}() → channel-publisher edge fn
  3. Edge fn logs to content_publishing_logs ✅
  4. onPublishSuccess() → CarouselViewer updates status ✅
  5. NEW: Add instagram case in switch
```

