

# Sửa lỗi: Carousel từ Agent khác với tạo thủ công

## Vấn đề phát hiện

### Bug 1: `fetchContentText` dùng sai tên cột (Nghiêm trọng)
- **Dòng 1821**: Truy vấn `slides_data` nhưng bảng `carousels` chỉ có cột `slides_content`
- Kết quả: `contentText` rỗng → GEO scoring không chạy → carousel từ Agent không có điểm GEO

### Bug 2: `carouselStyle` và `visualPreset` bị hardcode
- **Dòng 619-620** trong `routeCarousel`:
  ```
  const visualPreset = "minimalist";
  const carouselStyle = "educational";
  ```
- Agent luôn tạo carousel "educational + minimalist" bất kể campaign context hay brand preference
- Luồng thủ công cho phép chọn: seamless, listicle, gallery, v.v.

### Bug 3: Platform bị hardcode thành "instagram"
- **Dòng 602**: `const targetChannel = ctx?.target_channel || "instagram"`
- Nhưng DB cho thấy tất cả carousel đều lưu `platform: facebook` (do `generate-carousel` ghi đè?) → không nhất quán

## Kế hoạch sửa

### File: `supabase/functions/agent-pipeline/index.ts`

**Sửa `fetchContentText` — carousel branch (dòng 1820-1827)**:
- Đổi `slides_data` → `slides_content`
- Parse `textContent` đúng cách (string hoặc structured object với headline/subtitle)

### File: `supabase/functions/agent-creator-v2/index.ts`

**Sửa `routeCarousel` (dòng 619-620)**:
- Đọc `carouselStyle` và `visualPreset` từ `campaign_context` hoặc brand config thay vì hardcode
- Cho phép truyền từ `CreatorInput` (thêm field optional)
- Fallback hợp lý hơn: dựa trên `content_role` (seed → gallery, harvest → listicle, nurture → educational)

### Tổng: 2 file edge function, 3 chỗ sửa. Deploy lại cả 2 function.

