# Plan: Đồng bộ Brand Icon cho Social Channels

## Mục tiêu
Thay toàn bộ icon Lucide generic (Facebook, Instagram, Linkedin, Youtube, Music2-cho-TikTok, AtSign-cho-Threads, Send-cho-Telegram, Mail, MapPin) bằng SVG brand chính thức. Giữ nguyên 3 icon đã đúng: **Pinterest, Blogger, WordPress** + **Bluesky, X (Twitter)** đã có sẵn trong `SocialIcons.tsx`.

## Phạm vi icon cần bổ sung
Thêm vào `src/components/icons/SocialIcons.tsx` các SVG brand chính thức (simpleicons.org-style, viewBox 24x24, fill="currentColor"):

| Icon | Hiện tại (sai/generic) | Sẽ thêm |
|---|---|---|
| Facebook | Lucide `Facebook` (outline) | `FacebookIcon` — logo "f" filled chính thức |
| Instagram | Lucide `Instagram` (outline) | `InstagramIcon` — camera mark filled |
| LinkedIn | Lucide `Linkedin` (outline) | `LinkedInIcon` — "in" filled |
| YouTube | Lucide `Youtube` | `YouTubeIcon` — play button đỏ chuẩn |
| TikTok | Lucide `Music2` | `TikTokIcon` — note logo (đã có inline trong PlatformSelector → tách ra) |
| Threads | Lucide `AtSign` | `ThreadsIcon` — @ cách điệu chính thức |
| Telegram | Lucide `Send` | `TelegramIcon` — paper plane brand |
| Zalo | Chữ "Z" trong vòng tròn (không phải logo) | `ZaloIcon` — wordmark "Zalo" chính thức (giữ tên, sửa path) |
| Google Business | `MapPin` | `GoogleBusinessIcon` — "G" multi-color hoặc mono |
| Email | `Mail` (giữ — không phải brand) | giữ Lucide `Mail` |

## Các file phải cập nhật

### 1. `src/components/icons/SocialIcons.tsx` (nguồn duy nhất)
Thêm 8 export mới + sửa `ZaloIcon`. Mỗi icon là functional component nhận `SVGProps<SVGSVGElement>`.

### 2. `src/components/multichannel/streaming/ChannelIcon.tsx` (hub icon chính)
- Replace import Lucide `Facebook, Instagram, Linkedin, Youtube, Music2, AtSign, Send` → wrapper từ `SocialIcons`.
- Cập nhật `channelConfig` map cho: facebook, instagram, tiktok, threads, linkedin, youtube, zalo, zalo_oa, telegram, google_maps.
- Wrapper pattern (như `ZaloLucide` hiện có) để đồng nhất `LucideIcon` interface — KHÔNG đổi API public của `ChannelIcon`.

### 3. `src/components/carousel/PlatformSelector.tsx`
- Bỏ `TikTokIcon` inline; import từ `@/components/icons/SocialIcons`.
- Replace Lucide `Facebook, Instagram, Linkedin` → brand version.

### 4. `src/components/multichannel/ExpandChannelsDialog.tsx` + `ExpandChannelsStreamingDialog.tsx`
- Replace import Lucide social icons → SocialIcons brand version.
- Giữ `Globe`, `Mail`, `MapPin` (Email/Maps không có brand SVG riêng — Mail là generic OK; MapPin → đổi thành `GoogleBusinessIcon` cho Google Maps/Business entry).

### 5. (Optional, low-risk) `src/components/icons/index.ts`
Tạo barrel export nếu chưa có để tất cả nơi import gọn: `import { FacebookIcon } from '@/components/icons'`.

## Nguyên tắc thiết kế
- **Single source of truth**: tất cả icon social đi qua `SocialIcons.tsx`. Cấm dùng Lucide cho: Facebook, Instagram, Linkedin, Youtube, TikTok, Threads, Telegram, Pinterest, Blogger, WordPress, Bluesky, X, Zalo.
- **viewBox 24x24, `fill="currentColor"`** → giữ tương thích với `bgClass` color trong `ChannelIcon` (vd `bg-blue-500 text-white`).
- **Không đổi màu nền** (`channelConfig.bgClass`) — chỉ đổi glyph. Soft Luxury palette giữ nguyên.
- **Backward compat**: API `<ChannelIcon channel="..." size="..." />` không đổi → 100+ call site không cần sửa.

## Verification sau khi đổi
1. Mở wizard "Tạo nội dung" (như screenshot user gửi) → check 16 channel hiển thị đúng brand glyph.
2. Mở `MultiChannelViewer`, `KanbanCard`, `PipelineKanban`, `SocialConnectionsManager` → kiểm tra icon đồng nhất.
3. Dark mode: icon `text-white` trên `bg-blue-500` v.v. vẫn render rõ.
4. TikTok ở `PlatformSelector` (carousel) khớp với TikTok ở `ChannelIcon`.

## Ngoài phạm vi
- Không động vào logic publishing, OAuth, types.
- Không đổi `bgClass`/màu thương hiệu (nếu cần thì lần sau).
- Không refactor các call site dùng trực tiếp Lucide `Mail` cho Email (đó là icon generic chấp nhận được).

## Risk
- **Thấp**: chỉ thay glyph, giữ interface. Nếu SVG path lỗi → chỉ ảnh hưởng visual, không crash.
- Test thủ công 1 màn hình mỗi nhóm (wizard, kanban, viewer, connections page) là đủ.
