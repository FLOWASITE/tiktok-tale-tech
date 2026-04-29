# Fix icon Pinterest, Blogger, WordPress trong ChannelIcon

## Vấn đề

Trong `src/components/multichannel/streaming/ChannelIcon.tsx` (component dùng ở PipelineKanban + CampaignPlanReview + MultiChannelViewer):

1. **Pinterest** chưa có entry trong `channelConfig` → fallback ra `Globe` icon xám. User thấy không đúng (Pinterest phải là chữ "P" đỏ `#E60023`).
2. **Blogger / WordPress** đã có entry nhưng SVG path hiện tại (`B in rounded square`, `W in circle`) **không phải logo chính thức** — render ở `size="sm"` (12px) trông gần giống globe/blob, user nhìn không nhận ra brand.
3. Background color cho Blogger đang là `#FF8000` (cam) — sai. Logo Blogger chính thức là **cam `#FF5722`** với chữ "B" trắng trên hình bút mực. WordPress brand color là **xanh `#21759B`** đã đúng nhưng SVG path không rõ.

DB confirm channel name lưu đúng raw: `pinterest`, `wordpress`, `blogger` (không bị alias) — nên fix chỉ nằm ở UI mapping.

## Thay đổi

### 1. `src/components/icons/SocialIcons.tsx`

Thay 3 SVG path bằng logo chính thức nhận diện rõ ở size nhỏ:

- **PinterestIcon** — giữ nguyên (path "P" đã chuẩn brand)
- **WordPressIcon** — thay bằng path official logo "W trong vòng tròn" đậm nét hơn (clear ở 12px)
- **BloggerIcon** — thay bằng path official "B" trên nền pen-shape (Google Blogger logo, clear stroke)

### 2. `src/components/multichannel/streaming/ChannelIcon.tsx`

Thêm `pinterest` vào `channelConfig`:

```ts
pinterest: {
  icon: PinterestLucide,
  bgClass: "bg-[#E60023] text-white",  // Pinterest brand red
  label: "Pinterest"
}
```

Tạo `PinterestLucide` wrapper giống `WordPressLucide` / `BloggerLucide` đã có.

Sửa `bgClass` Blogger từ `bg-[#FF8000]` → `bg-[#FF5722]` (orange-deep-orange chuẩn Google Blogger).

## Files modified
- `src/components/icons/SocialIcons.tsx` — refine 2 SVG paths (Blogger, WordPress)
- `src/components/multichannel/streaming/ChannelIcon.tsx` — add pinterest entry + PinterestLucide wrapper + fix Blogger color

## Phạm vi ảnh hưởng
Mọi nơi dùng `<ChannelIcon channel="..." />`: PipelineKanban, CampaignPlanReview, MultiChannelViewer, ChannelGroupView, streaming dialogs. Sau khi merge, 3 icon sẽ render rõ brand tại tất cả vị trí.

## Không thay đổi
- Logic mapping channel name (raw → icon) — đã đúng từ DB
- ChannelIcon component API
- Icon Facebook/Instagram/TikTok... (đã đúng từ lucide)