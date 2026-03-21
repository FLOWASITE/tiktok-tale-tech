

# Sửa lỗi Zalo OA: Nhầm lỗi user_id thành lỗi gói Cơ bản

## Nguyên nhân gốc

Từ edge logs, Zalo API trả về `{ error: -201, message: "user_id is invalid" }`. Đây là lỗi do gửi `recipient: { user_id: 'all' }` vào broadcast API — giá trị `'all'` không hợp lệ. **Không phải lỗi gói OA.**

Nhưng code hiện tại gộp error `-201` vào cùng nhóm `-224` (OA_TIER_LIMITED), nên hiển thị nhầm "Zalo OA đang dùng gói Cơ bản".

DB xác nhận: `oa_package = 'Nâng cao'` — OA này đã nâng cấp rồi.

## Kế hoạch sửa

### 1. Sửa `publish-zalo` Edge Function — Dùng Article API thay Broadcast
- Bỏ fallback broadcast API (`/v3.0/oa/message/cs`) vì API đó dùng để gửi tin nhắn cho user cụ thể, không phải đăng bài
- Dùng **Article API** (`/v2.0/article/create`) làm phương thức đăng bài chính
- Yêu cầu bắt buộc có `mediaUrls[0]` hoặc `articleData.coverUrl` làm ảnh bìa
- Nếu không có ảnh → trả lỗi rõ ràng: "Zalo OA yêu cầu ảnh bìa để đăng bài. Vui lòng thêm ảnh."
- Tách riêng error `-201` (user_id invalid) khỏi `-224` (tier limit)

### 2. Sửa `SocialConnectionsManager.tsx` — Hiển thị đúng gói OA
- Thay vì chỉ cảnh báo khi gói "Cơ bản"/"Basic", hiển thị badge thông tin gói thực tế (VD: "Gói Nâng cao ✓")
- Chỉ cảnh báo vàng khi thực sự là gói Cơ bản

### 3. Sửa `BrandViewConnectionsTab.tsx` — Hiển thị gói OA
- Thêm hiển thị tương tự: badge gói OA trong phần connection info

### 4. Sửa `useDirectPublish.ts` — Xử lý lỗi thiếu ảnh
- Thêm nhận diện errorCode `MISSING_COVER_IMAGE` → toast hướng dẫn thêm ảnh
- Giữ nhận diện `OA_TIER_LIMITED` cho error `-224` thực sự

### 5. Sửa `ZaloCallback.tsx` — Hiển thị chính xác gói
- Không hardcode cảnh báo cho "Cơ bản" nữa
- Hiển thị badge gói thực tế từ `package_name` param

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-zalo/index.ts` | Dùng Article API, bắt buộc cover image, tách error codes |
| `src/hooks/useDirectPublish.ts` | Xử lý errorCode `MISSING_COVER_IMAGE` |
| `src/components/social/SocialConnectionsManager.tsx` | Badge gói OA chính xác |
| `src/components/brand/BrandViewConnectionsTab.tsx` | Badge gói OA |
| `src/pages/ZaloCallback.tsx` | Hiển thị gói thực tế |

