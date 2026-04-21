

# Gọn gàng hóa Telegram Agent page (connected state)

## Tình trạng hiện tại (theo screenshot)
Khi đã kết nối, page có quá nhiều khối lặp nội dung trên 1 viewport:
1. Header "Telegram Agent" + status badge
2. Banner "Đang dùng bot mặc định @Flowa123bot" + nút "Đổi bot riêng"
3. Card "AI Agent đang lắng nghe trên @Flowa123bot · mặc định" + Chat ID + Mở chat / Test ping / Gỡ
4. Hint "Chat tự nhiên: tạo campaign cho spa…"
5. Accordion "Group tổ chức"
6. Section "Sau khi link, bạn có thể…" + 4 use case card
7. Accordion "Xem tất cả lệnh"

→ Bot username lặp 3 lần (header banner, card title, hint mặc định). Khoảng cách lớn, hint command chiếm chỗ trùng với section use-case bên dưới.

## Nguyên tắc dọn
- 1 ý chỉ nói 1 lần.
- Các action phụ (Test ping, Gỡ) → ẩn vào dropdown menu (kebab `⋯`).
- Banner default-bot và badge "mặc định" trong card → gộp lại thành 1 dòng meta nhỏ dưới title card, không còn banner riêng.
- Hint "Chat tự nhiên: tạo campaign…" trong card → bỏ (đã có hẳn section "Sau khi link, bạn có thể…" phía dưới với 4 use case rõ ràng hơn).
- Section "Sau khi link…" → đổi heading thành "Gợi ý nhanh" + grid gọn lại (không cần subtitle dài).
- Group accordion + Commands accordion → giữ nguyên (đã collapse mặc định, không chiếm chỗ).

## Thay đổi cụ thể

### 1. `src/pages/AgentTelegramPage.tsx`
- **Xoá** banner "Đang dùng bot mặc định @… · Đổi bot riêng" (block `usingDefaultBot &&`). Thay bằng: nếu admin + dùng default bot → đặt 1 link nhỏ "Dùng bot riêng (white-label)" ở góc phải header (cùng dòng badge status), click mở dialog chứa `<TelegramBotConfigCard />`. Non-admin: không thấy gì cả.
- **Xoá** subtitle "Chat AI Agent ngay trong Telegram. Setup < 1 phút." khi đã kết nối (chỉ giữ khi `showOnboarding`). Khi connected, subtitle redundant.
- Onboarding section + ChatPreview: giữ nguyên (chỉ hiện khi chưa link).

### 2. `src/components/agents/TelegramLinkCard.tsx` (connected state)
- Card title row: giữ "AI Agent đang lắng nghe trên @bot". **Bỏ** badge "mặc định" inline (đã thể hiện qua link "white-label" ở header).
- **Bỏ** dòng meta `Chat ID: 8709703794 · Hoạt động 26 phút trước` → rút thành 1 dòng nhỏ chỉ "Hoạt động 26 phút trước" (Chat ID là technical, ẩn vào tooltip trên dot pulse).
- Action row: giữ **chỉ "Mở chat"** là button primary. "Test ping" + "Gỡ" → gộp vào `DropdownMenu` với trigger là icon button `⋯` (MoreHorizontal) bên cạnh.
- **Xoá hẳn block hint** "Chat tự nhiên: tạo campaign cho spa, quota tháng này, hoặc gõ /campaign, /pause" (lines 261-268) — duplicate với section use-case bên dưới.

### 3. `src/components/agents/TelegramUseCases.tsx`
- Heading "Sau khi link, bạn có thể…" → đổi thành **"Gợi ý nhanh"**, bỏ subtitle dài "Chat tự nhiên — hoặc dùng lệnh gõ nhanh nếu thích."
- Grid 4 card: giảm padding `p-3` → `p-2.5`, gap `2.5` → `2`. Giữ icon + title + example (ngắn).

## Kết quả mong đợi (connected state)
```
┌─ Telegram Agent                              [Đã kết nối] [Dùng bot riêng] ─┐
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ ●  AI Agent đang lắng nghe trên @Flowa123bot                           │  │
│ │    Hoạt động 26 phút trước                                             │  │
│ │                                                                         │  │
│ │  [Mở chat]  [⋯]                                                        │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ▸ Group tổ chức (tùy chọn)                              [Chưa link]         │
│                                                                              │
│ Gợi ý nhanh                                                                  │
│ ┌────────────────┐ ┌────────────────┐                                       │
│ │ 💬 Chat tự nhiên│ │ 📊 Hỏi quota   │                                       │
│ └────────────────┘ └────────────────┘                                       │
│ ┌────────────────┐ ┌────────────────┐                                       │
│ │ 🎯 Tạo campaign│ │ ⏸ Quản lý      │                                       │
│ └────────────────┘ └────────────────┘                                       │
│                                                                              │
│ ▸ Xem tất cả lệnh                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

→ Vertical chiều dài giảm ~35-40%, bot username chỉ xuất hiện 1 lần, không có CTA trùng lắp.

## File thay đổi

| File | Loại |
|---|---|
| `src/pages/AgentTelegramPage.tsx` | bỏ banner default-bot + subtitle khi connected, thêm link "white-label" ở header (admin) mở dialog |
| `src/components/agents/TelegramLinkCard.tsx` | rút meta line, gộp Test ping + Gỡ vào DropdownMenu, xoá hint block |
| `src/components/agents/TelegramUseCases.tsx` | rút heading + spacing |

## Test E2E
1. Connected + default bot + non-admin: chỉ thấy 1 card lắng nghe + 1 nút "Mở chat" + kebab menu, không thấy banner "default bot"
2. Connected + admin: header có link nhỏ "Dùng bot riêng" → click mở dialog config (Accordion cũ converted thành dialog hoặc giữ inline tuỳ implementation gọn)
3. Click kebab `⋯`: thấy 2 mục "Test ping" + "Gỡ kết nối"
4. Chưa connected (onboarding): giữ nguyên 3-step strip + ChatPreview như cũ
5. Mobile 798px: card không tràn, kebab menu mở đúng vị trí

## Ước tính
**8-12 phút** — 3 file UI, không đụng logic/data.

## Rủi ro
Không. Chỉ refactor visual; binding logic, deeplink prefetch, realtime subscription giữ nguyên 100%.

