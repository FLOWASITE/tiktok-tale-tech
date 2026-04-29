## Vấn đề xác định

Trong ảnh bạn khoanh đúng khu vực **Kênh** trên card nội dung đa kênh. File đang render khu vực này là:

- `src/components/MultiChannelCard.tsx`

Hiện tại component này vẫn dùng mapping cục bộ cũ:

```ts
blogger: <Globe ... />
wordpress: <Globe ... />
pinterest: <Instagram ... />
```

Vì vậy trên card:
- Pinterest đang hiện icon Instagram sai.
- Blogger/WordPress đang hiện icon globe sai.
- Các ô kênh đang dùng màu generic xanh/hồng thay vì màu brand thật.

## Cách sửa

1. **Refactor `MultiChannelCard.tsx` dùng `ChannelIcon` chung**
   - Import `ChannelIcon` từ `src/components/multichannel/streaming/ChannelIcon.tsx`.
   - Bỏ `channelIcons` mapping cục bộ cho phần card, hoặc chỉ giữ nếu còn dùng chỗ khác.
   - Khi render mỗi channel ở dòng icon, dùng:

```tsx
<ChannelIcon channel={channel} size="sm" />
```

2. **Loại bỏ nền/màu cũ gây sai nhận diện**
   - Không dùng `channelColors[channel]` cho Pinterest/Blogger/WordPress nữa vì nó đang ép:
     - Pinterest = màu Instagram/pink
     - Blogger/WordPress = màu website/blue generic
   - Chuyển ô chứa channel thành nền trung tính theo style Soft Luxury:

```tsx
bg-background/70 border-border/60 hover:bg-muted/50
```

   - `ChannelIcon` tự xử lý màu brand bên trong:
     - Pinterest đỏ `#E60023`
     - Blogger cam `#FF5722`
     - WordPress xanh `#21759B`

3. **Giữ nguyên dot trạng thái và dot ảnh**
   - Dot trên phải vẫn báo trạng thái từng kênh.
   - Dot dưới trái vẫn báo có ảnh.
   - Chỉ thay phần logo bên trong, không đổi logic dữ liệu.

4. **Tooltip hiển thị label chuẩn hơn**
   - Dùng `getChannelLabel(channel)` để tooltip hiện:
     - Pinterest
     - Blogger
     - WordPress
     - Google Maps
     - Zalo OA
   - Không còn hiển thị key thô như `google_maps`, `zalo_oa` nếu có.

5. **Kiểm tra các card/list liên quan nếu còn mapping cũ**
   - Tìm thêm các component render card danh sách tương tự, đặc biệt:
     - `MultiChannelListView.tsx`
     - `BulkScheduleDialog.tsx`
     - `ApprovalDialog.tsx`
   - Nếu chúng cũng đang dùng `Globe`/`Instagram` cho Pinterest/Blogger/WordPress thì đồng bộ sang `ChannelIcon` để không bị sai ở màn khác.

## Kết quả mong muốn

Sau khi sửa, khu vực bạn khoanh sẽ hiển thị icon thật/brand đúng:

```text
KÊNH
[ Facebook thật ] [ Pinterest đỏ P ] [ Blogger cam B ] [ WordPress xanh W ] ...
```

Không còn trường hợp Pinterest hiện icon Instagram hoặc Blogger/WordPress hiện quả địa cầu.