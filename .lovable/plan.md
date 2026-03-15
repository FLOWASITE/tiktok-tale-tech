

## Rà soát toàn diện UI/UX tạo ảnh — Phát hiện và đề xuất

### Tổng quan 2 luồng

| Luồng | Bước | Đặc điểm |
|-------|------|----------|
| **SimpleImageGenerator** (dialog) | 3 bước: Chọn kênh → Kiểm soát AI → Xem trước & Tạo | Tất cả trong 1 scroll view, có ImageAdvancedOptions collapsible |
| **MultiChannelFormWizard** (Step 5→6) | Step 5: Kiểm soát AI → Step 6: Tạo ảnh | Mỗi step riêng biệt, Step 6 chỉ có CTA + streaming grid |

---

### Các vấn đề UI/UX phát hiện

#### Vấn đề 1: Step 2 & ImageAdvancedOptions trùng lặp UI prompt mode (SimpleImageGenerator) — MỨC THẤP

**Hiện trạng:** Step 2 có 3 card lớn chọn mode. Nhưng bên trong Step 3, `ImageAdvancedOptions` vẫn render prompt mode selector (dù đã truyền `hidePromptModeSelector`). Phần prompt mode trong AdvancedOptions bị ẩn → OK.

Tuy nhiên, AdvancedOptions **vẫn render V3 read-only** và **Style Grid** tùy mode, tạo nên **2 nơi hiển thị style** trong cùng Step 3:
- `V3StylePreview` component (line 641-647) — hiện khi `raw`
- Bên trong `ImageAdvancedOptions` (line 210-265) — cũng hiện style grid khi `raw`

**Hậu quả:** User thấy 2 style picker trong cùng 1 view khi chọn `raw` mode. Cả 2 đều bind vào cùng `imageStyle` state, nên functional đúng, nhưng **gây confusing UX**.

**Đề xuất:** Ẩn style grid trong `ImageAdvancedOptions` khi đã hiện `V3StylePreview` bên ngoài. Thêm prop `hideStyleGrid?: boolean` vào ImageAdvancedOptions.

#### Vấn đề 2: Wizard Step 6 thiếu tùy chỉnh cho `raw` và `brand_only` modes — MỨC CAO

**Hiện trạng:** Step 6 chỉ có: channel summary card + mode summary card + CTA button. Không có:
- Style picker (cho `raw`)
- Logo toggle (cho `brand_only`/`raw`)
- Text overlay options
- Aspect ratio
- Bất kỳ ImageAdvancedOptions nào

**Hậu quả:** User chọn "Toàn quyền" ở Step 5 nhưng Step 6 không cho phép tùy chỉnh gì. Mode `raw` hoàn toàn vô nghĩa trong wizard flow. Mode `brand_only` cũng không thể toggle logo on/off.

**Đề xuất:** Thêm `ImageAdvancedOptions` (với `hidePromptModeSelector`) vào Step 6 khi `promptMode !== 'full'`. Khi `full`, giữ nguyên UI tối giản hiện tại vì AI lo tất cả.

#### Vấn đề 3: Wizard Step 6 streaming grid thiếu `onEditBackground` và `onRefineText` — MỨC TRUNG BÌNH

**Hiện trạng:** `ImageStreamingGrid` trong Step 6 (line 2012-2019) không truyền `onEditBackground` hay `onRefineText` props. Trong khi SimpleImageGenerator truyền đầy đủ (line 746-755).

**Hậu quả:** Sau khi ảnh tạo xong trong wizard, user không thể sửa chữ hay chỉnh nền. Phải quay về trang chi tiết để làm việc này.

**Đề xuất:** Forward `onEditBackground` và `onRefineText` callbacks từ parent vào wizard Step 6, hoặc ít nhất hiện tooltip "Vào trang chi tiết để chỉnh sửa ảnh".

#### Vấn đề 4: `brand_only` mode không auto-enable logo trong Wizard — MỨC THẤP

