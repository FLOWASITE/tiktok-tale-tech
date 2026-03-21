

# Cấu hình Zalo OA để User đăng bài trực tiếp

## Hiện trạng

Hệ thống đã có **hầu hết infrastructure** cho Zalo OA:
- ✅ `connect-social` có branch `zalo_oa` → tạo OAuth URL
- ✅ `zalo-oauth-callback` → đổi code lấy token, lưu `social_connections`
- ✅ `publish-zalo` edge function → tạo article trên OA
- ✅ `refresh-zalo-token` → refresh token khi hết hạn
- ✅ `test-zalo-connection` + `test-zalo-credentials` → kiểm tra kết nối
- ✅ Frontend: `ZaloCallback` page, route `/auth/zalo/callback`
- ✅ Admin UI: Zalo OA trong `AdminSocialSettings`

## Vấn đề cần fix

### 1. Bug nghiêm trọng: Tên Edge Function không khớp
`useDirectPublish` gọi `publish-${platform}` → với `zalo_oa` sẽ gọi **`publish-zalo_oa`** nhưng function thật tên là **`publish-zalo`**. → Publish sẽ luôn fail 404.

### 2. Callback redirect URL sai
`zalo-oauth-callback` redirect về `.lovableproject.com` (không tồn tại). Cần sửa giống pattern X/Facebook callback dùng `frontendOrigin` từ state.

### 3. State thiếu `frontendOrigin`
`connect-social` branch `zalo_oa` (dòng 652) không truyền `frontendOrigin` vào state → callback không biết redirect về đâu.

### 4. Publish flow chưa hỗ trợ trong DirectPublishButton
Zalo OA chưa nằm trong danh sách platform được phép publish (hiện chỉ có twitter, facebook, linkedin).

### 5. Zalo OA char limit chưa được set
`PLATFORM_CHAR_LIMITS` chỉ có twitter (280) và facebook. Zalo article title giới hạn ~100 ký tự.

## Kế hoạch sửa

### Bước 1: Fix `useDirectPublish` — Map platform name đúng
**File:** `src/hooks/useDirectPublish.ts`
- Thêm mapping: `zalo_oa` → `publish-zalo` (thay vì `publish-zalo_oa`)

### Bước 2: Fix `connect-social` — Thêm `frontendOrigin` vào state
**File:** `supabase/functions/connect-social/index.ts` (dòng 652)
- Thêm `frontendOrigin: requestOrigin || null` vào state object cho Zalo OA

### Bước 3: Fix `zalo-oauth-callback` — Redirect đúng frontend
**File:** `supabase/functions/zalo-oauth-callback/index.ts`
- Parse `frontendOrigin` từ state
- Validate origin giống pattern Facebook/X callback (ALLOWED_ORIGIN_PATTERNS)
- Redirect về `{frontendOrigin}/auth/zalo/callback?success=true&...`
- Error redirect cũng về frontend đúng

### Bước 4: Mở Zalo OA trong DirectPublishButton
**File:** `src/components/social/DirectPublishButton.tsx`
- Thêm `zalo_oa` vào danh sách platform được publish
- Thêm char limit cho Zalo OA (2000 ký tự cho body)

### Bước 5: Deploy lại các Edge Functions
- `connect-social`
- `zalo-oauth-callback`
- `publish-zalo`

## Sau khi code xong
Bạn sẽ cần:
1. Vào **Admin Social Settings** → Cấu hình Zalo OA (nhập App ID + Secret Key từ Zalo Developers Portal)
2. Vào Brand → Kết nối Zalo OA qua OAuth
3. Test đăng bài

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useDirectPublish.ts` | Map `zalo_oa` → `publish-zalo` |
| `supabase/functions/connect-social/index.ts` | Thêm `frontendOrigin` vào Zalo state |
| `supabase/functions/zalo-oauth-callback/index.ts` | Fix redirect logic |
| `src/components/social/DirectPublishButton.tsx` | Enable Zalo OA publish + char limit |

