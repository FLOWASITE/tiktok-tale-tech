

## Auto-fill API Endpoint từ URL Website

### Vấn đề
User đã nhập URL website ở trường "URL Website" (line 672-678), nhưng khi chọn NukeViet vẫn phải nhập lại đường dẫn ở trường "API Endpoint". Thừa thãi và dễ sai.

### Giải pháp
Khi user nhập URL website (ví dụ `https://abc.com`), tự động điền `apiEndpoint` = `https://abc.com/api_flowa.php`. Đồng thời đổi label cho dễ hiểu.

### Thay đổi — `src/components/brand/BrandViewConnectionsTab.tsx`

**1. Auto-fill apiEndpoint khi websiteUrl thay đổi (line 677):**
- Trong `onChange` của ô "URL Website", nếu `integrationType === 'nukeviet'`, tự ghép thêm `/api_flowa.php` vào cuối URL và set vào `apiEndpoint`
- Xử lý trailing slash: `https://abc.com/` → `https://abc.com/api_flowa.php`

**2. Cũng auto-fill khi chuyển sang NukeViet (line 687):**
- Trong `onChange` của dropdown "Loại kết nối", nếu chọn `nukeviet` và `websiteUrl` đã có giá trị, tự động điền `apiEndpoint`

**3. Đổi label và thêm mô tả (line 860-867):**
- Label: **"Đường dẫn file trên website"** thay vì "API Endpoint"
- Thêm dòng mô tả: *"Tự động tạo từ URL website. Chỉ sửa nếu bạn đặt file ở vị trí khác."*
- Giữ ô input cho phép user sửa nếu cần

### Kết quả
```text
URL Website *
[https://abc.com]          ← user nhập

Đường dẫn file trên website *
Tự động tạo từ URL website. Chỉ sửa nếu bạn đặt file ở vị trí khác.
[https://abc.com/api_flowa.php]   ← tự động điền
```

