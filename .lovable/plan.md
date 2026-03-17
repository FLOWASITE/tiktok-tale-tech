

# Thêm Brand indicator trên header trang Tạo nội dung đa kênh

## Thay đổi

**File**: `src/pages/MultiChannelCreate.tsx` — dòng 232-239 (phần Center: Title)

Thêm hiển thị tên brand hiện tại bên cạnh tiêu đề, sử dụng `currentBrand` đã có sẵn trong component:

```text
[Icon] Tạo nội dung đa kênh  ·  [●] Công ty Kế toán TAF
```

- Hiển thị `currentBrand.brand_name` với primary_color dot indicator
- Nếu chưa chọn brand → hiển thị text mờ "Chưa chọn brand"
- Dùng separator `·` hoặc `|` để phân cách với title
- Responsive: ẩn trên mobile nhỏ (`hidden sm:flex`)

Chỉ sửa 1 file, ~10 dòng thêm vào phần center header.

