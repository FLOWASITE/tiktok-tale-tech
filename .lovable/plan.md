

## Rà soát Mode Kiểm soát AI — Các vấn đề phát hiện

### Tổng kết: 3 vấn đề cần sửa

---

### Vấn đề 1: `promptMode` không được truyền xuống image pipeline (MultiChannelFormWizard)

**Nghiêm trọng: CAO** — User chọn mode ở Step 5 nhưng nó không có tác dụng gì khi tạo ảnh.

Trong `MultiChannelFormWizard.tsx`, `promptMode` state được quản lý ở Step 5 nhưng **không bao giờ được truyền** vào `onStartImagePipeline()` ở Step 6. Pipeline (`useAutoImagePipeline.ts`) luôn dùng hardcoded defaults (style = V3 auto, imageContentType = 'with_text', logo = auto).

**Sửa:**
- Thêm `promptMode` vào signature của `onStartImagePipeline` callback
- Trong `useAutoImagePipeline.ts`, nhận `promptMode` và điều chỉnh `genOptions` theo mode:
  - `full`: giữ nguyên (AI tự chọn style, text, layout)
  - `brand_only`: force `includeLogo: true`, giữ brand colors, nhưng skip AI style optimization
  - `raw`: dùng user-selected style/settings thay vì V3 auto
- Cập nhật `MultiChannelCreate.tsx` để pass `promptMode` qua

### Vấn đề 2: V3StylePreview cho phép click chọn style ở mọi mode (SimpleImageGenerator)

**Nghiêm trọng: TRUNG BÌNH** — Trong Step 3 của SimpleImageGenerator, `V3StylePreview` luôn hiện dưới dạng **clickable buttons** cho phép user chọn style, kể cả khi `promptMode === 'full'` (Để AI lo).

Theo logic đã thiết kế: ở mode `full`, user không nên chọn style thủ công — AI tự quyết.

**Sửa:**
- Khi `promptMode === 'full'`: ẩn `V3StylePreview` ở Step 3 (vì đã hiện dạng read-only trong ImageAdvancedOptions)
- Khi `promptMode === 'brand_only'`: cũng ẩn (brand giữ nguyên visual identity)
- Khi `promptMode === 'raw'`: hiện V3StylePreview cho user chọn

### Vấn đề 3: Step 6 (Wizard) không có Advanced Options

**Nghiêm trọng: THẤP** — Trong MultiChannelFormWizard Step 6, không có `ImageAdvancedOptions` component. User chọn `raw` (toàn quyền) ở Step 5 nhưng Step 6 không hiện bất kỳ tùy chọn nâng cao nào (style picker, logo, text overlay, aspect ratio...).

Điều này làm mode `raw` vô nghĩa trong wizard — user chọn "toàn quyền" nhưng không có gì để kiểm soát.

**Sửa:**
- Thêm `ImageAdvancedOptions` vào Step 6 khi `promptMode !== 'full'` (hoặc ít nhất khi `raw`)
- Pass `hidePromptModeSelector` để tránh duplicate UI
- Hoặc: hiện một phiên bản rút gọn với các tùy chọn quan trọng nhất (style, aspect ratio, logo, text)

---

### Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `MultiChannelFormWizard.tsx` | Pass `promptMode` vào `onStartImagePipeline`; thêm ImageAdvancedOptions vào Step 6 |
| `MultiChannelCreate.tsx` | Nhận và forward `promptMode` |
| `useAutoImagePipeline.ts` | Nhận `promptMode`, điều chỉnh genOptions theo mode |
| `SimpleImageGenerator.tsx` | Ẩn V3StylePreview khi mode !== 'raw' |

### Phạm vi: 4 file, ~50-70 dòng thay đổi

