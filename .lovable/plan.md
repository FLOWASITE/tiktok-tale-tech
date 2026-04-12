

# Nâng cấp Toggle "Tạo nhanh" & "AI Agent" — Premium Style

## Thay đổi

### Toggle buttons hiện tại
- Dùng emoji text đơn giản: `⚡ Tạo nhanh` và `🤖 AI Agent`
- Style pill button cơ bản

### Toggle buttons mới — Premium
- Thay emoji bằng **Lucide icons** (`Zap` và `Bot`) render trong circle nhỏ có gradient background
- Thêm **subtitle nhỏ** dưới label chính (Quick: "Nội dung đa kênh", Agent: "Chiến dịch tự động")
- Active state: gradient background thay vì solid `bg-primary`, icon glow nhẹ
- Inactive state: border subtle, icon muted
- Toggle container: thêm border + shadow nhẹ thay vì chỉ `bg-muted`
- Kích thước lớn hơn, padding thoáng hơn

### Kết quả visual
```text
┌──────────────────────────────────────────────┐
│  [🔥 Tạo nhanh        ]  [ 🤖 AI Agent       ] │
│  [ Nội dung đa kênh   ]  [ Chiến dịch tự động ] │
└──────────────────────────────────────────────┘
```

- Active tab: bg gradient primary, white text, icon trong circle sáng, shadow
- Inactive tab: transparent, muted text, icon mờ

## i18n updates
- Thêm `toggleQuickSub` và `toggleAgentSub` cho subtitle
- Bỏ emoji khỏi `toggleQuick` / `toggleAgent` (icon render riêng)

## Files thay đổi
- `src/landing/components/WorkflowSection.tsx` — nâng cấp toggle UI
- `src/i18n/locales/vi.json` — sửa toggle labels, thêm subtitles
- `src/i18n/locales/en.json` — tương tự
- `src/i18n/locales/th.json` — tương tự

