# Làm lại Instagram Mockup — hiển thị ảnh đẹp

## Vấn đề hiện tại

`InstagramMockup` + `InstagramCarouselSlider` (file `src/components/preview/ChannelMockupFrame.tsx`) đang **ép cứng `aspect-[4/5]` + `object-cover`**:
- Ảnh vuông (1:1) bị cắt mất 20% chiều cao
- Ảnh ngang (16:9, 1.91:1) bị crop nặng 2 bên hoặc co vào khung dọc
- Ảnh dọc 9:16 (Reels-style) cũng bị cắt vì IG post chỉ tối đa 4:5
- Trên viewport hẹp (707px hiện tại), khung 4:5 quá cao → user phải scroll mới thấy action bar

Kết quả: preview không phản ánh đúng ảnh AI đã tạo, user khó đánh giá visual.

## Mục tiêu

Mockup giống Instagram thật: **tự động chọn aspect ratio** theo ảnh trong khoảng IG cho phép (1.91:1 → 4:5), **không crop** ảnh nằm trong dải đó, fallback `object-cover` chỉ khi ảnh nằm ngoài dải.

## Thay đổi (chỉ frontend, 1 file)

**`src/components/preview/ChannelMockupFrame.tsx`** — chỉnh `InstagramMockup` + `InstagramCarouselSlider`:

1. **Detect natural aspect ratio** của ảnh khi load (`onLoad` → `naturalWidth/naturalHeight`), lưu vào state.
2. **Clamp ratio vào dải IG hợp lệ**: min `1.91:1` (landscape), max `4:5` (portrait), default `1:1` khi chưa load.
3. **Container dùng ratio động** (`style={{ aspectRatio: ... }}`) thay vì cứng `aspect-[4/5]`.
4. **`object-contain` khi ảnh khớp ratio đã clamp** (không mất pixel); **`object-cover` chỉ khi ảnh ngoài dải** (rất dọc / rất ngang) — giống behavior IG thật.
5. **Background blur ảnh gốc** phía sau khi `object-contain` để 2 dải đen/trắng trông sang (giống IG khi post ratio không chuẩn).
6. **Carousel**: dùng ratio của **ảnh đầu tiên** làm chuẩn cho cả slider (IG cũng vậy) → tránh nhảy chiều cao khi swipe.
7. **Tối ưu cho viewport hẹp**: bỏ `aspect-[4/5]` cứng giúp khung không vượt quá ~520px cao trên mobile.

## Không thay đổi

- Header, action bar, caption, like animation, dots indicator
- Carousel logic (prev/next, index)
- Props API của `InstagramMockup` / `InstagramCarouselSlider`
- Các mockup khác (Facebook, TikTok, Pinterest…)
- Edge functions, schema, RLS

## File edit
- `src/components/preview/ChannelMockupFrame.tsx` (chỉ 2 component nội bộ)
