
Mình đã rà lại log + DB và xác nhận: callback Facebook đã chạy thành công, đã tạo `social_connections` active cho brand `4d7e0d97-...` (connection id `b0a37c86-...`). Vấn đề hiện tại không nằm ở lưu kết nối mà nằm ở luồng quay về UI.

## Nguyên nhân gốc
1. `facebook-oauth-callback` đang redirect về domain fallback `*.lovableproject.com` (project domain), không phải đúng origin nơi user bắt đầu OAuth (preview/published/custom).  
   => dễ lệch session/tab/context, user thấy “màn hình lạ” hoặc không thấy trạng thái cập nhật đúng chỗ.
2. `BrandViewConnectionsTab` mở OAuth popup nhưng không có cơ chế đồng bộ kết quả về tab gốc (không postMessage, không polling/refetch sau callback).  
   => dù backend đã lưu thành công, UI tab hiện tại vẫn có thể hiển thị “chưa kết nối”.
3. `FacebookCallback` redirect cứng về `/brands`, chưa giữ `brandTemplateId`.  
   => UX dễ gây hiểu nhầm “mất kết nối”.

## Kế hoạch triển khai
1. **Chuẩn hóa redirect theo origin khởi tạo OAuth**
   - File: `supabase/functions/connect-social/index.ts`
   - Khi tạo `state`, thêm `frontendOrigin` (lấy từ `Origin`/`Referer`) + `brandTemplateId`.
   - Áp dụng cho Facebook (và đồng bộ Threads để tránh lỗi tương tự).

2. **Callback dùng origin trong state (có validate an toàn)**
   - Files:  
     - `supabase/functions/facebook-oauth-callback/index.ts`  
     - `supabase/functions/threads-oauth-callback/index.ts`
   - Tạo helper chọn URL redirect theo thứ tự:
     1) `state.frontendOrigin` (nếu pass whitelist/validation)  
     2) `FRONTEND_URL` secret  
     3) fallback `.lovableproject.com`
   - Redirect success/error kèm `brandTemplateId` để frontend quay lại đúng brand.

3. **Đồng bộ trạng thái kết nối ở tab đang mở**
   - File: `src/components/brand/BrandViewConnectionsTab.tsx`
   - Khi `window.open(...)`, giữ reference popup và bật polling/refetch ngắn hạn (hoặc refetch khi popup đóng / focus trở lại).
   - Khi phát hiện đã có connection active cho platform đó => dừng polling + toast success rõ ràng.

4. **Cải thiện callback page để quay về đúng trang brand**
   - File: `src/pages/FacebookCallback.tsx` (và `ThreadsCallback.tsx` tương tự)
   - Đọc `brandTemplateId` từ query; ưu tiên `navigate(/brands/:id)` thay vì `/brands`.

## Chi tiết kỹ thuật (quan trọng)
- Thêm validation origin để tránh open-redirect (chỉ cho phép domain preview/published/custom hợp lệ, hoặc origin trùng cấu hình).
- Không thay đổi schema DB/RLS (không cần migration).
- Giữ tương thích ngược: nếu state cũ không có `frontendOrigin`, hệ thống vẫn chạy với fallback hiện tại.

## Kịch bản kiểm thử end-to-end sau khi sửa
1. Từ trang brand hiện tại bấm **Kết nối Facebook**.
2. Hoàn tất OAuth trong popup.
3. Xác nhận popup/callback quay lại đúng domain đã bắt đầu flow.
4. Tab brand tự cập nhật sang trạng thái **Đã kết nối** mà không cần F5.
5. Bấm **Test connection** để xác thực token/page thực sự usable.
