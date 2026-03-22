

## Vấn đề

Màn hình Admin Social Settings hiển thị Consumer Key **cũ** (`1Dvw****YfpV`) vì nó đọc từ bảng `social_platform_settings` trong database — nơi lưu credentials đã mã hóa từ lần cấu hình trước.

Trong khi đó, secrets `TWITTER_CONSUMER_KEY` / `TWITTER_CONSUMER_SECRET` (environment variables) đã được cập nhật đúng key mới (`TxWg...`). Các edge functions (publish-twitter, connect-social) **ưu tiên dùng environment secrets**, nên chúng đã dùng key đúng.

Tóm lại: **hai nơi lưu credentials khác nhau** — DB cũ, env mới.

## Giải pháp

Cập nhật credentials trong bảng `social_platform_settings` cho platform `twitter` bằng key mới để admin UI hiển thị đúng.

### Bước thực hiện

1. **Gọi edge function `manage-social-platform-settings`** (POST) với body chứa platform `twitter`, consumer_key và consumer_secret mới — function sẽ mã hóa và upsert vào DB.

Cách đơn giản nhất: Bạn bấm nút **"Chỉnh sửa"** trên card Twitter/X trong admin, nhập lại Consumer Key `TxWg5u2uDlX7UAgehcEcxXI2L` và Consumer Secret `sX3nONH6N7aA289RFwxKKalf3a2XRgM08DzVVe7BNCGsBdP40L`, rồi lưu.

Không cần thay đổi code — chỉ cần cập nhật dữ liệu trong DB qua UI có sẵn.

