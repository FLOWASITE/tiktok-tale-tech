

## Rà soát & Kế hoạch phát triển Carousel

### Hiện trạng

Carousel hiện có:
- **Form tạo**: Topic, platform (FB/TikTok), slide count (5-10), AI tool, brand, campaign
- **AI Generation**: Edge function `generate-carousel` dùng Gemini 2.5 Flash, có self-critique loop, brand voice, cache
- **Viewer**: Dialog 4 tabs (Prompts, Ảnh, Caption, CTA), copy/export TXT
- **Image Gen**: `generate-carousel-image` gọi Gemini 3 Pro Image → upload storage → hiển thị raw AI output
- **Quản lý**: Grid/List view, filters, bulk select, delete, status change, creator tracking

### Gap so với MultiChannel (hệ thống trưởng thành hơn)

| Tính năng | MultiChannel | Carousel |
|---|---|---|
| Overlay text lên ảnh (Satori) | Co | Không — ảnh raw, text bị AI render xấu |
| Lưu ảnh vào DB (image history) | Co | Không — chỉ lưu state, mất khi reload |
| Edit nội dung slide | Co (inline edit) | Không — chỉ xem read-only |
| Drag reorder slides | Không | Không |
| Preview mockup (phone frame) | Co | Không |
| Schedule/Publish | Co | Không |
| Content validation | Co | Không |

### Kế hoạch phát triển (theo thứ tự ưu tiên)

#### P0 — Ảnh hưởng trực tiếp chất lượng

**1. Tích hợp overlay-text-canvas cho Carousel slides**
- Thay vì gọi `generate-carousel-image` (raw AI), carousel sẽ dùng pipeline: AI background → overlay-text-canvas (Satori SVG)
- Tái sử dụng `overlay-text-canvas` edge function đã có, truyền slide `textContent` + brand colors
- Kết quả: text sắc nét, đúng font, đúng brand — không phụ thuộc AI render text

**2. Lưu ảnh carousel vào DB (persistent)**
- Tạo bảng `carousel_images` (carousel_id, slide_number, image_url, created_at)
- Load lại ảnh khi mở viewer thay vì mất khi reload
- Tái sử dụng pattern từ `channel_images` table của MultiChannel

**3. Inline edit nội dung slide**
- Cho phép sửa `textContent`, `objective`, `fullPrompt` trực tiếp trong SlidePromptCard
- Save changes vào `slides_content` JSON trong bảng `carousels`
- Undo/redo cơ bản

#### P1 — Nâng cao trải nghiệm

**4. Slide preview mockup**
- Render mini preview từng slide với text overlay lên placeholder/generated background
- Hiển thị dạng carousel swipe (dùng embla-carousel đã có)

**5. Drag & reorder slides**
- Kéo thả đổi thứ tự slides trong viewer
- Cập nhật `slideNumber` và save

**6. Bulk export ảnh (ZIP)**
- Thay vì download từng ảnh, cho phép tải ZIP toàn bộ slides

### Files cần tạo/sửa

| File | Thay đổi |
|---|---|
| Migration SQL | Tạo bảng `carousel_images` |
| `src/hooks/useCarouselImages.ts` | Hook CRUD ảnh carousel (persistent) |
| `src/components/SlidePromptCard.tsx` | Thêm inline edit mode |
| `src/components/CarouselViewer.tsx` | Tích hợp overlay pipeline, load saved images, edit mode |
| `src/hooks/useImageGeneration.ts` | Thêm overlay-text-canvas call sau khi gen background |
| `src/components/GeneratedImagesGallery.tsx` | Carousel swipe preview |

### Ước tính: 3 lần triển khai
- Lần 1: P0.1 + P0.2 (overlay + persistent images)
- Lần 2: P0.3 (inline edit)
- Lần 3: P1 (preview mockup, reorder, ZIP export)

