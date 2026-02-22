

# Thêm ký hiệu ảnh/không ảnh theo từng kênh trên card nội dung

## Mô tả

Hiện tại, card nội dung chỉ hiển thị tổng số ảnh chung (ví dụ: "3" với icon Image). Thay đổi này sẽ hiển thị trực tiếp trên mỗi channel icon xem kênh đó đã có ảnh hay chưa.

## Thay đổi

### File: `src/components/MultiChannelCard.tsx`

1. **Cập nhật phần Channel icons (dòng 237-271)**: Thêm ký hiệu nhỏ cho mỗi channel icon:
   - Nếu channel có ảnh trong `channel_images`: hiển thị icon Image nhỏ (hoặc dot xanh lá) ở góc dưới bên trái của channel icon
   - Nếu channel không có ảnh: không hiển thị gì thêm (giữ nguyên)

2. **Cập nhật Tooltip**: Thêm dòng "Có ảnh" / "Chưa có ảnh" vào tooltip của mỗi channel

3. **Giữ nguyên badge tổng số ảnh** ở Meta Badges Row (dòng 212-216) nhưng không bắt buộc - có thể bỏ vì thông tin đã hiển thị trên từng channel icon

## Chi tiết kỹ thuật

Trong phần render channel icons, kiểm tra `content.channel_images?.[channel]` để xác định channel đó có ảnh hay không:

```text
+-- Channel icon container --------+
|  [Facebook icon]                 |
|  [status dot: top-right]         |
|  [image dot: bottom-left]        |  <-- Thêm mới: dot nhỏ màu violet nếu có ảnh
+----------------------------------+
```

- Dot ảnh: `w-1.5 h-1.5 rounded-full bg-violet-400` đặt ở vị trí `absolute -bottom-0.5 -left-0.5`
- Tooltip cập nhật thêm dòng trạng thái ảnh

Không cần thay đổi database hay logic backend - chỉ thay đổi hiển thị UI.

