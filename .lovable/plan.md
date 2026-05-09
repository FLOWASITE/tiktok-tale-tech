## Nguyên nhân

Trong `src/components/social/DirectPublishButton.tsx`:

```tsx
const isPinterestMissingMedia = platform === 'pinterest' && !(mediaUrls && mediaUrls.length > 0);
...
<Button
  disabled={disabled || isPublishing || !content || isZaloMissingCover || isPinterestMissingMedia}
  title={... 'Cần ít nhất 1 ảnh để đăng Pinterest Pin' ...}
/>
```

Tab Pinterest trong ảnh chụp **chưa có ảnh nào được generate** (canvas hồng trống) → `mediaUrls` undefined → nút bị `disabled` hoàn toàn. Trên mobile (`title` HTML attribute không show on tap) → người dùng bấm thấy "không có gì xảy ra", không hiểu vì sao.

Pinterest API **bắt buộc 1 image** (Pin = ảnh + title), nên không thể publish text-only — yêu cầu media là đúng. Vấn đề là **UX feedback** chưa đủ rõ.

## Thay đổi (chỉ frontend, 1 file)

### `src/components/social/DirectPublishButton.tsx`

1. **Bỏ `isPinterestMissingMedia` khỏi prop `disabled`** — giữ nút clickable.
2. **Trong `handleClick`**, thêm guard sớm cho Pinterest:
   ```tsx
   if (platform === 'pinterest' && (!mediaUrls || mediaUrls.length === 0)) {
     sonnerToast.error('Pinterest Pin cần ít nhất 1 ảnh', {
       description: 'Hãy tạo hoặc tải lên ảnh ở tab Pinterest trước khi đăng. Pin không thể là text-only.',
     });
     return;
   }
   ```
3. **Giữ visual hint** thiếu ảnh: thay vì `disabled`, dùng `variant="outline"` + opacity nhẹ + icon `AlertCircle` nhỏ khi `isPinterestMissingMedia` để user vẫn nhận biết trạng thái — nhưng vẫn click được để thấy toast giải thích.
4. **Update `title` tooltip** giữ nguyên message giải thích (cho desktop hover).

## Không thay đổi

- Không sửa edge function `publish-pinterest`, không sửa `useDirectPublish`, không sửa `MultiChannelViewer` (mediaUrls đã pass đúng).
- Không bypass yêu cầu ảnh của Pinterest API — chỉ cải thiện feedback.
- Giữ logic Zalo OA `isZaloMissingCover` như cũ (Zalo có flow riêng).

## Kiểm tra sau khi build

1. Tab Pinterest **không có ảnh** → bấm "Đăng ngay" → toast lỗi "Cần ít nhất 1 ảnh" hiện rõ.
2. Sau khi generate ảnh → bấm "Đăng ngay" → mở dialog confirm Pin Title + Link bình thường.
3. Các kênh khác (FB/IG/TikTok/Bluesky/Blogger…) hành vi không đổi.
