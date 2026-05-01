## Vấn đề
Trong sidebar danh sách kênh của view Đa kênh (`MultiChannelViewer`), kênh Bluesky vẫn hiển thị icon Globe (quả địa cầu) thay vì biểu tượng butterfly đúng thương hiệu.

## Nguyên nhân
File `src/components/MultiChannelViewer.tsx` định nghĩa `channelConfig` riêng (dòng 113-249). Entry `bluesky` (dòng 241-248) đang dùng `<Globe className="..." />` thay vì `<BlueskyIcon />`. Đây là file bị bỏ sót trong lần fix trước (chỉ fix các file trong `src/components/multichannel/`).

## Thay đổi
**File:** `src/components/MultiChannelViewer.tsx`

1. Thêm `BlueskyIcon` vào import từ `@/components/icons/SocialIcons` (hiện đã import `ZaloIcon, XIcon, WordPressIcon, BloggerIcon, PinterestIcon` từ đó).
2. Trong `channelConfig.bluesky`, đổi:
   ```tsx
   icon: <Globe className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
   ```
   thành:
   ```tsx
   icon: <BlueskyIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
   ```

## Kết quả
Icon Bluesky trong sidebar (cả khi active và không active) sẽ hiển thị butterfly logo đúng thương hiệu, đồng nhất với các view khác đã fix trước đó.
