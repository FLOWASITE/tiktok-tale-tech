## Vấn đề

Trong `Channel Settings` (form Brand), thấy **Blogger xuất hiện 2 lần** — thực ra entry thứ 2 (1200-2000 chữ) chính là **WordPress** nhưng bị gán nhãn sai thành "Blogger" do bug trong `channelLabels` ở `src/components/brand/BrandViewChannelsTab.tsx` (line 68).

Kiểm tra thêm trong cùng file phát hiện một số lỗi label/icon khác cùng dạng:
- `wordpress: 'Blogger'` → đúng phải là **WordPress**
- `pinterest: 'Instagram'` → đúng phải là **Pinterest**
- Nhiều channel vẫn dùng generic Lucide icon (Globe, AtSign, Music2, Send...) thay vì brand SVG đã có sẵn trong `@/components/icons/SocialIcons` — không nhất quán với phần còn lại của hệ thống đã được chuẩn hoá ở các tin nhắn trước.

## Phạm vi sửa

**File duy nhất:** `src/components/brand/BrandViewChannelsTab.tsx`

### 1. Sửa `channelLabels` (line 65-82)
- `wordpress: 'Blogger'` → `wordpress: 'WordPress'`
- `pinterest: 'Instagram'` → `pinterest: 'Pinterest'`

### 2. Chuẩn hoá `channelIcons` (line 46-63) sang brand SVG
Import thêm từ `@/components/icons/SocialIcons`: `WordPressIcon`, `BloggerIcon`, `PinterestIcon`, `BlueskyIcon`, `FacebookIcon`, `InstagramIcon`, `LinkedInIcon`, `YouTubeIcon`, `TikTokIcon`, `ThreadsIcon`, `TelegramIcon`, `GoogleBusinessIcon` (đã được dùng ở `MultiChannelForm.tsx` và `streaming/ChannelIcon.tsx`).

Mapping mới:
- `blogger` → `BloggerIcon`
- `wordpress` → `WordPressIcon`
- `pinterest` → `PinterestIcon`
- `bluesky` → `BlueskyIcon`
- `facebook` → `FacebookIcon` (thay Facebook lucide)
- `instagram` → `InstagramIcon`
- `linkedin` → `LinkedInIcon`
- `youtube` → `YouTubeIcon`
- `tiktok` → `TikTokIcon` (thay Music2)
- `threads` → `ThreadsIcon` (thay AtSign)
- `telegram` → `TelegramIcon` (thay Send)
- `google_maps` → `GoogleBusinessIcon` (thay MapPin)
- `website`, `email`, `twitter`, `zalo_oa` giữ nguyên (Globe / Mail / XIcon / ZaloIcon đã đúng)

### 3. Dọn import lucide không còn dùng
Bỏ các import không còn cần: `Facebook`, `Instagram`, `Linkedin`, `Youtube`, `Music2`, `AtSign`, `Send`, `MapPin` (giữ `Globe`, `Mail`).

## Kết quả

- Channel Settings hiển thị **Website / Blogger / WordPress** là 3 dòng riêng biệt với label & icon đúng.
- Pinterest hiện đúng tên Pinterest (không còn nhãn Instagram).
- Toàn bộ icon nhất quán với các form khác trong hệ thống (đã chuẩn hoá brand SVG ở các bước trước).

Không có thay đổi DB, không cần migration, không ảnh hưởng logic save/load.
