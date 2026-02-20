

# Cấu hình KIE.ai Provider trong Database

## Vấn đề
Tab Providers hiển thị KIE.ai là "Not configured" vì bảng `ai_provider_configs` chưa có row cho KIE.ai. Hiện tại chỉ có 2 providers đã cấu hình: Gemini và OpenRouter.

## Giải pháp
Thêm một row vào bảng `ai_provider_configs` cho KIE.ai, tham chiếu đến secret `KIE_API_KEY` đã có sẵn.

## Chi tiết kỹ thuật

### Database Migration
Chạy INSERT vào bảng `ai_provider_configs`:
- `provider_type`: `kie`
- `display_name`: `KIE.ai`
- `is_active`: `true`
- `api_key_secret_name`: `KIE_API_KEY`
- `default_model`: `flux-kontext-pro`

Sau khi thêm row này, UI sẽ tự động nhận diện KIE.ai là "Active" với badge xanh, hiển thị model mặc định và trạng thái "API Key đã cấu hình".

### Không cần thay đổi code
Tất cả logic frontend (icon, key URL, models dropdown, test connection) đã sẵn sàng từ các bước trước. Chỉ thiếu dữ liệu trong database.

| Thay đổi | Chi tiết |
|----------|----------|
| Database INSERT | 1 row vào `ai_provider_configs` cho KIE.ai |
| Code changes | Không cần |

