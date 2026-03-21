

# Thông báo rõ cho User về giới hạn gói Zalo OA

## Vấn đề
Khi Zalo OA đang dùng gói "Cơ bản" (miễn phí), API đăng bài trả lỗi `-224: OA needs to upgrade OA Tier Package`. Hiện tại user không biết nguyên nhân, chỉ thấy "Failed to send" chung chung.

## Giải pháp

### 1. Lưu `package_name` khi kết nối OA
**File:** `supabase/functions/zalo-oauth-callback/index.ts`
- Thêm `oa_package: oaInfo.data?.package_name || null` vào `metadata` của `connectionData` (dòng 179-184)
- Thêm `package_name` vào response JSON trả về proxy (dòng ~200)

### 2. Hiển thị cảnh báo gói OA trên callback thành công
**File:** `src/pages/ZaloCallback.tsx`
- Đọc thêm param `package_name` từ query
- Nếu `package_name` là "Cơ bản" hoặc "Basic" → hiển thị alert vàng: "OA của bạn đang dùng gói Cơ bản. Tính năng đăng bài qua API yêu cầu nâng cấp gói tại oa.zalo.me/home/pricing"
- Vẫn hiển thị kết nối thành công (vì OAuth đã OK, chỉ publish bị giới hạn)

### 3. Hiển thị badge cảnh báo trong SocialConnectionsManager
**File:** `src/components/social/SocialConnectionsManager.tsx`
- Khi hiển thị connection Zalo OA đã kết nối, kiểm tra `metadata.oa_package`
- Nếu gói "Cơ bản" → hiển thị badge vàng "Gói cơ bản - Hạn chế đăng bài API" + link nâng cấp

### 4. Xử lý lỗi publish rõ ràng hơn
**File:** `supabase/functions/publish-zalo/index.ts`
- Bắt error code `-224` cụ thể → trả message tiếng Việt: "Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Vui lòng nâng cấp gói tại oa.zalo.me/home/pricing"
- Thêm field `errorCode: 'OA_TIER_LIMITED'` để frontend xử lý riêng

### 5. Frontend hiển thị lỗi OA Tier thân thiện
**File:** `src/hooks/useDirectPublish.ts`
- Kiểm tra nếu error chứa `OA_TIER_LIMITED` hoặc "upgrade OA Tier" → toast riêng với link nâng cấp và mô tả rõ ràng thay vì lỗi generic

### 6. Cập nhật proxy page
**File:** `src/pages/ZaloOAuthProxy.tsx`
- Forward `package_name` từ response sang redirect params

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/zalo-oauth-callback/index.ts` | Lưu `oa_package` vào metadata, trả `package_name` trong response |
| `supabase/functions/publish-zalo/index.ts` | Bắt error `-224`, trả message tiếng Việt + errorCode |
| `src/pages/ZaloCallback.tsx` | Hiển thị cảnh báo gói Cơ bản |
| `src/pages/ZaloOAuthProxy.tsx` | Forward `package_name` param |
| `src/components/social/SocialConnectionsManager.tsx` | Badge cảnh báo gói OA |
| `src/hooks/useDirectPublish.ts` | Toast thân thiện cho lỗi OA Tier |

