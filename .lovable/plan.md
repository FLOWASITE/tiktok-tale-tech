# Sửa: Không hiển thị nút "Đăng" cho Google Maps

## Nguyên nhân

Hệ thống multi-channel dùng key `google_maps`, nhưng `social_connections.platform` lưu là `google_business`. Trong `DirectPublishButton`, map `CHANNEL_TO_PLATFORM` chỉ có entry `google_business → google_business`, **không có** `google_maps`. Hệ quả:

- `src/components/social/DirectPublishButton.tsx:179` → `platform = CHANNEL_TO_PLATFORM['google_maps']` = `undefined`
- `src/components/social/DirectPublishButton.tsx:354` → `if (!platform) return null` → nút bị ẩn hoàn toàn cho card Google Maps trong `MultiChannelViewer`.

Ngoài ra, `useDirectPublish` chưa export hàm `publishToGoogleBusiness`, và `switch` trong `DirectPublishButton` cũng chưa có case → kể cả map xong cũng sẽ rơi vào `default` "not yet supported".

## Thay đổi

### 1. `src/components/social/DirectPublishButton.tsx`
- Thêm `google_maps: 'google_business'` vào `CHANNEL_TO_PLATFORM` (giữ nguyên `google_business` để tương thích ngược).
- Destructure thêm `publishToGoogleBusiness` từ `useDirectPublish`.
- Thêm `case 'google_business'` trong `switch (platform)` gọi `publishToGoogleBusiness(publishOptions)`.
- (Tùy chọn nhỏ) Thay icon `📍` bằng `MapPin` từ lucide cho nhất quán Soft Luxury.

### 2. `src/hooks/useDirectPublish.ts`
- Thêm helper `publishToGoogleBusiness(options)` chạy `publishMutation.mutateAsync({ platform: 'google_business', options })` — `PLATFORM_ACTION_MAP` đã có sẵn `'google_business' → 'google-business'` nên `channel-publisher` sẽ nhận đúng action.
- Export `publishToGoogleBusiness` trong return.

## Không thay đổi
- Edge function `channel-publisher` (action `google-business` đã có).
- Schema DB / RLS.
- Map `useRetryPublish` (đã đúng: `google_maps → google-business`).

## Kiểm thử
1. Trên `/multichannel`, mở 1 content có channel `google_maps` → nút "Đăng" hiển thị (state phụ thuộc kết nối Google Business của brand hiện tại).
2. Nếu chưa kết nối Google Business → nút ở trạng thái dashed/outlined như các kênh khác (đã có sẵn trong UI).
3. Nếu đã kết nối → bấm Đăng → dialog confirm → publish thành công qua `channel-publisher` action `google-business`.