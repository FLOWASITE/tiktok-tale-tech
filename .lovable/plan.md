

# Hoàn thiện UI cài đặt Telegram ban đầu

## Phạm vi (đã chốt)
1. Polish toàn bộ `/agents/telegram` (spacing, copy, mobile 707px)
2. Thêm empty-state + onboarding tour cho user lần đầu
3. Thêm preview chat sample để user thấy AI trả lời thế nào trước khi link

## Layout mới (mobile-first 707px → desktop)

```text
┌──────────────────────────────────────────────────┐
│ Header card (gọn lại)                            │
│ [Send] Telegram Agent      [Sẵn sàng kết nối]   │
│ Chat tự nhiên với AI từ Telegram. Setup < 1 phút.│
└──────────────────────────────────────────────────┘

┌── ONBOARDING (chỉ hiện khi !userLinked) ────────┐
│  ✨ 3 bước để bắt đầu                            │
│  ① Bấm "Mở Telegram" → ② Start bot → ③ Chat     │
│                                                  │
│  ┌─ Preview: AI agent trả lời thế nào ─────────┐│
│  │ 👤 "tạo campaign cho spa Tết"               ││
│  │ 🤖 "Đã hiểu! Spa, dịp Tết, tone ấm áp.      ││
│  │     Tạo 5 bài đa kênh trong 2 phút..."      ││
│  │ 👤 "/status"                                ││
│  │ 🤖 "Quota: 12/30 campaign tháng này"        ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘

[ Banner default-bot — giữ nguyên, refine copy ]

[ TelegramLinkCard — đã có sẵn one-click button ]

┌── "Sau khi link, bạn có thể…" (thay COMMAND_GROUPS)─┐
│  💬 Chat tự nhiên     "tạo bài Facebook bán kem"   │
│  📊 Hỏi quota         "/status" hoặc "còn bao nhiêu"│
│  🎯 Tạo campaign      "/generate" hoặc mô tả tự do  │
│  ⏸  Quản lý pipeline  "/pause", "/resume"          │
│                                                     │
│  [▾ Xem tất cả lệnh]  ← accordion ẩn list cũ        │
└─────────────────────────────────────────────────────┘
```

## Thay đổi cụ thể

### A. `AgentTelegramPage.tsx`
- **Header card**: bỏ `CardHeader` to → 1 row gọn `[icon] Title + Badge` ở phải, description 1 dòng. Tiết kiệm ~80px chiều cao.
- **Onboarding section** (mới, chỉ render khi `!userLinked && !loadingAny`):
  - 3 bước numbered horizontal pills (mobile: stack)
  - `<ChatPreview />` component mới: 4 bubble mockup (user/bot xen kẽ), animation `animate-in fade-in slide-in-from-bottom-2` lệch 200ms mỗi bubble
  - Background gradient `from-primary/5 via-transparent`
- **Banner default-bot**: rút gọn còn 1 dòng `✨ Đang dùng @Flowa123bot (mặc định) · [Đổi bot riêng]` → click mở accordion BYOB
- **"Sau khi link bạn có thể"**: thay block `COMMAND_GROUPS` cứng → 4 use-case cards có icon + ví dụ chat tự nhiên (ưu tiên), accordion ẩn full command list bên dưới
- **StepSection**: bỏ luôn vì giờ chỉ còn 1 step thực sự (link). Gắn label "Bước cuối: kết nối tài khoản" inline thay vì step indicator rườm.

### B. `TelegramLinkCard.tsx` — refine
- Mobile 707px: nút primary đã full-width (giữ). Tăng `size="lg"` thành `h-12` để tap target rõ.
- "Scan QR" + "@botname" hiện đang nằm chung row — trên 707px vẫn ổn nhưng thêm `flex-wrap` để safe.
- State `prefetchError`: thêm icon AlertCircle bên trái, không chỉ text đỏ.
- Connected state: avatar bot (placeholder Send icon trong vòng tròn primary) thay `CircleDot` cho nhận diện rõ hơn.

### C. `ChatPreview.tsx` (component mới ~60 dòng)
- 4 bubble cứng (không call API), styled như Telegram:
  - User bubble: `bg-primary text-primary-foreground rounded-2xl rounded-br-sm` align right
  - Bot bubble: `bg-muted rounded-2xl rounded-bl-sm` align left, prefix `🤖`
- Sequence với `animation-delay` 0/200/400/600ms khi vào viewport (dùng `IntersectionObserver` 1 lần)
- Mobile: bubble max-width 85%; desktop 70%

### D. Copy refinement (Vietnamese)
| Hiện tại | Mới |
|---|---|
| "Chat tự nhiên với AI Agent từ Telegram — không cần gõ lệnh, bot tự hiểu để tạo campaign, báo quota, tư vấn marketing." | "Chat AI Agent ngay trong Telegram. Tạo campaign, hỏi quota, lên lịch — không cần mở app." |
| "Scan QR hoặc bấm 'Continue in Telegram' — kết nối < 1 phút." | "1 click → bấm Start trong Telegram → xong (< 30 giây)" |
| "Cấu hình Bot Telegram (tùy chỉnh)" | "Bot riêng của tổ chức (white-label)" |
| "Group tổ chức (tùy chọn)" | giữ |

### E. Mobile responsive checklist
- Viewport 707×662: header không wrap badge xuống dòng riêng
- Onboarding 3-pill: stack vertical < 640px
- ChatPreview: bubble không tràn, font 13px mobile / 14px desktop
- Use-case grid: 1 col < 640px, 2 col ≥ 640px
- Padding container: `px-4 sm:px-6` thay vì để default

## File thay đổi

| File | Loại | Mô tả |
|---|---|---|
| `src/pages/AgentTelegramPage.tsx` | refactor | Layout mới, onboarding, use-case cards |
| `src/components/agents/TelegramLinkCard.tsx` | tweak | Avatar bot, error icon, h-12 button mobile |
| `src/components/agents/ChatPreview.tsx` | mới | Mockup chat 4-bubble animated |
| `src/components/agents/TelegramUseCases.tsx` | mới | 4 use-case cards thay COMMAND_GROUPS cũ |

## Test E2E
1. `/agents/telegram` chưa link, viewport 707px → onboarding hiện, ChatPreview animate vào màn hình
2. ChatPreview 4 bubble fade-in tuần tự < 1s
3. Click "Mở Telegram" → Telegram open, sau Start → realtime morph sang connected state, onboarding ẩn
4. Connected state: avatar bot + bot username + last activity rõ ràng
5. Use-case cards 1 col mobile / 2 col tablet+
6. Accordion "Xem tất cả lệnh" mở ra full COMMAND_GROUPS như cũ
7. Banner default-bot 1 dòng, click "Đổi bot riêng" → accordion BYOB mở
8. Default-bot không có (offline/admin xoá) → fallback message rõ ràng "Liên hệ admin"

## Ước tính
**40-60 phút** — 2 component mới nhỏ, 1 page refactor, 1 card tweak. Không migration, không edge function.

## Rủi ro
- ChatPreview hardcode tiếng Việt — i18n sau, nhưng marketing chỉ VN nên OK
- IntersectionObserver fallback: nếu không support thì animate ngay khi mount (acceptable)
- Bỏ StepSection có thể làm admin BYOB flow hơi mất context → bù lại bằng accordion label rõ "Bot riêng (white-label)"

