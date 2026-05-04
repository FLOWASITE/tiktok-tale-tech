Vấn đề đúng là: UI đã cho nhập Shopify Client ID/Secret, nhưng function `test-shopify-credentials` vẫn đang đọc `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` từ backend secrets cũ. Vì vậy dù bạn nhập đúng trong admin form, bấm Test vẫn báo lỗi thiếu/wrong secret.

Plan sửa gọn đúng lỗi:

1. Sửa `supabase/functions/test-shopify-credentials/index.ts`
   - Đổi từ đọc `Deno.env.get('SHOPIFY_CLIENT_ID')` / `SHOPIFY_CLIENT_SECRET` sang đọc row `platform = 'shopify'` trong `social_platform_settings`.
   - Decrypt `consumer_key` và `consumer_secret` bằng helper hiện có `decryptCredential`.
   - Giữ kiểm tra admin như hiện tại.
   - Trả lỗi rõ: “Shopify chưa được cấu hình trong Admin Social Settings” nếu chưa lưu credential.

2. Sửa `supabase/functions/shopify-oauth-start/index.ts`
   - OAuth connect brand cũng phải dùng Shopify Client ID đã lưu trong `social_platform_settings`.
   - Chỉ fallback sang backend secret nếu DB chưa có, để không phá môi trường cũ.

3. Sửa `supabase/functions/shopify-oauth-callback/index.ts`
   - Callback phải dùng cùng Client ID/Secret đã lưu để verify HMAC và exchange token.
   - Nếu không, connect Shopify sau này vẫn fail dù test pass.

4. Giữ nguyên UI button vừa sửa
   - Shopify vẫn giống Blogger: chưa cấu hình = `Cấu hình`; đã cấu hình = `Chỉnh sửa + test + xóa`.

5. Không sửa `_shared/crypto.ts`
   - Chỉ import và dùng helper có sẵn, tránh ảnh hưởng các function khác.