## Mục tiêu
Làm rõ sự khác biệt giữa 3 loại nội dung trong ContentScheduleStudio (lịch chiến dịch) để user không nhầm lẫn khi chọn loại cho từng piece.

## Phạm vi
Chỉ sửa `src/components/agents/ContentScheduleStudio.tsx`. Không thay đổi logic nghiệp vụ hay API.

## Chi tiết implement

### 1. Enrich SelectItem — icon + mô tả 1 dòng
Mở rộng `CONTENT_TYPES` từ `{value, label}` thành thêm `description` và `icon` (lucide icon name).  
Các mục:

| Loại | Label | Icon | Mô tả |
|------|-------|------|-------|
| `multichannel` | Post | `FileText` | Bài text/ảnh ngắn, đồng bộ nhiều kênh |
| `carousel` | Carousel | `Layers` | 5-10 slide vuốt, tối ưu cho Facebook/Instagram/LinkedIn |
| `video_script` | Video | `Video` | Kịch bản 15-180s cho Reels, TikTok, Shorts, YouTube |

Trong `<SelectItem>`, render layout 2 dòng:
- Dòng 1: `<icon>` + label (bold)
- Dòng 2: description nhỏ, muted

Dùng `textValue` prop của `<SelectItem>` để accessibility vẫn đọc đúng label.

### 2. Tooltip (i) cạnh nhãn "Loại"
Thêm icon `Info` nhỏ (w-3 h-3) ngay cạnh label `<label className="text-[11px] text-muted-foreground">Loại</label>` trong grid cell.  
Dùng `<Tooltip>` (có sẵn trong `src/components/ui/tooltip.tsx`) hoặc `<Popover>` nếu mobile-first tốt hơn.

Nội dung tooltip (3 bullet):
- **Post**: Bài ngắn dạng text + ảnh, tự động chuyển đổi sang nhiều kênh social khác nhau.
- **Carousel**: Chuỗi 5-10 slide hình ảnh có thể vuốt, phù hợp giới thiệu sản phẩm hoặc storytelling.
- **Video**: Kịch bản video có lời thoại, độ dài 15-180 giây, xuất ra Reels / TikTok / Shorts / YouTube.

### 3. Trigger cũng hiển thị icon
Khi một loại được chọn, `<SelectTrigger>` hiển thị icon tương ứng bên trái label (giống pattern `ContentGoalCombobox`).

## Kiểm tra sau khi sửa
- Dropdown mở ra hiển thị đúng 3 mục với icon + description.
- Tooltip hiện khi hover/click icon (i).
- SelectTrigger hiển thị icon tương ứng loại đã chọn.
- Không lỗi TypeScript, không phá vỡ layout responsive hiện tại.
