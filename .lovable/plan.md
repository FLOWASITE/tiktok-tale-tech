

## Thêm tích hợp NukeViet vào hệ thống kết nối Website

### Tổng quan
Thêm "NukeViet" như một loại kết nối website riêng biệt (bên cạnh WordPress, Blogger, Wix...), với giao diện thân thiện kèm hướng dẫn cài đặt file PHP cho người dùng không chuyên.

### Các thay đổi

**1. Frontend — `src/components/brand/BrandViewConnectionsTab.tsx`**
- Thêm `'nukeviet'` vào union type của `integrationType`
- Thêm `<option value="nukeviet">NukeViet CMS</option>` vào dropdown (line 685-692)
- Thêm section form riêng khi chọn NukeViet:
  - Alert hướng dẫn 4 bước (tải file → upload hosting → đổi mật khẩu → nhập vào app)
  - Link tải file `api_flowa.php` (từ Storage hoặc static URL)
  - Input "API Endpoint" (placeholder: `https://ten-mien.com/api_flowa.php`)
  - Input "API Key / Mật khẩu bảo mật" (password field)

**2. Edge Function — `supabase/functions/connect-website/index.ts`**
- Thêm `'nukeviet'` vào union type `integrationType` (line 18)
- Thêm validation case cho NukeViet: test POST đến endpoint với `api_key` để verify kết nối

**3. Edge Function — `supabase/functions/publish-website/index.ts`**
- Thêm case `'nukeviet'` (sau line 300): gửi POST với body format `{ api_key, title, content, catid }` — đúng format mà file PHP NukeViet mong đợi

**4. Edge Function — `supabase/functions/test-website-connection/index.ts`**
- Thêm case `'nukeviet'`: test bằng GET/POST đến endpoint với api_key

**5. Tạo file PHP tải về — `/mnt/documents/api_flowa.php`**
- Generate file PHP sẵn sàng tải (đoạn code NukeViet user cung cấp, đã tối ưu)
- Artifact để user download và gửi cho khách hàng

### Chi tiết kỹ thuật

Format gửi bài cho NukeViet endpoint:
```json
{
  "api_key": "xxx",
  "title": "Tiêu đề bài viết",
  "content": "<p>Nội dung HTML</p>",
  "catid": 1
}
```

Giao diện form NukeViet sẽ hiển thị:
```text
┌─────────────────────────────────────┐
│ 📋 Hướng dẫn cài đặt (4 bước)      │
│ 1. Tải file api_flowa.php           │
│ 2. Upload lên hosting               │
│ 3. Đổi mật khẩu trong file          │
│ 4. Nhập thông tin bên dưới          │
├─────────────────────────────────────┤
│ [📥 Tải file api_flowa.php]         │
│                                     │
│ API Endpoint *                      │
│ [https://domain.com/api_flowa.php]  │
│                                     │
│ Mật khẩu bảo mật (API Key) *       │
│ [••••••••••••]                      │
└─────────────────────────────────────┘
```

