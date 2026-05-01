## Mục tiêu

Bổ sung một section mới trên Landing Page giới thiệu khả năng **kết nối & xuất bản đa kênh social** của Flowa, viết bằng giọng văn marketing (lợi ích, không liệt kê kỹ thuật).

## Vị trí trong Landing

Đặt ngay **sau `WorkflowSection`** và **trước `IndustryMemorySection`** trong `src/landing/pages/Landing.tsx`. Đây là điểm hợp lý vì:
- Sau khi user hiểu workflow ("Flowa làm gì") → cho thấy "đăng đi đâu" trước khi đi sâu vào Industry Memory.
- Tạo một beat trực quan (logo grid) giữa 2 section nặng chữ.

## Section mới: `SocialChannelsSection`

**File mới:** `src/landing/components/SocialChannelsSection.tsx`
**Export:** thêm vào `src/landing/components/index.ts`

### Nội dung & cấu trúc

```text
┌────────────────────────────────────────────────────────────┐
│  Eyebrow:  KẾT NỐI ĐA KÊNH                                  │
│  Headline: Một lần soạn — đăng khắp nơi khách hàng của bạn │
│  Sub:      16 nền tảng. Một workspace. Không copy-paste.    │
├────────────────────────────────────────────────────────────┤
│  [Grid 4×4 logo brand chính thức, hover lift + glow]        │
│   FB · IG · TikTok · YouTube                                │
│   LinkedIn · X · Threads · Pinterest                        │
│   Bluesky · Telegram · Zalo OA · Google Business            │
│   WordPress · Blogger · Website · Email                     │
├────────────────────────────────────────────────────────────┤
│  3 cột lợi ích (icon + headline + 1 dòng):                  │
│  • OAuth 1-click — Kết nối an toàn, token tự gia hạn        │
│  • Tự động tối ưu format — Mỗi kênh một độ dài, một tone   │
│  • Lên lịch & đăng tự động — Cron mỗi 2 phút, không miss   │
├────────────────────────────────────────────────────────────┤
│  CTA phụ: "Xem tất cả tích hợp →"  (scroll to pricing)     │
└────────────────────────────────────────────────────────────┘
```

### Copy đề xuất (VN, marketing tone)

- **Eyebrow:** `KẾT NỐI ĐA KÊNH` (uppercase, accent màu primary)
- **Headline (h2):** `Một lần soạn — đăng khắp nơi khách hàng của bạn ở`
- **Sub:** `16 nền tảng social & blog. Kết nối OAuth 1-click, tự động đăng đúng format từng kênh — bạn không cần mở 16 tab nữa.`
- **3 lợi ích:**
  1. **Kết nối an toàn 1-click** — `OAuth chính thức từ Meta, Google, LinkedIn, TikTok... Token tự refresh mỗi 30 phút, bạn không bao giờ phải đăng nhập lại giữa chiến dịch.`
  2. **Tối ưu format từng kênh** — `AI tự điều chỉnh độ dài, hashtag, CTA theo "thói quen" của Pinterest 2:3, X 280 ký tự, LinkedIn 150-400 chữ — đúng chuẩn native, không nhìn ra là AI.`
  3. **Lên lịch & đăng tự động** — `Đặt lịch trước cả tháng. Cron job chạy mỗi 2 phút đảm bảo bài đăng đúng giờ vàng — kể cả khi bạn đang ngủ.`

### Visual specs (Soft Luxury, theo memory)

- Background: `bg-background` với subtle radial gradient từ `primary/5`
- Logo grid: 4 cột (md), 2 cột (mobile), card `border-border/50 bg-card/50 backdrop-blur` — hover `border-primary/30 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.25)]`
- Logo dùng brand SVG **chính thức** từ `@/components/icons/SocialIcons` (đã có): `FacebookIcon`, `InstagramIcon`, `TikTokIcon`, `YouTubeIcon`, `LinkedInIcon`, `XIcon`, `ThreadsIcon`, `PinterestIcon`, `BlueskyIcon`, `TelegramIcon`, `ZaloIcon`, `GoogleBusinessIcon`, `WordPressIcon`, `BloggerIcon`. Email + Website dùng `Mail` / `Globe` lucide.
- Mỗi logo render với màu thương hiệu thật của nó (FB xanh, IG gradient, X đen, YT đỏ...) — đồng nhất với cách `streaming/ChannelIcon.tsx` đang làm.
- Animation: `framer-motion` stagger fade-up cho grid (delay 0.04s × index), respect `prefers-reduced-motion`.
- 3 cột lợi ích: icon trong vòng tròn `bg-primary/10 text-primary`, dùng lucide `ShieldCheck`, `Wand2`, `CalendarClock`.
- i18n: hardcode VN cho lần này (giữ nhất quán với các section landing khác cũng VN-first), nhưng wrap qua `useTranslation()` keys nếu các section lân cận đang dùng — kiểm tra nhanh khi implement.

### Tích hợp Landing.tsx

```tsx
// 1 import mới + 1 dòng JSX trong <main>:
<WorkflowSection />
<SocialChannelsSection />   {/* NEW */}
<IndustryMemorySection />
```

## Phạm vi files

- **Tạo mới:** `src/landing/components/SocialChannelsSection.tsx`
- **Sửa:** `src/landing/components/index.ts` (export thêm)
- **Sửa:** `src/landing/pages/Landing.tsx` (import + render)

Không động DB, không edge function, không touch app routes.
