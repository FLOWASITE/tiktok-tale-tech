## Chẩn đoán hiện tại

Log backend của `blogger-oauth-callback` xác nhận lỗi chính xác:

```text
The provided client secret is invalid.
```

Nghĩa là Google đã nhận được OAuth code, nhưng khi hệ thống đổi code lấy access token thì **Google từ chối `Google Client Secret` đang lưu cho Blogger**. Đây không phải lỗi `Refresh token Blogger` hay lỗi Sync 401 nữa; đây là lỗi cấu hình OAuth app.

Hiện database đang có cả cấu hình `blogger` và `google_business`, đều đang active. Vì `blogger` có credential riêng nên hệ thống ưu tiên dùng credential Blogger; nếu secret của row Blogger sai/mismatch với Client ID thì kết nối sẽ fail như ảnh bạn gửi.

## Cách xử lý nhanh ngay bây giờ

Vào **Admin → Social Platform Settings → Blogger → Chỉnh sửa** rồi nhập lại:

1. `Google Client ID` từ Google Cloud Console → OAuth 2.0 Client IDs.
2. `Google Client Secret` đúng của cùng OAuth Client đó.
3. Đảm bảo OAuth Client là loại **Web application**.
4. Trong Google Cloud, thêm đúng **OAuth Callback URL** đang hiển thị trong dialog cấu hình Blogger.
5. Bật **Blogger API v3** cho project Google đó.
6. Lưu → bấm Test → quay lại Brand Connections → kết nối Blogger lại.

Lưu ý: hãy copy **Client Secret**, không copy **Secret ID** hoặc giá trị từ app khác. Client ID và Client Secret phải cùng một OAuth Client.

## Kế hoạch fix trong app sau khi bạn approve

1. **Làm lỗi OAuth Blogger dễ hiểu hơn**
   - Cập nhật `blogger-oauth-callback` để bắt riêng lỗi `invalid_client` / `client secret is invalid`.
   - Thay vì hiện tiếng Anh thô, popup sẽ báo rõ bằng tiếng Việt: “Google Client Secret của Blogger không đúng hoặc không khớp Client ID. Vào Admin → Social Platform Settings → Blogger để nhập lại.”

2. **Đồng bộ nguồn credential Blogger**
   - Cập nhật `connect-social` và `blogger-oauth-callback` để cùng dùng một nguồn credential đã chọn.
   - Nếu Blogger không có đủ cả Client ID + Secret thì fallback sang Google Business.
   - Ghi `credentialSource` vào OAuth state để callback không chọn nhầm nguồn khác sau khi user consent.

3. **Nâng cấp nút Test trong Admin Social Settings cho Blogger**
   - Cho Blogger gọi trực tiếp `test-blogger-credentials` thay vì đi qua generic diagnostics nếu cần.
   - Cập nhật `test-blogger-credentials` để kiểm tra thực tế với Google OAuth token endpoint và phân biệt:
     - Secret sai / không khớp Client ID.
     - Redirect URI chưa cấu hình.
     - Blogger API v3 chưa bật.
     - Credential chỉ đúng format nhưng chưa xác thực được.

4. **Thêm hướng dẫn cấu hình rõ hơn trong dialog Blogger**
   - Nhấn mạnh cần copy callback URL trong dialog vào Google Cloud.
   - Nhắc không dùng “Secret ID”.
   - Nhắc Client ID/Secret phải thuộc cùng OAuth Client.
   - Nhắc bật Blogger API v3 và scope Blogger.

5. **Không thay đổi database schema**
   - Không cần migration.
   - Không sửa file auto-generated.
   - Không lưu secret mới thay bạn; phần secret đúng vẫn cần bạn nhập trong Admin vì hệ thống không thể tự biết Client Secret đúng từ Google.

## Kết quả sau fix

- Nếu credential đúng: kết nối Blogger sẽ hoàn tất và lưu connection.
- Nếu credential sai: hệ thống sẽ chỉ rõ phải sửa Blogger Client Secret ở đâu, thay vì chỉ hiện “The provided client secret is invalid.”
- Admin có thể Test credential trước khi user thử kết nối lại.

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>