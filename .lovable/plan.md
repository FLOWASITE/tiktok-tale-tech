

# Thêm Popup "Tạo nhanh" tự động hiện khi vào Step 2

## Ý tưởng
Khi user vào Step 2, một popup/tooltip nổi bật sẽ tự động xuất hiện bên cạnh toggle "Tạo nhanh", thu hút sự chú ý rồi tự đóng sau vài giây. User có thể click để bật toggle ngay từ popup.

## Chi tiết

### Trong `MultiChannelFormWizard.tsx`:
- Wrap toggle Card bằng `Popover` (từ radix, đã có sẵn)
- Popover tự động mở khi `currentStep === 2` lần đầu (dùng `useEffect` + state `showFastCreatePopup`)
- Tự đóng sau 6 giây hoặc khi user tương tác
- Nội dung popup:
  - Icon `Zap` + gradient background
  - Tiêu đề: **"⚡ Muốn tạo nhanh hơn?"**
  - Mô tả ngắn: "Bỏ qua Core Content — AI tạo trực tiếp cho từng kênh từ chủ đề"
  - Nút CTA: **"Bật tạo nhanh"** → bật `skipCoreContent` + đóng popup
  - Nút phụ: "Để sau" → đóng popup
- Không hiện popup nếu đã có Core Content hoặc đang generate

### Files cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — thêm Popover wrap quanh toggle card

