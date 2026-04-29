## Vấn đề

Trong screenshot màn "Kênh xuất bản" (component `MultiChannelFormWizard.tsx`):
- **X (Twitter)** đang dùng icon chim Twitter cũ (`Twitter` từ lucide) thay vì logo X.
- **WordPress** và **Blogger** đang dùng icon `Globe` chung chung, không nhận diện được brand.

Ngoài ra, các nơi khác (`MultiChannelForm.tsx`, `MultiChannelFormStepper.tsx`, `ChannelIcon.tsx`) cũng đang dùng `Globe` cho WordPress/Blogger → cần đồng bộ.

## Giải pháp

### 1. Tạo SVG brand icon mới trong `src/components/icons/SocialIcons.tsx`
Bổ sung 2 icon còn thiếu (X đã có sẵn `XIcon`):
- `WordPressIcon` — chữ "W" trong vòng tròn (logo chính thức WordPress).
- `BloggerIcon` — chữ "B" trong vòng vuông bo góc màu cam (logo Blogger).

Cả hai dùng `currentColor` để có thể tô màu qua className giống `ZaloIcon`/`XIcon`.

### 2. Cập nhật map `channelIcons` ở 3 file để dùng icon đúng

| Channel | Icon mới |
|---|---|
| `twitter` | `XIcon` (đã có) |
| `wordpress` | `WordPressIcon` (mới) |
| `blogger` | `BloggerIcon` (mới) |

Files cần sửa:
- `src/components/multichannel/MultiChannelFormWizard.tsx` (line 187-202) — file đang hiển thị trong screenshot
- `src/components/multichannel/MultiChannelFormStepper.tsx` (line 154-169) — wordpress/blogger còn `Globe`
- `src/components/MultiChannelForm.tsx` (line 49-64) — wordpress/blogger còn `Globe`

### 3. Cập nhật `ChannelIcon.tsx` (component dùng chung cho streaming/preview cards)
Thêm entry `wordpress` và `blogger` vào `channelConfig` với icon mới + màu nền brand:
- `wordpress`: nền `bg-[#21759B]` (xanh WordPress) + `WordPressIcon`
- `blogger`: nền `bg-[#FF8000]` (cam Blogger) + `BloggerIcon`
- Đổi entry `twitter`/`x` đảm bảo dùng `XLucide` (đã đúng).

### 4. (Optional cleanup) Loại import `Twitter` cũ
Sau khi thay xong trong `MultiChannelFormWizard.tsx`, xóa import `Twitter` từ lucide-react ở file này (nếu không còn dùng chỗ khác).

## Phạm vi không đụng tới
- Logic chọn kênh, collapse `wordpress/blogger → website` trong edge function — giữ nguyên.
- Color tokens semantic — chỉ icon thay đổi, các badge `text-blue-500` etc. giữ nguyên (đã hợp design system pink/rose của screenshot).

## Kết quả mong đợi
Trong card "Kênh xuất bản":
- WordPress hiển thị logo "W" tròn thay vì globe.
- Blogger hiển thị logo "B" vuông cam thay vì globe.
- X (Twitter) hiển thị logo X đen thay vì chim Twitter xanh.
