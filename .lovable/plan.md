## Vấn đề

Trong màn bạn chụp, khu vực slide social của Pinterest đang bị 2 lỗi:

1. Sidebar kênh đang hiển thị nhãn rút gọn `PIN` / `Pin`, trong khi bạn muốn hiển thị đầy đủ `Pinterest`.
2. Icon Pinterest trong header/sidebar đang dùng chữ `P` text đơn giản, không phải logo Pinterest thật.

Ngoài ra mockup Pinterest đã có component riêng trong `ChannelMockupFrame.tsx`, nhưng `ContentMockupToggle.tsx` vẫn đang map `pinterest` sang mockup `instagram`, nên có nguy cơ render sai kiểu mockup ở vùng preview.

## Kế hoạch sửa

1. **Sửa cấu hình Pinterest trong `MultiChannelViewer.tsx`**
   - Import thêm `PinterestIcon` từ `@/components/icons/SocialIcons`.
   - Đổi icon Pinterest từ:

```tsx
<span className="text-[#E60023] font-bold text-xs">P</span>
```

sang logo SVG thật:

```tsx
<PinterestIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
```

   - Đổi `shortLabel` từ `PIN` thành `Pinterest`, để sidebar bên trái hiển thị đầy đủ tên social.

2. **Sửa mapping mockup Pinterest trong `ContentMockupToggle.tsx`**
   - Đổi:

```ts
pinterest: 'instagram'
```

thành:

```ts
pinterest: 'pinterest'
```

   - Như vậy preview sẽ dùng đúng `PinterestMockup` đã có sẵn trong `ChannelMockupFrame.tsx`, không còn fallback sang Instagram mockup.

3. **Đồng bộ label ở list/card nếu còn thấy `Pin`**
   - Kiểm tra `MultiChannelListView.tsx` đang có `pinterest: 'Pin'`.
   - Đổi thành `Pinterest` để các card/danh sách nội dung đa kênh cũng thống nhất với yêu cầu “tên social viết đầy đủ là Pinterest”.

## Kết quả mong muốn

Sau khi sửa:

```text
Sidebar Kênh:
[logo Pinterest thật] Pinterest
0 từ
```

Header chính:

```text
[logo Pinterest thật] Pinterest
50–150 từ • 0 từ / 0 ký tự
```

Preview bên dưới sẽ render đúng mockup Pinterest thay vì style Instagram.