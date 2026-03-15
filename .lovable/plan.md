

## Vấn đề logic UX giữa 3 mode

### Mâu thuẫn hiện tại

| Mode | Ý nghĩa | UI hiện tại | Vấn đề |
|------|----------|-------------|--------|
| Để AI lo | AI quyết định hết | Hiện NHIỀU option nhất | Nếu AI lo, sao phải chọn style thủ công? |
| Giữ Brand | Giữ brand, user quyết phần còn lại | Hiện vừa phải | Không có gì "brand" nổi bật hơn Full |
| Toàn quyền | User kiểm soát 100% | Hiện ÍT option nhất | "Toàn quyền" mà ít lựa chọn nhất? |

### Giải pháp: Đảo lại logic visibility cho hợp lý

**File: `src/components/multichannel/ImageAdvancedOptions.tsx`**

| Section | Để AI lo (full) | Giữ Brand (brand_only) | Toàn quyền (raw) |
|---------|:---:|:---:|:---:|
| Phong cách ảnh | ❌ (AI tự chọn) | ❌ | ✅ (user chọn) |
| V3 Suggestions | ✅ (hiện để user biết AI chọn gì) | ❌ | ❌ |
| Tỉ lệ khung hình | ✅ | ✅ | ✅ |
| Logo overlay | ✅ (auto-on, ít tùy chỉnh) | ✅ (đầy đủ tùy chỉnh) | ✅ (đầy đủ tùy chỉnh) |
| Text lên ảnh | ✅ (auto suggest) | ✅ | ✅ |
| Text position/Typography | ❌ (AI tự chọn) | ✅ | ✅ |
| Negative prompt | ✅ | ✅ | ✅ |
| Ngữ cảnh chiến lược | ✅ (auto-applied, read-only) | ❌ | ❌ |

### Logic mới

**"Để AI lo" (full):**
- Ẩn style picker (AI tự chọn → hiện V3 suggestion dạng read-only "AI đã chọn: photorealistic 87%")
- Ẩn text position/typography (AI tự bố trí)
- Hiện strategic context dạng read-only badge
- Hint: "AI tự chọn phong cách, bố cục, vị trí text. Bạn chỉ cần duyệt."

**"Giữ Brand" (brand_only):**
- Hiện Logo + Text đầy đủ tùy chỉnh (đây là phần brand user muốn kiểm soát)
- Hiện text position/typography (user tự bố trí)
- Ẩn style picker (giữ nguyên brand visual identity)
- Ẩn V3 + strategic context
- Hint: "Giữ logo & màu brand. Bạn tự chọn bố cục text & vị trí."

**"Toàn quyền" (raw):**
- Hiện TẤT CẢ tùy chọn thủ công: Style picker, Logo, Text, Position, Typography, Negative prompt
- Ẩn V3 suggestions + strategic context (không dùng AI optimization)
- Hint: "Bạn kiểm soát mọi thứ: phong cách, logo, text, bố cục."

### Thay đổi cụ thể trong code

1. **Style picker**: Đổi điều kiện từ `promptMode === 'full'` → `promptMode === 'raw'`
2. **V3 Suggestions**: Giữ `promptMode === 'full'` nhưng đổi UI thành dạng compact read-only "AI đã chọn: ..."
3. **Logo section**: Bỏ `promptMode !== 'raw'` → hiện cho cả 3 mode
4. **Text overlay**: Bỏ `promptMode !== 'raw'` → hiện cho cả 3 mode
5. **Text position/typography**: Đổi từ `promptMode !== 'raw'` → `promptMode !== 'full'` (ẩn khi AI lo)
6. **Strategic context**: Giữ `promptMode === 'full'`
7. **Hint text**: Cập nhật nội dung 3 hint cho phù hợp logic mới

### Phạm vi
- 1 file: `src/components/multichannel/ImageAdvancedOptions.tsx`
- Chỉ thay đổi điều kiện render, không thay đổi component logic

