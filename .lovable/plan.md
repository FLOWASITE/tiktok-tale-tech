## Mục tiêu
Hiện tại nút **"Tạo ảnh AI"** trên `CharacterCard` chỉ hiển thị khi nhân vật **chưa có** `reference_image_url`. Khi avatar đã sinh ra rồi mà người dùng không hài lòng → không có cách nào tạo lại từ card. Plan: thêm nút **"Tạo lại"** hoạt động cho cả 2 trường hợp.

## Thay đổi

### 1. `src/components/characters/CharacterCard.tsx`
- Khi đã có `reference_image_url`: thêm nút icon **`RefreshCw`** vào hover-actions (cùng hàng với Edit/Clone/Delete), tooltip "Tạo lại ảnh AI".
- Disable + spinner khi `isGeneratingAvatar=true`; lúc này phủ overlay mờ + `Loader2` lên hero image để feedback rõ ràng.
- Giữ nguyên nút "Tạo ảnh AI" lớn ở giữa khi chưa có ảnh (flow tạo mới).
- Cả 2 nút cùng gọi prop `onGenerateAvatar` → không cần thêm prop mới.

### 2. `src/pages/CharactersPage.tsx`
- `handleGenerateAvatar` đã sẵn logic upsert label `front` trong `reference_images` (replace nếu trùng). Không đổi.
- Khi `reference_image_url` đã có → confirm nhẹ bằng `toast.promise` hoặc bỏ confirm (giữ nhanh gọn). Chọn: **không confirm** — toast success/error đủ. (Nếu user muốn confirm dialog có thể bổ sung sau.)

### 3. `src/components/characters/CharacterDetailSheet.tsx` (nếu có nút tương tự)
- Kiểm tra & thêm nút "Tạo lại ảnh chân dung" trong sheet detail nếu đang có nút tạo lần đầu, để parity với card.

## Không thay đổi
- Edge function `generate-character-image` (đã hỗ trợ regenerate sẵn — chỉ cần gọi lại).
- DB schema, RLS, hook `useCharacterProfiles`.
- Quota: mỗi lần tạo lại tốn 1 credit ảnh như tạo mới (đã tính qua edge function).
