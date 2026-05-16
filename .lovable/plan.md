## Mục tiêu
Thêm nút **"Tạo ảnh"** ngay trên mỗi item kênh trong sidebar (chỗ khoanh đỏ: Facebook 532 từ, Instagram 202 từ) — chỉ hiện khi kênh đã có nội dung nhưng chưa có ảnh.

## Vị trí
`src/components/MultiChannelViewer.tsx` — sidebar channel list (dòng 1313–1371).

## UX
Mỗi row kênh hiện tại: `[icon] [tên kênh • dots] [N từ]`
Sau update: `[icon] [tên kênh • dots] [N từ]    [✨ Tạo ảnh]`

- Nút icon-only `Wand2`/`Sparkles` (kích thước 7×7, bg `primary/10`, text `primary`, hover bg `primary/20`), tooltip "Tạo ảnh AI cho {kênh}"
- Chỉ hiện khi: `channelText` không rỗng **và** `!hasImage` **và** `!isRegenerating`
- Khi đang generate cho kênh đó → spinner thay icon, disabled
- Click → `setActiveImageChannel(channel)` + `setShowImageGenerator(true)` + `setSelectedChannel(channel)` (giống logic `EmptyImageCTA`), `e.stopPropagation()` để không bubble lên row

## Vấn đề kỹ thuật
Row hiện tại là `<button>` → nested button = invalid HTML. Đổi outer `<button>` → `<div role="button" tabIndex={0}>` với `onClick` + `onKeyDown` (Enter/Space) giữ nguyên a11y. Nút con là `<button>` thật với `stopPropagation`.

## Thay đổi file
**Chỉ 1 file:** `src/components/MultiChannelViewer.tsx`
- Đổi outer `<button>` (line 1326) → `<div role="button">` + keyboard handler
- Thêm icon button bên phải `flex-1` block (sau line 1366), conditional render
- Import `Wand2` từ `lucide-react` (kiểm tra đã import chưa)

## Không thay đổi
- Toolbar "Tạo ảnh hàng loạt" giữ nguyên
- `EmptyImageCTA` dưới mockup giữ nguyên (CTA lớn, khác use-case)
- Logic generate, hooks, edge functions — không động vào

## Ước lượng
~25 dòng diff, 1 file.
