

# Sửa UI Post Facebook trên điện thoại

## Vấn đề
Dialog `DirectPublishButton` (`sm:max-w-2xl`) trên mobile bị tràn/chật do:
- Padding `px-6` quá rộng cho màn hình nhỏ
- Textarea `rows={6}` chiếm quá nhiều chiều cao
- Header icon + text cồng kềnh
- Media preview grid không responsive tốt
- Success state padding `py-10` quá lớn

## Thay đổi — File: `src/components/social/DirectPublishButton.tsx`

### 1. Giảm padding trên mobile
- Header: `px-6 py-4` → `px-4 py-3 sm:px-6 sm:py-4`
- Content area: `px-6 pb-2` → `px-4 pb-2 sm:px-6`
- Footer: `px-6 py-4` → `px-4 py-3 sm:px-6 sm:py-4`
- Warning banner: `mx-6` → `mx-4 sm:mx-6`

### 2. Thu nhỏ header trên mobile
- Icon container: `w-10 h-10` → `w-8 h-8 sm:w-10 sm:h-10`
- Title: `text-base` → `text-sm sm:text-base`
- Ẩn date/time trên mobile (chỉ hiện username)

### 3. Textarea responsive
- `rows={6}` → `rows={4}` trên mobile (dùng className `max-h-[120px] sm:max-h-none`)

### 4. Success state gọn hơn
- `py-10 px-6` → `py-6 px-4 sm:py-10 sm:px-6`
- Icon success: `w-16 h-16` → `w-12 h-12 sm:w-16 sm:h-16`

### 5. Schedule Dialog
- Cũng áp dụng padding responsive tương tự
- Calendar component: thêm `className` scale nhỏ hơn trên mobile nếu cần

Chỉ sửa 1 file duy nhất.

