

# Hoàn thiện Mockup Zalo OA

## Hiện trạng
Mockup hiện tại đã có cấu trúc cơ bản nhưng chưa sát giao diện thật của Zalo OA. Cần nâng cấp để giống giao diện Zalo thực tế hơn (tương tự mức độ chi tiết của GoogleMapsMockup).

## Cải tiến

### 1. Header chính xác hơn
- Thêm nút **Back** (←) bên trái header
- Icon **Quan tâm** nổi bật hơn (nút xanh viền trắng, giống Zalo thật)
- Thêm nút **Chat** (nhắn tin cho OA) trong header

### 2. Tách Title & Body từ content
- Tự động trích dòng đầu tiên (heading hoặc dòng text đầu) làm **tiêu đề bài viết** hiển thị đậm, lớn
- Phần còn lại render markdown bên dưới
- Thêm thời gian đọc ước tính ("3 phút đọc")

### 3. Bài viết dạng Article (giống Zalo thật)
- Cover image full-width
- Tiêu đề bài viết font lớn, đậm bên dưới ảnh
- Tên OA + thời gian + badge xác thực ngay dưới title
- Body content với typography chuẩn article
- Thêm tag/category badge phía trên title ("Tin tức", "Khuyến mãi")

### 4. Engagement section cải tiến
- Reaction icons đúng Zalo: ❤️ 😆 😮 😢 😡 (thay vì chỉ ThumbsUp/Heart)
- Hiển thị "Bạn và 846 người khác" khi liked
- Số lượt xem bài viết (👁 1.2K lượt xem)

### 5. Bottom section
- Thêm phần **"Bài viết liên quan"** với 2 thumbnail nhỏ (giả lập)
- CTA "Nhắn tin cho OA" nổi bật cuối bài
- Footer: "Xem trước Zalo Official Account"

### 6. Bottom nav bar chuẩn Zalo
- Đổi icons + labels đúng: Tin nhắn, Danh bạ, Khám phá, Nhật ký, Cá nhân (5 tab thay vì 4)

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/preview/ZaloOAMockup.tsx` | Viết lại toàn bộ với cấu trúc article mới, engagement cải tiến, bottom nav 5 tab |

