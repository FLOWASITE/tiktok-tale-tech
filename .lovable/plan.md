## Vấn đề
Trong màn hình slide/mockup viewer, kênh Medium ở sidebar và header đang dùng icon `BookOpen`, nên nhìn không đúng logo Medium thật.

## Kế hoạch sửa
1. Cập nhật `src/components/MultiChannelViewer.tsx`
   - Bỏ import `BookOpen` khỏi `lucide-react` nếu không còn dùng ở file này.
   - Thêm import `MediumIcon` từ `@/components/icons/SocialIcons` cùng nhóm `ShopifyIcon`, `WixIcon`.
   - Trong `channelConfig.medium`, đổi:
     - `icon: <BookOpen ... />`
     - thành `icon: <MediumIcon ... />`
   - Giữ `color: 'text-foreground'` và `bgColor: 'bg-muted'` để logo Medium đen/trắng theo theme.

2. Rà nhanh các nơi còn dùng icon Medium sai trong viewer
   - Search lại `medium:` và `BookOpen` ở các component viewer/preview.
   - Nếu có mapping Medium nào khác trong cùng UI đang dùng `BookOpen`, đổi sang `MediumIcon` để đồng bộ.

## Kết quả mong đợi
- Sidebar slide social (vùng khoanh đỏ) hiển thị đúng logo Medium thay vì icon quyển sách.
- Header của kênh Medium trong viewer cũng dùng cùng logo Medium thật.
- Không ảnh hưởng nội dung/mockup text hay backend.