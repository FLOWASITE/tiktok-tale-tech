

# Sửa Agent Sáng tạo: Đúng Quy Trình Tạo Nội Dung

## Phân tích quy trình thực tế (UI)

### Nội dung Đa kênh (5 bước)
```text
Bước 1: Nhập chủ đề
Bước 2: Core Content (TÙY CHỌN — có thể bỏ qua)
Bước 3: Chọn vai trò (seed/sprout/harvest)
Bước 4: Tạo text đa kênh → generate-multichannel (action: "create")
Bước 5: Tạo ảnh tự động → generate-brand-image (cho từng kênh)
```

### Carousel (2 pha)
```text
Pha 1: generate-carousel → Tạo PROMPT text cho từng slide (KHÔNG phải ảnh)
Pha 2: generate-carousel-image → Tạo ẢNH thật cho từng slide (dùng prompt từ Pha 1)
```

### Kịch bản Video (3 bước)
```text
Bước 1: generate-script → Tạo kịch bản
Bước 2: analyze-script → Chấm điểm
Bước 3: improve-script → Cải thiện nếu điểm < 70
```

## Sai lệch hiện tại trong Agent Creator V2

| Vấn đề | Hiện tại | Đúng |
|---|---|---|
| Multichannel: Core Content | Luôn tạo bắt buộc | Tùy chọn — Agent quyết định dựa trên context |
| Multichannel: Ảnh | Không tạo | Phải gọi `generate-brand-image` cho từng kênh |
| Carousel: Ảnh | `autoGenerateImages: false`, dừng ở text prompt | Phải gọi `generate-carousel-image` cho từng slide |
| Carousel: Nhầm lẫn | `generate-carousel` = "tạo ảnh"? | Không! Nó chỉ tạo **prompt text** cho slide |

## Kế hoạch sửa

### Phần 1: Multichannel — Bỏ qua Core Content khi không cần

**File: `supabase/functions/agent-creator-v2/index.ts`**

Trong `routeMultichannel()`:
- Thêm logic quyết định skip Core Content (giống UI có switch "Tạo nhanh — bỏ qua Core Content")
- Nếu campaign context không yêu cầu đồng nhất chất lượng → gọi thẳng `generate-multichannel` (action: "create") mà KHÔNG gọi `generate-core-content` trước
- Nếu cần Core Content → giữ nguyên flow hiện tại

Điều kiện skip:
- `campaign_context.content_role` = "seed" (awareness, không cần chất lượng cao)
- Hoặc không có `brand_template_id` (không có brand guidelines)
- Hoặc pipeline chỉ target 1 kênh duy nhất

### Phần 2: Multichannel — Thêm bước tạo ảnh

**File: `supabase/functions/agent-creator-v2/index.ts`**

Sau khi `generate-multichannel` trả về `multi_channel_contents` ID, thêm Step 3:
- Lấy `multichannel_content_id` từ `mcOutput`
- Với mỗi channel trong `targetChannels`, gọi `generate-brand-image` song song (max 3 concurrent)
- Truyền: `contentId` (multichannel ID), `channel`, `brandTemplateId`, `imageContentType: 'with_text'`
- Lỗi ảnh không block pipeline — ghi warning và tiếp tục
- Lưu kết quả vào `result.output.images`

### Phần 3: Carousel — Thêm Pha 2 tạo ảnh thật

**File: `supabase/functions/agent-creator-v2/index.ts`**

Trong `routeCarousel()`, sau khi `generate-carousel` trả về slides_content (prompt text):
- Gọi `generate-carousel-image` cho từng slide (tuần tự hoặc batch 3)
- Truyền: `carouselId`, `slideNumber`, `prompt` (từ slide.fullPrompt), `brandTemplateId`, `visualPreset`, `carouselStyle`, `totalSlides`
- Kế thừa `seamlessContext` giữa các slide liên tiếp để đảm bảo tính liên tục
- Timeout 60s/slide, lỗi slide không block pipeline

### Phần 4: Cập nhật pipeline state

**File: `supabase/functions/agent-pipeline/index.ts`**

Trong stage `create`:
- Lưu `multichannel_content_id` vào `pipeline_state` (cho Publisher biết lấy content từ đâu)
- Lưu số lượng ảnh đã tạo thành công vào `pipeline_state.stages.create.output`

## Tổng hợp file thay đổi

1. **`supabase/functions/agent-creator-v2/index.ts`**:
   - `routeMultichannel()`: Thêm logic skip Core Content + thêm Step 3 tạo ảnh (~50 dòng)
   - `routeCarousel()`: Thêm Pha 2 gọi `generate-carousel-image` cho từng slide (~40 dòng)
   - Helper `generateImagesForChannels()` (~25 dòng)
   - Helper `generateCarouselImages()` (~30 dòng)

2. **`supabase/functions/agent-pipeline/index.ts`**:
   - Stage `create`: Lưu `multichannel_content_id` vào pipeline state (~5 dòng)

