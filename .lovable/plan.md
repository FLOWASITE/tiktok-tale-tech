

# Sửa trạng thái Gemini: hiển thị "Not configured"

## Vấn đề
Gemini hiện đang có row trong bảng `ai_provider_configs` với `is_active=true`, nhưng không có API key riêng (cả `encrypted_api_key` và `api_key_secret_name` đều NULL). Gemini thực chất hoạt động qua Lovable AI Gateway, nên trạng thái "Active" là sai lệch.

## Giải pháp
Xóa row Gemini khỏi bảng `ai_provider_configs`. Khi không có row, UI sẽ tự động hiển thị badge "Not configured" -- đúng với thực tế là chưa cấu hình API key riêng cho Gemini.

## Chi tiết kỹ thuật

### Database
Chạy DELETE để xóa row Gemini:
```sql
DELETE FROM ai_provider_configs WHERE provider_type = 'gemini';
```

### Không cần thay đổi code
Logic hiển thị trong `AIProviderManager.tsx` đã đúng:
- Không có row trong DB -> `getConfiguredProvider('gemini')` trả về `undefined` -> hiển thị badge "Not configured" và nút "Cấu hình"
- Khi admin muốn dùng Gemini API key riêng, họ bấm "Cấu hình" để thêm key

| Thay doi | Chi tiet |
|----------|----------|
| Database DELETE | Xoa 1 row `gemini` khoi `ai_provider_configs` |
| Code changes | Khong can |

