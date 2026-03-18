

# Thêm chú thích minh bạch về Google OAuth vào Footer

## Thay đổi

**File:** `src/landing/components/FooterSection.tsx`

Thêm một đoạn text nhỏ vào khu vực Bottom Bar (giữa border-top và copyright), ngay trên dòng copyright, với nội dung:

> "Flowa sử dụng xác thực Google (Google OAuth) để giúp bạn đăng nhập nhanh chóng và an toàn. Chúng tôi chỉ yêu cầu quyền truy cập thông tin cơ bản (email, tên, ảnh đại diện) nhằm mục đích khởi tạo và quản lý tài khoản của bạn trên hệ thống."

- Đặt trong một `<p>` riêng với style `text-xs text-muted-foreground` để hiển thị nhỏ gọn, không chiếm quá nhiều không gian
- Đặt ngay trên dòng copyright, bên trong Bottom Bar section
- Thêm icon Shield (từ lucide-react) phía trước để tăng tính tin cậy

