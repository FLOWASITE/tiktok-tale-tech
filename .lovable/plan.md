

## Fix: Không chọn được kênh trên mobile trong SchedulePopoverButton

### Nguyên nhân
Mỗi channel button được wrap trong `TooltipProvider > Tooltip > TooltipTrigger`. Trên mobile (touch), Radix Tooltip intercept sự kiện touch đầu tiên để hiện tooltip → `onClick` của button bên trong không fire.

### Giải pháp
Bỏ `Tooltip` wrapper khỏi các channel buttons. Thay bằng `title` attribute đơn giản (hoạt động trên cả mobile và desktop) hoặc hiển thị label text nhỏ bên dưới icon.

### Thay đổi

**File: `src/components/carousel/SchedulePopoverButton.tsx` (lines 126-155)**

Thay thế `TooltipProvider > Tooltip > TooltipTrigger > button` bằng `button` trực tiếp với `title` attribute:

```tsx
<button
  key={ch}
  onClick={() => isConnected && setSelectedChannel(ch)}
  disabled={!isConnected}
  title={`${CHANNEL_LABELS[ch]}${!isConnected ? ' — Chưa kết nối' : ''}${existingSch ? ` — Đã lên lịch` : ''}`}
  className={cn(
    'w-8 h-8 rounded-full flex items-center justify-center transition-all relative',
    // ... same styles
  )}
>
  <Icon className="h-3.5 w-3.5" />
  {existingSch && (
    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
      <Clock className="h-2 w-2 text-white" />
    </span>
  )}
</button>
```

Bỏ import `TooltipProvider, Tooltip, TooltipTrigger, TooltipContent` nếu không dùng ở chỗ khác.

### Files thay đổi
- `src/components/carousel/SchedulePopoverButton.tsx` — bỏ Tooltip wrapper, dùng `title` attribute

