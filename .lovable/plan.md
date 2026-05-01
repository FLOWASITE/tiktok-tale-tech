Mình xin lỗi vì lần trước đổi sang wordmark chưa đúng ý. Lần này sẽ dùng đúng logo Zalo OA theo file bạn vừa gửi.

Kế hoạch thực hiện:

1. Đưa file logo Zalo vào project
- Copy `Logo-Zalo-Arc.webp` từ upload vào thư mục asset của app.
- Đặt tên rõ ràng, ví dụ `src/assets/social/zalo-oa-logo.webp`.

2. Thay cách render logo Zalo OA trên Landing Page
- Trong `SocialChannelsSection`, riêng card `Zalo OA` sẽ dùng ảnh logo `.webp` thay vì `ZaloIcon` SVG wordmark hiện tại.
- Hiển thị trong khung vuông bo góc, giữ đúng màu/logo như file gốc.
- Dùng `object-contain` để logo không bị méo, không bị crop.

3. Giữ an toàn cho các nơi khác đang dùng `ZaloIcon`
- Không xoá vội `ZaloIcon` trong `SocialIcons.tsx` để tránh ảnh hưởng các màn hình khác.
- Landing Page là nơi đang bị phản ánh trực tiếp, nên cập nhật ở đó trước.

4. Kiểm tra responsive
- Kiểm tra layout card logo ở viewport hiện tại khoảng `707x662`.
- Đảm bảo logo Zalo OA nhìn rõ, không bị nhỏ quá, không lệch hàng với các logo social khác.

Technical details:

- Sửa `src/landing/components/SocialChannelsSection.tsx` để `Channel` hỗ trợ thêm `imageSrc` hoặc một render override cho Zalo OA.
- Import asset bằng ES module từ `src/assets/...` thay vì dùng URL hardcode.
- Giữ nguyên copy marketing và grid hiện tại; chỉ đổi phần logo Zalo OA.