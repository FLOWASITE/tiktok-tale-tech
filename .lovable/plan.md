

## Cải thiện luồng NukeViet: Tự động chèn API Key vào file PHP

### Vấn đề hiện tại
Luồng hiện tại yêu cầu khách hàng tải file PHP → mở file → tìm dòng `$my_api_key` → sửa tay → lưu. Quá phức tạp cho người không chuyên.

### Giải pháp
Đảo ngược luồng: khách nhập API Key trước (hoặc bấm tạo ngẫu nhiên), rồi app tự chèn key vào file PHP trước khi tải xuống. Khách chỉ việc ném file lên hosting, không cần mở sửa gì.

### Thay đổi — `src/components/brand/BrandViewConnectionsTab.tsx`

**1. Sắp xếp lại thứ tự UI trong section NukeViet (line 710-846):**

```text
┌─────────────────────────────────────┐
│ 📋 Hướng dẫn (3 bước, không còn 4) │
│ 1. Nhập hoặc tạo mật khẩu bảo mật │
│ 2. Tải file → upload lên hosting   │
│ 3. Nhập endpoint bên dưới, bấm KN  │
├─────────────────────────────────────┤
│ Mật khẩu bảo mật (API Key) *       │
│ [••••••••••••] [🔄 Tạo ngẫu nhiên] │
│                                     │
│ [📥 Tải file api_flowa.php]         │
│ (disabled nếu chưa nhập API Key)   │
│                                     │
│ API Endpoint *                      │
│ [https://domain.com/api_flowa.php]  │
└─────────────────────────────────────┘
```

**2. Thêm nút "Tạo ngẫu nhiên":**
- Sinh chuỗi 16 ký tự alphanumeric ngẫu nhiên
- Tự điền vào ô API Key

**3. Cập nhật logic tải file:**
- Nút tải file disabled khi ô API Key trống
- Khi bấm tải, lấy giá trị `websiteForm.apiKey` chèn vào template PHP thay chỗ `"THAY_MAT_KHAU_CUA_BAN_VAO_DAY"`
- Bỏ dòng comment "Hãy thay đổi dòng chữ..." vì không cần nữa

**4. Cập nhật hướng dẫn từ 4 bước → 3 bước:**
- Bỏ bước 3 cũ (mở file đổi mật khẩu)
- Placeholder ô API Key: "Nhập mật khẩu hoặc bấm Tạo ngẫu nhiên"

### Chi tiết kỹ thuật

Hàm tạo key ngẫu nhiên:
```typescript
const generateRandomKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => chars[b % chars.length]).join('');
};
```

Template PHP sẽ dùng `${websiteForm.apiKey}` thay vì hardcode placeholder.

