## Mục tiêu
Sau khi user nhấn nút **"Kênh thường dùng"** (Sparkles, vùng header của Channel Picker step 4), hiện chỉ có 1 chiều: chọn vào. User muốn nhấn lại để **bỏ chọn** các kênh thường dùng đã thêm vào.

## Hành vi mới (toggle)
Trong `handleSelectFrequent` (`src/components/multichannel/MultiChannelFormWizard.tsx` ~line 854):

- Nếu **toàn bộ** `frequentChannels` đã nằm trong `formData.channels` → nhấn lần nữa = **xóa** các kênh thường dùng khỏi selection (giữ nguyên các kênh khác user đã tick thủ công).
- Ngược lại (có ít nhất 1 kênh thường dùng chưa được chọn) → **gộp thêm** vào selection hiện tại (dùng `Set` để khử trùng), không còn ghi đè làm mất các kênh khác.

## UI feedback (tùy chọn nhỏ)
Trong `src/components/multichannel/CompactChannelGrid.tsx`:
- Nút "Kênh thường dùng" đổi label động: nếu tất cả frequent đang được chọn → hiển thị **"Bỏ kênh thường dùng"** + đổi nhẹ tone (hover muted thay vì amber). Truyền thêm prop `frequentAllSelected: boolean` từ Wizard, tính bằng `frequentChannels.every(ch => formData.channels.includes(ch))`.
- Icon đổi từ `Sparkles` → `Sparkles` (giữ) khi add, hoặc `X` khi đang ở trạng thái "Bỏ".

## File chỉnh
- `src/components/multichannel/MultiChannelFormWizard.tsx` — sửa `handleSelectFrequent` + truyền `frequentAllSelected` vào `<CompactChannelGrid>`.
- `src/components/multichannel/CompactChannelGrid.tsx` — thêm prop `frequentAllSelected?: boolean`, đổi label/icon nút "Kênh thường dùng" theo trạng thái.

## Không thay đổi
- Hook `useFrequentChannels` (vẫn chỉ ghi nhận usage, không xóa entry).
- Logic chọn từng kênh lẻ trong grid bên dưới.