

## Thiết lập đăng bài tự động lên X (Twitter)

### Cảnh báo bảo mật
Bạn vừa chia sẻ API keys công khai trong chat. Sau khi thiết lập xong, **nên regenerate lại các keys** trên [developer.x.com](https://developer.x.com) để đảm bảo an toàn.

### Bước 1: Lưu Consumer Key/Secret vào backend secrets

Lưu 2 secrets sau vào hệ thống backend:
- `TWITTER_CONSUMER_KEY` = API Key
- `TWITTER_CONSUMER_SECRET` = API Key Secret

Đây là fallback khi không có cấu hình trong bảng `social_platform_settings`.

### Bước 2: Tạo Social Connection cho Twitter

Gọi edge function `connect-social` với:
- `platform`: `twitter`
- `accessToken`: Access Token của bạn
- `accessTokenSecret`: Access Token Secret của bạn
- `consumerKey`: Consumer Key (lưu trực tiếp vào connection)
- `consumerSecret`: Consumer Secret

Function sẽ tạo bản ghi trong bảng `social_connections` với đầy đủ credentials, cho phép `publish-twitter` sử dụng khi đăng bài.

### Bước 3: Kiểm tra từ giao diện

Sau khi lưu xong, vào trang quản lý Brand -> Social Connections, xác nhận Twitter đã hiển thị "Đã kết nối". Thử đăng 1 bài test.

### Chi tiết kỹ thuật

Luồng đăng bài hiện tại của `publish-twitter`:
1. Lấy `access_token` + `refresh_token` (chính là access_token_secret) từ bảng `social_connections`
2. Lấy `consumer_key`/`consumer_secret` theo thứ tự ưu tiên: connection -> `social_platform_settings` -> ENV secrets
3. Tạo OAuth 1.0a signature và gọi `https://api.x.com/2/tweets`

Không cần sửa code -- chỉ cần lưu credentials đúng chỗ.

