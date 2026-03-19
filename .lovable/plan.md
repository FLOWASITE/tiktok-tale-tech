

# UI tiến trình mới cho "Prompt + Ảnh"

## Vấn đề hiện tại
Khi nhấn "Prompt + Ảnh", form hiển thị 4 bước loading nhỏ trong form → đóng form → mở CarouselViewer dialog → tự động tạo ảnh. Trải nghiệm bị phân mảnh, người dùng không thấy toàn bộ pipeline trong 1 view.

## Giải pháp
Tạo component `CarouselGenerationTracker` — một **full-page view** thay thế form khi đang generate, hiển thị tiến trình 2 giai đoạn (Prompt → Ảnh) trong 1 UI liền mạch.

```text
┌─────────────────────────────────────────┐
│ ← Quay lại          Tạo Carousel        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Phase 1: Tạo Prompt ────────────┐  │
│  │ ✅ Phân tích chủ đề              │  │
│  │ ✅ Thiết kế cấu trúc             │  │
│  │ 🔄 Viết nội dung từng slide      │  │
│  │ ○  Hoàn thiện prompt ảnh         │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─ Phase 2: Tạo Ảnh ──────────────┐  │
│  │ ○  Slide 1  ○  Slide 2          │  │
│  │ ○  Slide 3  ○  Slide 4          │  │
│  │ ○  Slide 5  ○  Slide 6          │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  35%          │
│  Đang viết nội dung · 0:24            │
│                                         │
│  💡 Mẹo: Carousel 6 slides thường     │
│     mất khoảng 2-3 phút               │
└─────────────────────────────────────────┘
```

## Các thay đổi cụ thể

### 1. Tạo `src/components/carousel/CarouselGenerationTracker.tsx` (mới)
- Full-page component với 2 phases rõ ràng
- **Phase 1 (Tạo Prompt)**: 4 bước giống LOADING_PHASES hiện tại nhưng với UI đẹp hơn (stepper dọc với icons, animation)
- **Phase 2 (Tạo Ảnh)**: Grid các slide số, mỗi ô chuyển trạng thái pending → generating → done/error
- Progress bar tổng thể bao gồm cả 2 phases
- Timer đếm thời gian thực
- Khi hoàn tất → hiển thị nút "Xem kết quả" mở CarouselViewer

### 2. Sửa `src/pages/Carousel.tsx`
- Thêm state `generationMode`: `'idle' | 'generating'`
- Khi `handleGenerateCarousel` được gọi với `autoGenerateImages=true` → chuyển sang view `CarouselGenerationTracker` thay vì đóng form + mở viewer
- Truyền callback để tracker biết khi prompt xong (carousel data) và khi ảnh xong

### 3. Sửa `src/components/CarouselForm.tsx`
- Khi `autoGenerateImages=true`, form gọi `onSubmit` bình thường nhưng **không hiển thị LOADING_PHASES nội bộ** — thay vào đó page cha sẽ hiển thị tracker
- Giữ nguyên LOADING_PHASES cho trường hợp chỉ "Tạo Prompt" (không có ảnh)

### 4. Tích hợp image generation vào tracker
- Sau khi prompt hoàn tất (carousel trả về), tracker tự động bắt đầu Phase 2
- Sử dụng `useImageGeneration` hook hiện có để tạo ảnh tuần tự
- Cập nhật trạng thái từng slide realtime (pending → spinning → ✓/✗)
- Khi tất cả ảnh xong → nút "Xem kết quả" mở CarouselViewer

### 5. UI chi tiết của tracker
- **Header**: Tên chủ đề + platform badge + nút quay lại (có confirm nếu đang generate)
- **Phase cards**: 2 card lớn nằm dọc, card active có viền primary glow
- **Slide grid**: Mỗi slide hiển thị số + trạng thái (icon animate khi đang tạo)
- **Bottom bar**: Progress bar tổng + phần trăm + elapsed time + tips ngẫu nhiên
- **Completion state**: Confetti-like animation + summary (X slides, Y ảnh, thời gian) + CTA "Xem kết quả"

## Không thay đổi
- Edge function `generate-carousel` và `generate-carousel-image` — giữ nguyên
- `useCarousels` hook — giữ nguyên
- Flow "Tạo Prompt" (không ảnh) — giữ nguyên loading phases trong form

