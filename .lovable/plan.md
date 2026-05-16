# Tạo ảnh AI trực quan hơn khi bài đã có nội dung

## Hiện trạng (đã verify trong `src/components/MultiChannelViewer.tsx`)

- **Toolbar top** (line ~1129): nút `Tạo ảnh AI` là một outline button nhỏ, viền `primary/30`, label ẩn dưới `lg`. Không khác biệt khi bài đã/chưa có ảnh.
- **Sidebar kênh** (line ~1316): mỗi kênh chỉ có 1 chấm xanh nhỏ 1.5px khi đã có ảnh, không có CTA cho kênh chưa có.
- **Khu vực mockup** (line ~1722): `ContentMockupToggle` render với `channelImage` undefined khi chưa có — mockup hiện ô trống/placeholder mặc định, **không có CTA nào** mời tạo ảnh.
- **Action bar dưới mockup** (line ~1752): chỉ hiện khi đã có ảnh (Xem ảnh / Sửa chữ / …). Khi chưa có ảnh → khoảng trống hoàn toàn.

→ Hệ quả: user đọc xong text, scroll xuống thấy mockup trống nhưng không biết bấm đâu để tạo ảnh; phải tìm lên toolbar và đoán nút `Wand2` nhỏ là gì.

## Mục tiêu

Khi bài đã có text cho kênh nhưng `content.channel_images?.[channel]?.url` rỗng → hiển thị **CTA tạo ảnh nổi bật**, đặt đúng chỗ user đang nhìn (ngay dưới mockup), kèm tín hiệu phụ ở sidebar + toolbar.

## Thay đổi UI (chỉ frontend, không đụng logic generate)

### 1. CTA chính — `EmptyImageCTA` mới, đặt dưới mockup
File mới: `src/components/multichannel/EmptyImageCTA.tsx`

Render trong `MultiChannelViewer.tsx` tại vị trí line ~1750 — thay điều kiện hiện tại `{(hasImage) && <action bar>}` thành:
```tsx
{hasImage ? <ActionBar/> : <EmptyImageCTA channel={channel} onClick={openGenerator}/>}
```

Design (theo `mem://Soft Luxury` + tham khảo `AIReadyCard.tsx` đã có):
- Card bo `rounded-xl` width full, padding gọn, **gradient subtle** `from-primary/8 via-purple-500/4 to-blue-500/6`, viền `border-primary/25`, shimmer animation nhẹ (reuse class `animate-[shimmer_...]` đã có).
- Layout 1 hàng: icon `Sparkles` trong ô bo tròn `bg-primary/15` 36px · text 2 dòng (`"Bài này chưa có ảnh cho {channel.label}"` + sub `"AI sẽ tự chọn phong cách, tỉ lệ và bố cục tối ưu"`) · nút primary `gradient` `from-primary to-primary/80` label **"Tạo ảnh AI ngay"** + icon `Wand2`.
- Hover: `-translate-y-0.5` + glow shadow primary.
- Click → gọi `setActiveImageChannel(channel); setShowImageGenerator(true);` (cùng handler nút toolbar).

### 2. Nâng cấp nút toolbar (line ~1129)
Đếm số kênh chưa có ảnh `missingCount = selected_channels.filter(ch => !channel_images?.[ch]?.url).length`:
- Nếu `missingCount > 0`: đổi variant `outline` → `default` (primary solid), thêm badge `secondary` hiển thị `{missingCount}` bên phải label, thêm class `animate-pulse-slow` (1 nhịp 2s).
- Nếu `missingCount === 0`: giữ outline như cũ, label đổi thành "Tạo lại ảnh".
- Trên mobile (label ẩn) vẫn thấy badge số.

### 3. Sidebar kênh (line ~1316)
Thay chấm xanh nhỏ bằng badge nhỏ hơn nhưng rõ hơn:
- Có ảnh: chip `bg-emerald-500/10 text-emerald-600` text `✓ Ảnh`.
- Chưa có ảnh **và có text**: chip `bg-amber-500/10 text-amber-600` text `Cần ảnh`, click vào chip → mở image generator với `activeImageChannel = channel` (stop propagation khỏi button chọn kênh).

### 4. Tooltip & a11y
- Nút toolbar: tooltip "Còn {missingCount} kênh chưa có ảnh — bấm để tạo hàng loạt".
- CTA: `aria-label="Tạo ảnh AI cho kênh {channel.label}"`.

## File touch (dự kiến)
- ✏️ `src/components/MultiChannelViewer.tsx` — sửa toolbar button (3 dòng), sửa sidebar badge (~5 dòng), thêm `<EmptyImageCTA/>` ở else-branch dưới mockup.
- 🆕 `src/components/multichannel/EmptyImageCTA.tsx` — component mới (~60 dòng).

## Out of scope
- Không đổi flow generate, không đụng edge function, không đổi `useImageGeneration` hook.
- Không sửa `SocialPostCard` (list view) — phạm vi user nói là "trong bài" tức viewer chi tiết.
- Không đụng `MultiChannelCreate` (flow tạo mới đã có `AIReadyCard` riêng).
