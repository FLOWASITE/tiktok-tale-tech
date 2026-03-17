

# Bổ sung thông tin kênh social vào Activity Timeline

## Ý tưởng

Hiện tại mỗi activity item chỉ hiển thị type label + thời gian. Cần bổ sung thông tin kênh social đã đăng (từ `content_publishing_logs`) để user thấy bài nào đã publish lên kênh nào ngay trên timeline.

## Kế hoạch

### 1. `src/pages/Dashboard.tsx`
- Fetch `content_publishing_logs` (action = 'published', org scope) để lấy mapping `content_id → channel[]`
- Thêm field `publishedChannels?: string[]` vào metadata của mỗi activity item
- Với mỗi multichannel content, lookup xem đã publish lên channel nào → gán vào `metadata.publishedChannels`

### 2. `src/components/dashboard/ActivityTimeline.tsx`
- Mở rộng `ActivityItem.metadata` thêm `publishedChannels?: string[]`
- Trong phần render mỗi item, nếu có `publishedChannels`, hiển thị các badge nhỏ (ví dụ: icon Twitter, Facebook...) bên cạnh label
- Dùng các icon tương ứng từ lucide hoặc badge text đơn giản cho mỗi channel

### 3. i18n
- Thêm key `publishedOn` = "Đã đăng" / "Published"

## UI hiển thị

Mỗi activity item sẽ có thêm dòng badges nhỏ bên dưới:
```text
┌─────────────────────────────────────┐
│ 🟣 Bài giới thiệu sản phẩm X      │
│   Đa kênh • 2 giờ trước            │
│   ✅ twitter  ✅ facebook           │
└─────────────────────────────────────┘
```

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Dashboard.tsx` | Fetch publishing logs, map channels vào metadata |
| `src/components/dashboard/ActivityTimeline.tsx` | Render published channel badges |
| `src/i18n/locales/vi.json` | Thêm 1 key |
| `src/i18n/locales/en.json` | Thêm 1 key |

