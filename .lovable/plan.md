

# Fix link Điều khoản và Chính sách bảo mật trong form đăng ký

## Thay đổi

**File:** `src/pages/Auth.tsx` (dòng 602-604)

Hiện tại:
```html
<a href="/terms" target="_blank">Điều khoản dịch vụ</a>
<a href="/privacy" target="_blank">Chính sách bảo mật</a>
```

Sửa thành:
```html
<a href="https://flowa.one/terms" target="_blank" rel="noopener noreferrer">Điều khoản dịch vụ</a>
<a href="https://flowa.one/privacy" target="_blank" rel="noopener noreferrer">Chính sách bảo mật</a>
```

Vì form đăng ký chạy trên `app.flowa.one`, link tương đối `/terms` sẽ trỏ đến `app.flowa.one/terms` (không tồn tại). Cần dùng link tuyệt đối đến landing domain `flowa.one`.

