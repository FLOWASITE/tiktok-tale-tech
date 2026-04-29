# Thay icon chuẩn cho Social Connections (Brand View)

## Vấn đề
Trong `BrandViewConnectionsTab` (tab Connections của Brand), các nền tảng đang hiển thị icon **lucide generic** thay vì SVG brand chính thức:
- TikTok dùng `Music2`
- Threads dùng `AtSign`
- Zalo OA dùng `MessageCircle`
- Google Business dùng `MapPin`
- Blogger / WordPress / Website dùng `Globe`

Trong khi đó `src/components/ui/channel-icon.tsx` đã có sẵn **SVG chính chủ** (TikTok note, Threads @, Zalo Z, Blogger "B", WordPress W…) — chỉ cần dùng đúng component.

## Thay đổi

**File**: `src/components/brand/BrandViewConnectionsTab.tsx` (lines 76–160)

Replace `PLATFORM_CONFIG` để dùng `<ChannelIcon channel="..." />` cho mọi platform:
- `twitter` → ChannelIcon "twitter"
- `facebook` → ChannelIcon "facebook"
- `instagram` → ChannelIcon "instagram"
- `linkedin` → ChannelIcon "linkedin"
- `tiktok` → ChannelIcon "tiktok" (note icon đen chính thức)
- `threads` → ChannelIcon "threads" (@ icon)
- `youtube` → ChannelIcon "youtube"
- `zalo_oa` → ChannelIcon "zalo_oa"
- `google_business` → ChannelIcon "google_maps" (pin Google)
- `blogger` → ChannelIcon "blogger" (chữ B cam)
- `wordpress` → ChannelIcon "wordpress" (W xanh)
- `website` → ChannelIcon "website" (globe)

Đồng thời đổi background `color` từ "bg-[BRAND] text-white" sang **tinted background `bg-[BRAND]/10`** (nền nhạt 10%, icon brand-color hiển thị rõ) để đúng theo Soft Luxury design system thay vì khối màu đậm.

## Không thay đổi
- File `channel-icon.tsx` đã có icon chuẩn → giữ nguyên.
- Các component khác (publish button, stats, calendar) đã dùng ChannelIcon → không động vào.
- Lucide imports cũ (`Music2`, `AtSign`, `MessageCircle`, `MapPin`, `Globe`, `Twitter`, `Facebook`, `Instagram`, `Linkedin`, `Youtube`) sẽ bị unused — TypeScript/ESLint sẽ tự cảnh báo nhưng không block; có thể dọn nhưng không cần thiết cho fix.

## Kết quả
Danh sách kết nối hiển thị **icon brand chuẩn** giống các phần khác trong app: TikTok đen với nốt nhạc, Threads với @, Zalo với Z, Blogger với B cam, WordPress với W xanh — thống nhất visual identity.