**Hiện trạng:** Trong SimpleImageGenerator (line 594), khi chọn `brand_only` sẽ auto-set `setIncludeLogo(true)`. Nhưng Wizard Step 5 (line 1829) chỉ `setPromptMode(mode.value)` mà KHÔNG auto-enable logo.

**Hậu quả:** Không nhất quán giữa 2 luồng. Trong wizard, `brand_only` không tự bật logo vì Step 6 không có UI toggle logo.

**Đề xuất:** Thêm auto-enable logo logic trong wizard Step 5 giống SimpleImageGenerator. Hoặc, nếu thêm ImageAdvancedOptions vào Step 6 (vấn đề 2), logic này sẽ tự giải quyết.

#### Vấn đề 5: "Quick start hint" luôn hiện ngay cả khi đã quen — MỨC RẤT THẤP

**Hiện trạng:** SimpleImageGenerator luôn hiện hint box "💡 Bắt đầu nhanh: Chọn kênh → nhấn Tạo ảnh" (line 550-553).

**Hậu quả:** Chiếm không gian, không có cách dismiss. Với user đã quen, đây là noise.

**Đề xuất:** Bỏ qua, ưu tiên thấp. Có thể lưu vào localStorage để dismiss.

#### Vấn đề 6: Mode descriptions không nhất quán giữa 2 luồng — MỨC THẤP

**Hiện trạng:**
- SimpleImageGenerator Step 2: "Giữ logo & màu brand, bạn tự chọn bố cục"
- Wizard Step 5: "AI giữ nguyên logo, màu sắc thương hiệu. Bạn có thể tùy chỉnh bố cục text..."
- ImageAdvancedOptions: "Bạn viết ý tưởng, AI giữ brand"

3 nơi mô tả `brand_only` khác nhau. User có thể bối rối.

**Đề xuất:** Thống nhất mô tả mode descriptions thành 1 bộ duy nhất dùng chung.

---

### Tóm tắt thay đổi đề xuất (ưu tiên)

| # | Vấn đề | Mức | File | Thay đổi |
|---|--------|-----|------|----------|
| **2** | Wizard Step 6 thiếu tùy chỉnh cho raw/brand_only | **Cao** | `MultiChannelFormWizard.tsx` | Thêm ImageAdvancedOptions vào Step 6 khi mode ≠ full |
| **3** | Wizard streaming thiếu edit/refine actions | TB | `MultiChannelFormWizard.tsx` | Forward callbacks hoặc hiện hint |
| **1** | Duplicate style picker trong SimpleImageGenerator | Thấp | `ImageAdvancedOptions.tsx` | Thêm prop `hideStyleGrid` |
| **4** | Wizard không auto-enable logo cho brand_only | Thấp | `MultiChannelFormWizard.tsx` | Thêm logic auto-enable |
| **6** | Mode descriptions không nhất quán | Thấp | 3 files | Thống nhất text |

### Kế hoạch triển khai

**File 1: `src/components/multichannel/ImageAdvancedOptions.tsx`**
- Thêm prop `hideStyleGrid?: boolean` — khi true, ẩn cả style grid lẫn V3 read-only section
- ~5 dòng thay đổi

**File 2: `src/components/multichannel/SimpleImageGenerator.tsx`**
- Truyền `hideStyleGrid` vào ImageAdvancedOptions khi `promptMode === 'raw'` (vì V3StylePreview đã hiện bên ngoài)
- Thống nhất mode descriptions
- ~5 dòng thay đổi

**File 3: `src/components/multichannel/MultiChannelFormWizard.tsx`**
- Import và thêm `ImageAdvancedOptions` vào Step 6 khi `promptMode !== 'full'` (với `hidePromptModeSelector` và `hideStyleGrid` nếu cần)
- Cần thêm state cho các advanced options (imageStyle, aspectRatio, includeLogo, etc.) — hoặc dùng defaults và forward xuống pipeline
- Auto-enable logo khi chọn `brand_only` ở Step 5
- Forward `onEditBackground`/`onRefineText` vào StreamingGrid nếu parent cung cấp, hoặc hiện info text
- ~60-80 dòng thay đổi

### Phạm vi: 3 files, ~70-90 dòng

