

## Chỉnh chu UI Kết nối mạng xã hội

### Vấn đề hiện tại (từ screenshot)

1. **Avatar thay thế hoàn toàn icon platform**: Khi Fanpage có avatar, icon Facebook (màu xanh) biến mất, thay bằng ảnh avatar → mất nhận diện kênh.
2. **Badge không đồng nhất**: "Đã xác thực" (xanh lá), "Đã kết nối" (xám), "Đã ngắt" (đỏ/xám) có style khác nhau, không thống nhất.

### Thay đổi

**1. Avatar + Platform icon overlay** (`BrandViewConnectionsTab.tsx`)
- Giữ avatar của tài khoản đã kết nối nhưng thêm icon platform nhỏ ở góc dưới-phải (overlay badge).
- Áp dụng cho cả `renderConnection`, `renderFbConnection`, và `renderWebsitePlatform`.

```text
Trước:  [Avatar ảnh page]  hoặc  [Icon Facebook]
Sau:    [Avatar ảnh page + icon FB nhỏ ở góc]  hoặc  [Icon Facebook] (khi chưa kết nối)
```

**2. Thống nhất Badge status**
- "Đã xác thực" → Badge xanh lá nhẹ với icon ShieldCheck (giữ nguyên)
- "Đã kết nối" → Badge xanh dương nhẹ với icon CheckCircle2 (thay vì secondary xám)
- "Đã ngắt" → Badge đỏ nhạt với icon Unplug (thống nhất style)
- Tất cả badge dùng cùng pattern: `bg-{color}-500/10 text-{color}-600 border-{color}-500/20`

### File cần sửa
- `src/components/brand/BrandViewConnectionsTab.tsx` — cả 3 render functions

