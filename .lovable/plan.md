Kết quả kiểm tra nhanh: lần bấm gần nhất đã chạy OAuth và callback thành công, nhưng Facebook chỉ trả về 1 Page và đó chính là Page đã kết nối sẵn. Vì vậy UI không có Page mới để attach. Ngoài ra callback đang redirect sang domain published `app.flowa.one`, có thể làm popup không đồng bộ với preview hiện tại.

Kế hoạch sửa:

1. Ép Facebook hiện màn chọn/quản lý Page mỗi lần bấm “Thêm Fanpage khác”
   - Cập nhật URL OAuth trong `connect-social` cho Facebook thêm tham số buộc cấp quyền lại/chọn lại Page.
   - Mục tiêu: khi user đã từng cấp quyền app, Facebook vẫn mở màn cho phép chọn thêm Page mới thay vì tự dùng danh sách Page cũ.

2. Giữ popup quay về đúng origin đang mở app
   - Điều chỉnh callback fallback để ưu tiên `frontendOrigin` từ state.
   - Tránh trường hợp đang dùng preview/lovableproject nhưng popup bị redirect sang `app.flowa.one`, khiến trải nghiệm “không được” dù backend đã tạo session.

3. Cải thiện Page picker khi chỉ thấy Page đã kết nối
   - Nếu danh sách trả về toàn Page đã kết nối, hiển thị cảnh báo rõ:
     “Facebook hiện chỉ cấp quyền cho các Page này. Bấm Cấp quyền thêm Page / Edit access trong Facebook để chọn Page khác.”
   - Thêm nút hành động “Cấp quyền thêm Page” để mở lại OAuth đúng chế độ chọn thêm Page.

4. Sửa attach/display cho Page mới
   - Khi attach page, lưu đủ `platform_display_name` và `platform_avatar_url` để UI hiển thị Page mới rõ ràng.
   - Giữ idempotent: nếu bấm lại Page cũ thì chỉ refresh token/thông tin, không tạo bản ghi trùng.

5. Làm polling ổn định hơn
   - Với Facebook, sau popup đóng sẽ refetch ngay và báo nếu chưa có Page mới thay vì im lặng.
   - Khi phát hiện Page mới, refetch cache đúng tab Kết nối.

File dự kiến chỉnh:
- `supabase/functions/connect-social/index.ts`
- `supabase/functions/facebook-oauth-callback/index.ts`
- `supabase/functions/facebook-attach-page/index.ts`
- `src/pages/FacebookCallback.tsx`
- `src/components/brand/BrandViewConnectionsTab.tsx`

Không cần đổi schema database.