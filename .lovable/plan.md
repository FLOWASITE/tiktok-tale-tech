# Fix Instagram "Test kết nối" — Dev Mode code 2

## Nguyên nhân xác nhận
Meta App đang ở **Development Mode**, IG user không có Tester role → endpoint `/{ig_user_id}?fields=id,username,account_type,media_count` random trả `code:2 OAuthException is_transient:true`. Function detect transient và trả 503 → UI báo "Test không được".

## Hướng fix (chỉ sửa `supabase/functions/test-instagram-connection/index.ts`)

### 1. Đổi endpoint chính sang `/me` với fields tối thiểu
- Gọi: `GET https://graph.instagram.com/v21.0/me?fields=id,username&access_token=...`
- `/me` chịu Dev Mode tốt hơn vì self-introspection, không yêu cầu app review.
- `account_type` và `media_count` là **nice-to-have**, tách thành lần gọi 2 không-block.

### 2. Retry 1 lần với delay 1.5s khi gặp `code:2 is_transient`
- Lý do: code 2 thật sự có thể transient. Retry loại bỏ flake.

### 3. Fallback chain
```text
Try /me?fields=id,username
  ├─ OK → mark connection valid, update username
  │       └─ best-effort gọi tiếp /me?fields=account_type,media_count (lỗi → bỏ qua)
  └─ Fail (code 2 sau retry) →
        Try /{platform_user_id}?fields=id (chỉ id, ít quyền nhất)
          ├─ OK → vẫn coi là valid, message: "Token còn sống nhưng app đang Dev Mode, một số field bị giới hạn"
          └─ Fail → trả 503 + message rõ + fbtrace_id + hint Dev Mode
```

### 4. Cải thiện response payload
- Thêm `fbtrace_id` vào response error để user copy báo Meta nếu cần.
- Thêm `hint` field khi nghi Dev Mode:
  > "Meta App đang ở Development Mode. Vào Meta Developer Console → Roles → Add Instagram Tester, hoặc submit App Review để vào Live Mode."
- Khi success qua fallback id-only, set `data.limited: true` + message giải thích.

### 5. UI tweak nhẹ ở `BrandViewConnectionsTab` (hoặc nơi gọi test)
- Khi response có `hint` → toast description hiển thị thêm hint đó (1 dòng nhỏ).
- Không thêm component mới, chỉ append vào toast.

## Out of scope
- Không đụng OAuth flow, không đổi token storage, không thêm migration.
- Không tự động chuyển app sang Live Mode (việc này phải làm trên Meta Console).
- Không đụng `publish-instagram` hay các function khác.

## Verify
1. Deploy `test-instagram-connection`.
2. Bấm "Test kết nối" trên IG đang lỗi → expect: success với badge "limited" hoặc message rõ ràng kèm hint Dev Mode.
3. Check edge function logs: phải thấy log retry + log endpoint fallback đã chạy.
