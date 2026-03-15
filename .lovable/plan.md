

## Nâng cấp vị trí nút "Tạo ảnh" — nổi bật và dễ thấy hơn

### Hiện trạng
Nút "Tạo ảnh AI" ở Step 6 nằm trong một Card dashed border giữa content area — dễ bị lẫn với các phần khác, đặc biệt trên viewport nhỏ (707px) phải scroll mới thấy.

### Giải pháp: Sticky CTA bar ở cuối Step 6

**File: `src/components/multichannel/MultiChannelFormWizard.tsx`**

1. **Khi `imagePhase === 'idle'` ở Step 6**: Thay thế Card dashed hiện tại bằng một **sticky bottom bar** nổi bật:
   - `sticky bottom-0` với gradient background (`bg-gradient-to-t from-background via-background to-transparent`)
   - Nút "Tạo ảnh AI" kích thước `lg`, full-width trên mobile, với hiệu ứng `glow-primary` + `animate-pulse` nhẹ
   - Kèm icon Sparkles lớn hơn và badge hiện số kênh
   - Nút "Bỏ qua" thu nhỏ thành text link bên dưới

2. **Visual hierarchy**: Nút tạo ảnh sẽ có:
   - Background gradient nổi bật (gradient-primary)
   - Shadow lớn (`shadow-lg shadow-primary/25`)
   - Padding generous, font size lớn hơn
   - Một dòng text phụ phía trên: "🎨 Mọi thứ đã sẵn sàng!"

3. **Giữ nguyên Card info phía trên** (danh sách kênh, mode AI) nhưng bỏ nút khỏi Card — chuyển nút xuống sticky bar.

### Phạm vi
- 1 file: `src/components/multichannel/MultiChannelFormWizard.tsx`
- Chỉ thay đổi UI layout của phần `imagePhase === 'idle'` trong Step 6

