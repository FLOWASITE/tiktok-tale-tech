

## Fix: Hiển thị đủ 5 nút publish social (kể cả chưa kết nối)

### Vấn đề
`availableChannels` (line 353-359) lọc bỏ các platform chưa có active connection → LinkedIn và TikTok không hiện nút.

### Giải pháp
Hiển thị tất cả 5 nút publish luôn. Với platform chưa kết nối: hiện nút disabled/greyed out kèm tooltip "Chưa kết nối".

### Thay đổi

**File: `src/components/CarouselViewer.tsx`**

1. Bỏ filter active connections khỏi `availableChannels` — trả về tất cả 5 channels:
```typescript
const availableChannels = useMemo(() => {
  return getChannelsForPlatform(carousel?.platform || 'facebook');
}, [carousel?.platform]);
```

2. Tạo set `connectedChannels` riêng để truyền xuống:
```typescript
const connectedChannels = useMemo(() => {
  const active = socialConnections?.filter(c => c.is_active) || [];
  return new Set(active.map(c => c.platform));
}, [socialConnections]);
```

3. Khi render `DirectPublishButton`, truyền thêm prop `disabled` nếu channel không nằm trong `connectedChannels`

**File: `src/components/social/DirectPublishButton.tsx`**

4. Nhận prop `disabled` / `isConnected`. Nếu chưa kết nối:
   - Hiện nút mờ (opacity-50) với text "Kết nối"
   - Click → navigate tới trang brand connections

### Files thay đổi
- `src/components/CarouselViewer.tsx` — bỏ filter, thêm connectedChannels set
- `src/components/social/DirectPublishButton.tsx` — xử lý trạng thái chưa kết nối

