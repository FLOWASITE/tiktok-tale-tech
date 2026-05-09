# Bổ sung mô tả chi tiết về TikTok (và các social platform) vào Privacy Policy

## Tình trạng hiện tại

Trang `https://flowa.one/privacy` **đã tồn tại** (`src/landing/pages/PrivacyPolicy.tsx`), với 10 sections.

TikTok hiện chỉ được nhắc **rất chung chung** ở 2 chỗ:
- Section 2.3 — liệt kê chung "Facebook, Instagram, LinkedIn, TikTok…" trong "Thông tin từ bên thứ ba"
- Section 4.1 — "Mã hóa AES-256 cho token mạng xã hội"

→ **Không đủ** để TikTok auditor thấy rõ "app này lưu những field nào của TikTok, dùng vào việc gì, lưu bao lâu". TikTok review thường yêu cầu privacy policy phải mention rõ ràng tên platform + cụ thể field stored + purpose + retention.

## Đề xuất sửa

Thêm **1 section mới giữa section 4 và section 5** (đánh số lại 5,6,7,…), tiêu đề:

> **5. Dữ liệu từ kết nối Mạng xã hội (TikTok, Facebook, Instagram, LinkedIn, X/Twitter, Threads, Pinterest, Bluesky, Zalo OA, Google Business Profile)**

Nội dung chia 4 tiểu mục:

### 5.1. Dữ liệu thu thập từ TikTok (mô tả chi tiết — TikTok yêu cầu)
Liệt kê đúng theo những gì code `publish-tiktok` + `tiktok-oauth-callback` thực sự lưu:
- **OAuth tokens**: `access_token`, `refresh_token` (mã hóa AES-256-GCM, cột `social_connections.access_token` / `refresh_token`), `expires_in` → `token_expires_at`, `open_id`, `scope`
- **Profile (display only)**: `display_name`, `username`, `avatar_url` — chỉ để hiển thị trong UI quản lý kết nối
- **Publish tracking**: `publish_id` lưu trong `content_publishing_logs.external_post_id`; status (`PUBLISH_COMPLETE`, `PROCESSING_DOWNLOAD`, …) lưu trong `details`; fail_reason lưu trong `error_message`
- **KHÔNG lưu**: video content, comments, follower lists, hashtag analytics, hay bất kỳ user-generated data nào khác từ TikTok

### 5.2. Dữ liệu thu thập từ các nền tảng khác (FB, IG, LinkedIn, X, Threads, Pinterest, Bluesky, Zalo OA, GBP)
Mô tả ngắn gọn (1 dòng/platform): cũng là OAuth tokens (encrypted) + basic profile (display name/username/avatar) + publish logs.

### 5.3. Mục đích sử dụng
- Đăng nội dung do user tạo lên các kênh đã được user chủ động kết nối
- Hiển thị trạng thái post (đã đăng/lỗi) trong dashboard
- Refresh token tự động (qua pg_cron 30 phút) để duy trì kết nối

### 5.4. Thời gian lưu trữ + quyền xóa
- Token được giữ chừng nào kết nối còn active
- Khi user nhấn "Disconnect" → tokens bị xóa khỏi DB ngay lập tức
- `content_publishing_logs` được giữ 90 ngày phục vụ audit & debug, sau đó anonymize
- User có thể yêu cầu xóa toàn bộ qua email `support@flowa.one`

### 5.5. Compliance với chính sách của từng nền tảng
- Tuân thủ TikTok Developer Terms of Service, Facebook Platform Terms, LinkedIn API TOS, X Developer Agreement, …
- Không transfer / sell / share token với bên thứ 3
- Không lưu data ngoài những field liệt kê ở 5.1, 5.2

## Sửa thêm các section khác cho nhất quán

- **Section 6 (cũ là 5) — Quyền của bạn**: thêm bullet "Quyền ngắt kết nối mạng xã hội bất kỳ lúc nào tại trang Connections, token sẽ bị xóa ngay"
- **Section 8 (cũ là 7) — Thời gian lưu trữ**: thêm dòng "Social media tokens: xóa ngay khi user disconnect; publishing logs: 90 ngày sau đó anonymize"
- **Updated date**: đổi từ "17 tháng 4, 2026" → "9 tháng 5, 2026"

## File cần sửa
- `src/landing/pages/PrivacyPolicy.tsx` — thêm 1 entry vào array `sections` (giữa index 3 và 4), đánh số lại các section sau, đổi `Cập nhật lần cuối`

## SEO + URL không đổi
Route `/privacy` giữ nguyên, không cần migration / redirect.

## Câu hỏi xác nhận
1. Em soạn nội dung **bằng tiếng Việt** (giống các section hiện tại) hay **song ngữ Việt + English** (TikTok auditor là English speaker, nhiều khả năng họ sẽ Google Translate — bản thuần Việt là chấp nhận được, nhưng song ngữ giúp audit nhanh hơn)?
2. Có cần **trang riêng `/privacy/tiktok`** chuyên biệt cho TikTok (một số app submit audit dùng cách này) hay chỉ cần section 5 trong trang chính là đủ?
