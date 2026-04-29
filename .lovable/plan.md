## Vấn đề

Trong trang Brand → tab Channels, mục **Channel Settings** chỉ liệt kê 10 kênh (Website, Facebook, Instagram, X, Google Maps, LinkedIn, Email, YouTube, Zalo OA, Telegram) — **thiếu Blogger** (cũng như TikTok, Threads). Vì vậy không thể cấu hình độ dài / hook / CTA / emoji riêng cho Blogger ở cấp Brand.

Nguyên nhân: file `src/components/brand/BrandViewChannelsTab.tsx` có một mảng `ALL_CHANNELS` **hardcoded** (10 kênh) thay vì dùng `CHANNELS` từ `@/types/multichannel` (đã có đủ Blogger/TikTok/Threads). Ngoài ra label `blogger` đang gán nhầm là `'Website'`.

Phần "AI Optimization per Channel" (chip "Blogger +") đã hoạt động đúng vì dùng `CHANNELS` từ source of truth.

## Thay đổi

### 1. `src/components/brand/BrandViewChannelsTab.tsx`
- Thay mảng `ALL_CHANNELS` hardcoded bằng `CHANNELS.map(c => c.value)` (import từ `@/types/multichannel`) → tự động sync mọi kênh hợp lệ, bao gồm Blogger / TikTok / Threads.
- Sửa `channelLabels.blogger` từ `'Website'` → `'Blogger'` để phân biệt rõ với Website.
- Giữ thứ tự ưu tiên (đặt `blogger` cạnh `website` cho hợp lý nhóm Text).

### 2. (Tuỳ chọn — gom dọn) Các nơi khác đang hardcode danh sách 10–12 kênh thiếu Blogger
Để Blogger nhất quán toàn UI multichannel, cập nhật cùng lúc:
- `src/components/MultiChannelViewer.tsx` (dòng 1057): thêm `'blogger'` vào `ALL_CHANNELS` để đếm "kênh chưa expand".
- `src/components/multichannel/ChannelGroupView.tsx` (dòng 62): thêm `'blogger'`.
- `src/components/multichannel/ExpandChannelsDialog.tsx` (dòng 46) và `ExpandChannelsStreamingDialog.tsx` (dòng 50): thêm `'blogger'` vào danh sách kênh có thể mở rộng.
- `src/hooks/useMultiChannelContents.ts` (dòng 92): thêm `'blogger'` vào allowlist khi load contents.

Không đụng đến:
- `useChannelModelConfig.ts` `ALL_CHANNELS` (config model AI cấp admin, có schema riêng — sẽ là task tách biệt nếu cần).
- Backend / DB / RLS — `blogger` đã được xử lý qua alias `blogger → website` trong `generate-multichannel` và `channel-publisher`, không cần migration.

## Kết quả mong đợi
- Vào `/brands/:id` → tab Channels → mục **Channel Settings** xuất hiện hàng **Blogger** (cùng TikTok, Threads), mở ra cho phép xem/tuỳ chỉnh độ dài 800–1500 chữ và các rule khác (lấy từ `DEFAULT_CHANNEL_SETTINGS.blogger` đã có sẵn).
- Badge "X kênh tùy chỉnh" hoạt động đúng nếu user override Blogger.
- Các UI multichannel khác (viewer, expand dialog, group view) cũng nhận diện Blogger là kênh hợp lệ.
