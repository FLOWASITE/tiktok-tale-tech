

# Bỏ 3 section thừa khỏi Telegram Agent page

## Mục tiêu
Loại bỏ 3 section không cần thiết khỏi `/agents/telegram` (connected state):
1. **"Gợi ý nhanh"** (4 use case cards)
2. **"Xem tất cả lệnh"** (accordion commands)
3. **"Group tổ chức"** (accordion link group)

→ Page chỉ còn header + card "AI Agent đang lắng nghe" + (admin) link white-label. Tối giản tối đa.

## Thay đổi

### 1. `src/pages/AgentTelegramPage.tsx`
- **Xoá** dòng `<TelegramUseCases />` ở cuối component.
- Xoá import `TelegramUseCases`.

### 2. `src/components/agents/TelegramLinkCard.tsx`
- **Xoá** block accordion "Group tổ chức (tùy chọn)" + badge "Chưa link" / "Đã link" liên quan.
- Xoá import accordion components nếu không còn dùng chỗ khác trong file.
- Giữ nguyên: card chính (dot pulse + bot username + meta + Mở chat + kebab menu).

### 3. `src/components/agents/TelegramUseCases.tsx`
- **Không xoá file** (giữ để dễ revert sau này nếu user đổi ý). Chỉ ngừng import/render.

## Kết quả mong đợi (connected state)
```
┌─ Telegram Agent              [Đã kết nối] [Dùng bot riêng] ─┐
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ●  AI Agent đang lắng nghe trên @Flowa123bot             ││
│ │    Hoạt động 26 phút trước                               ││
│ │                                                            ││
│ │  [Mở chat]  [⋯]                                          ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## File thay đổi

| File | Loại |
|---|---|
| `src/pages/AgentTelegramPage.tsx` | bỏ render `<TelegramUseCases />` + import |
| `src/components/agents/TelegramLinkCard.tsx` | bỏ accordion group + cleanup imports |

## Test E2E
1. Connected: chỉ thấy header + 1 card chính, không còn 3 section bên dưới
2. Onboarding (chưa link): vẫn giữ 3-step strip + ChatPreview + card link
3. Mobile 707px: layout không lỗi

## Ước tính
**3-5 phút** — 2 file, chỉ xoá render.

## Rủi ro
Không. Logic binding/realtime/deeplink giữ nguyên 100%.

