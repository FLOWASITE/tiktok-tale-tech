

## Phân biệt UI theo từng Mode kiểm soát AI

### Hiện trạng
Hiện tại, khi chuyển mode chỉ có 2 thay đổi UI:
- **Full mode**: Hiện thêm "Phong cách ảnh" + "Lý do gợi ý V3"
- **Brand_only / Raw**: Ẩn 2 section trên + hiện hint text nhỏ

Các section còn lại (Tỉ lệ khung hình, Logo, Text overlay, Text position, Negative prompt, Ngữ cảnh chiến lược) **luôn hiện giống nhau** cho cả 3 mode → user không cảm nhận được sự khác biệt.

### Giải pháp: Ẩn/hiện options theo đúng chức năng từng mode

**File: `src/components/multichannel/ImageAdvancedOptions.tsx`**

| Section | Full (AI lo) | Brand Only (Giữ brand) | Raw (Toàn quyền) |
|---------|:---:|:---:|:---:|
| Phong cách ảnh | ✅ | ❌ | ❌ |
| V3 Suggestions | ✅ | ❌ | ❌ |
| Tỉ lệ khung hình | ✅ | ✅ | ✅ |
| Logo overlay | ✅ | ✅ | ❌ |
| Text lên ảnh | ✅ | ✅ | ❌ |
| Text position/Typography | ✅ | ✅ | ❌ |
| Negative prompt | ✅ | ✅ | ✅ |
| Ngữ cảnh chiến lược | ✅ | ❌ | ❌ |

Logic:
- **Raw**: Chỉ giữ Tỉ lệ khung hình + Negative prompt (đúng với "bạn kiểm soát 100%")
- **Brand Only**: Giữ Tỉ lệ + Logo + Text + Negative prompt (brand elements), ẩn Style/V3/Strategic context (đó là AI optimization)
- **Full**: Hiện tất cả

Thêm một summary text ngắn dưới mode selector để user thấy rõ mode đang bật những gì:
- Full: "AI tối ưu phong cách, bố cục, brand + chiến lược marketing"
- Brand Only: "Giữ logo & màu brand. Bạn tự quyết nội dung & bố cục"
- Raw: "Chỉ tỉ lệ khung hình + negative prompt. Mọi thứ khác do bạn"

### Phạm vi
- 1 file: `src/components/multichannel/ImageAdvancedOptions.tsx`
- Wrap các section hiện có trong điều kiện `promptMode` check
- Cập nhật hint text cho mỗi mode

