

# Chuyển Channel Group View sang giao diện Tabs

## Mô tả
Thay thế layout collapsible sections hiện tại bằng Tabs — mỗi tab là một kênh social. Người dùng click vào tab Facebook/X/Instagram... để xem ngay nội dung của kênh đó mà không cần cuộn.

## Layout mới

```text
┌──────────────────────────────────────────────────┐
│ [🔵 Facebook (3)] [⬛ X (2)] [📷 Instagram (1)] │  ← Tab bar cuộn ngang
├──────────────────────────────────────────────────┤
│ @MyPage • Đã kết nối        [Đăng tất cả] [Lịch]│  ← Header kênh đang chọn
│ 1 đã đăng | 1 duyệt | 1 nháp                    │
├──────────────────────────────────────────────────┤
│ [Card] [Card] [Card]                             │  ← Grid bài của kênh
└──────────────────────────────────────────────────┘
```

## Thay đổi

### `src/components/multichannel/ChannelGroupView.tsx`
- Thay `Collapsible` + scroll bằng `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` (đã có sẵn trong project)
- TabsList cuộn ngang, mỗi TabsTrigger chứa `ChannelIcon` + label + badge count
- Áp dụng brand color cho trigger đang active
- TabsContent chứa: connection info + action buttons + grid cards (giữ nguyên logic hiện tại)
- Default tab = kênh có nhiều bài nhất
- Bỏ `Collapsible`, `Separator`, `ChevronDown` imports
- Giữ nguyên tất cả props, logic `getConnection`, `getStatusCounts`, `getEligibleCount`

### Không cần sửa file khác
`MultiChannel.tsx` và `MultiChannelHeroSection.tsx` không thay đổi — chỉ thay layout bên trong component.

## Chi tiết kỹ thuật

- Dùng `Tabs` từ `@/components/ui/tabs` (Radix-based, đã có)
- TabsList: `overflow-x-auto flex-wrap` cho responsive, mỗi trigger có `ChannelIcon size="sm"` + label + count badge
- Active tab styling: dùng `data-[state=active]` kết hợp brand color từ `CHANNEL_COLORS`
- Default value: `channelGroups[0].channel` (kênh nhiều bài nhất do đã sort)

