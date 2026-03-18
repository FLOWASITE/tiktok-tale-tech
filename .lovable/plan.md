

# Kích hoạt Facebook Publishing cho User

## Hiện trạng

Backend đã sẵn sàng:
- ✅ Edge function `publish-facebook/index.ts` — đã có, hỗ trợ text/photo/link/scheduled posts
- ✅ Edge function `facebook-oauth-callback/index.ts` — đã có, xử lý OAuth flow
- ✅ Edge function `connect-social/index.ts` — đã có redirect URI cho Facebook
- ✅ Edge function `test-facebook-credentials/index.ts` — đã có

Frontend đang **block** ở 3 điểm:

1. **`DirectPublishButton.tsx` (line 142)**: `isSupported = platform === 'twitter'` → Facebook bị disable, hiện "Sắp ra mắt"
2. **`DirectPublishButton.tsx` (line 110-118)**: `handlePublish` switch chỉ có case `twitter`, không có case `facebook`
3. **`useDirectPublish.ts` (line 83-90)**: `publishToFacebook` là placeholder, throw error "not yet supported"

## Thay đổi cần thực hiện

### File 1: `src/hooks/useDirectPublish.ts`
- Sửa `publishToFacebook`: thay placeholder bằng gọi thực `publishMutation.mutateAsync({ platform: 'facebook', options })` (giống `publishToTwitter`)

### File 2: `src/components/social/DirectPublishButton.tsx`
- Sửa `isSupported`: thêm `facebook` → `platform === 'twitter' || platform === 'facebook'`
- Sửa `handlePublish` switch: thêm `case 'facebook'` gọi `publishToFacebook`
- Import và sử dụng `publishToFacebook` từ `useDirectPublish`

Tổng cộng **2 file**, chỉ sửa frontend. Không cần thay đổi backend.

