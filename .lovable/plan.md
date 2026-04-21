# Refactor "Nhận Agent của bạn" thành hub chọn channel

## Mục tiêu

Thay vì click "Nhận Agent của bạn" → vào thẳng Telegram page, sẽ vào trang **hub** liệt kê 3 channel: Telegram , Slack (Soon), Zalo (Soon). User chọn channel → vào trang config tương ứng.

Layout giống ảnh Manus: list dạng card mỗi row có icon + tên channel bên trái, status badge "Đã kết nối" / button "Kết nối" bên phải.

## Thay đổi

### 1. Tạo page mới `src/pages/AgentChannelHubPage.tsx`

- Header: "Nhận Agent của bạn" + sub "Chọn nền tảng để chat với AI Agent"
- Card list (3 row):
  - **Telegram**: icon Send (xanh), check `useTelegramBinding` → nếu có binding hiện badge "Đã kết nối" (green); nếu không hiện button "Kết nối" → navigate `/agents/telegram`
  - **Slack**: icon Slack (lucide), badge "Sắp ra mắt" (secondary), disabled
  - **Zalo**: icon `ZaloIcon` từ `@/components/icons/SocialIcons`, badge "Sắp ra mắt", disabled
- Click vào row Telegram (hoặc button) → navigate `/agents/telegram`
- Style: dùng `Card` shadcn, divider giữa rows, hover bg-muted/30 cho row clickable, opacity-60 cho row coming-soon

### 2. Routing `src/app/routes.tsx`

- Thêm route `/agents/channels` → `AgentChannelHubPage` (lazy)
- Giữ nguyên `/agents/telegram` (đã có)

### 3. Sidebar `src/components/AppSidebar.tsx`

- Đổi URL của item "Nhận Agent của bạn" từ `/agents/telegram` → `/agents/channels`
- **Xóa** item Slack đã thêm trước đó (vì giờ Slack nằm trong hub)

### 4. i18n `src/i18n/locales/{vi,en,th}.json`

- Xóa key `app.sidebar.slackAgent` (không còn dùng)
- Thêm keys cho hub page (optional nếu muốn i18n đầy đủ):
  - `agentHub.title`: "Nhận Agent của bạn" / "Get your Agent" / "รับ Agent ของคุณ"
  - `agentHub.subtitle`: "Chọn nền tảng để chat với AI Agent" / ... / ...
  - `agentHub.connected`: "Đã kết nối" / "Connected" / "เชื่อมต่อแล้ว"
  - `agentHub.connect`: "Kết nối" / "Connect" / "เชื่อมต่อ"
  - `agentHub.comingSoon`: "Sắp ra mắt" / "Coming soon" / "เร็วๆ นี้"

### 5. Optional: back link trên `AgentTelegramPage`

- Thêm 1 nút "← Quay lại" ở header trỏ về `/agents/channels` để UX vòng tròn rõ ràng. Không bắt buộc.

## File thay đổi


| File                                | Loại                                        |
| ----------------------------------- | ------------------------------------------- |
| `src/pages/AgentChannelHubPage.tsx` | mới                                         |
| `src/app/routes.tsx`                | thêm route `/agents/channels`               |
| `src/components/AppSidebar.tsx`     | đổi URL Telegram → channels, xóa item Slack |
| `src/i18n/locales/vi.json`          | xóa slackAgent, thêm agentHub.*             |
| `src/i18n/locales/en.json`          | tương tự                                    |
| `src/i18n/locales/th.json`          | tương tự                                    |
| `src/pages/AgentTelegramPage.tsx`   | (optional) thêm back link                   |


## Test E2E

1. Sidebar click "Nhận Agent của bạn" → vào `/agents/channels`, thấy 3 card: Telegram, Slack, Zalo
2. User chưa link Telegram → row Telegram hiện button "Kết nối" → click → vào `/agents/telegram` flow link bình thường
3. User đã link → row Telegram hiện badge "Đã kết nối" (green) thay vì button
4. Slack & Zalo: badge "Sắp ra mắt", click không có effect (disabled)
5. Sidebar không còn item Slack riêng — chỉ còn 1 item "Nhận Agent của bạn"
6. Mobile 707px: card stack đẹp, icon + label không bị crop, badge/button align right
7. Switch EN/TH: labels dịch đúng

## Ước tính

**12-18 phút** — 1 page mới, 1 route, 1 sidebar update, 3 file i18n.

## Rủi ro

- Bookmark cũ `/agents/telegram` vẫn hoạt động (không break).
- Nếu user vào thẳng `/agents/telegram` không qua hub, vẫn OK (page self-contained).