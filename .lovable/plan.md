Mình đã xác định đúng nguyên nhân trong screenshot: bước “Kênh xuất bản” của form tạo mới Nội dung đa kênh đang render qua `CompactChannelGrid`, và dữ liệu icon được truyền từ `MultiChannelFormWizard.tsx`. Component này vẫn đang dùng map `channelIcons` cục bộ với các icon Lucide generic như `Send`, `Music2`, `AtSign`, `MapPin`, `Globe` cho Telegram/TikTok/Threads/Google Maps/Website/Bluesky, nên alias trước đó không làm thay đổi toàn bộ phần này.

Kế hoạch sửa:

1. Tạo nguồn icon social chuẩn dùng chung cho channel
- Mở rộng `src/components/icons/SocialIcons.tsx` nếu còn thiếu icon brand cần dùng trong form: TikTok, Threads, Telegram, Google Business/Maps, Facebook, Instagram, LinkedIn, YouTube, Zalo, X, Bluesky, Pinterest, Blogger, WordPress.
- Giữ nguyên 3 icon đã đúng: Pinterest, Blogger, WordPress.

2. Sửa trực tiếp form trong screenshot
- Trong `src/components/multichannel/MultiChannelFormWizard.tsx`, thay `channelIcons` cục bộ bằng icon brand SVG thật cho toàn bộ kênh social.
- Các kênh cần đổi rõ ràng trong màn hình này:
  - LinkedIn: `LinkedInIcon`
  - Threads: `ThreadsIcon`, không dùng `AtSign`
  - Telegram: `TelegramIcon`, không dùng `Send`
  - TikTok: `TikTokIcon`, không dùng `Music2`
  - YouTube: `YouTubeIcon`
  - Google Maps: `GoogleBusinessIcon` hoặc icon Google phù hợp hơn, không dùng `MapPin`
  - Bluesky: `BlueskyIcon`, không dùng `Globe`
  - Facebook/Instagram: dùng SVG brand trực tiếp, không phụ thuộc shim
  - Website/Blog và Email giữ icon UI generic nếu không có brand chính thức cụ thể.

3. Đồng bộ các form tạo nội dung đa kênh còn lại để tránh lệch UI
- Cập nhật `MultiChannelFormStepper.tsx` và `MultiChannelForm.tsx` vì cũng có `channelIcons` cục bộ tương tự.
- Mục tiêu: mọi biến thể của form tạo mới đều dùng cùng bộ brand icon, không bị phụ thuộc vào alias `lucide-react`.

4. Giảm rủi ro alias/shim không áp dụng
- Giữ alias hiện tại nếu không gây lỗi, nhưng không dựa vào nó cho màn hình này nữa.
- Import icon brand trực tiếp từ `@/components/icons/SocialIcons` để đảm bảo preview đổi ngay tại đúng component.

5. Kiểm tra sau sửa
- Kiểm tra bằng search rằng trong 3 form chính không còn dùng `AtSign`, `Send`, `Music2`, `MapPin`, `Globe` cho các social đã có icon brand.
- Kiểm tra giao diện bước “Kênh xuất bản” ở form Nội dung đa kênh: các icon trong screenshot đổi thành icon brand SVG đúng, đặc biệt Threads/Telegram/LinkedIn/Google Maps/Bluesky/TikTok/YouTube.