
# Kế hoạch: Đơn giản hóa UI/UX Tạo ảnh AI

## Phân tích vấn đề hiện tại

### UnifiedImageGenerator hiện tại (1,496 dòng code)
File hiện tại chứa quá nhiều tính năng hiển thị cùng lúc trong một Dialog split-panel:

**Panel trái (Form Controls) - Quá tải:**
1. Mode toggle (Batch / Single)
2. Brand preview card
3. Channel selection grid (12 kênh, mỗi kênh là 1 button)
4. Prompt editor (chỉ single mode)
5. Image type toggle (Ảnh nền / Có text)
6. Text input + shared/per-channel toggle
7. AI Optimize button
8. "Dùng Hook" button

**Panel phải (Visual Settings) - Quá tải:**
1. VisualTextPositionPreview (3x3 grid + 7 kiểu chữ)
2. Canvas Fallback toggle
3. AI Style Suggestions
4. Style selection grid (8 phong cách)
5. Aspect ratio chips (5 tỉ lệ)
6. Logo options panel (9 vị trí, 5 styles, 2 sliders)
7. Advanced options (negative prompt, context preview)

**Tổng cộng: ~20+ điều khiển hiển thị đồng thời**

### Vấn đề UX cốt lõi
- Người dùng phải đưa ra quá nhiều quyết định trước khi tạo ảnh
- Nhiều tùy chọn chỉ hữu ích cho power users nhưng lại hiển thị cho tất cả
- Không có "happy path" rõ ràng -- user không biết bắt đầu từ đâu
- Dialog quá lớn (max-w-5xl) với split-panel layout phức tạp

---

## Giải pháp: "One-Click First, Customize Later"

### Triết lý thiết kế
- **80% users**: Chỉ cần nhấn 1 nút "Tạo ảnh" -- AI tự quyết định mọi thứ
- **20% power users**: Có thể tùy chỉnh thêm nếu muốn
- Mọi tùy chọn nâng cao ẩn trong Collapsible, không hiển thị mặc định

### Luồng mới (3 bước đơn giản)

```text
+------------------------------------------+
| Buoc 1: CHON KENH (mac dinh: tat ca)     |
| [FB] [IG] [LI] [TW] ...  (chip toggles) |
|                                           |
| Buoc 2: CHON KIEU ANH                    |
| [Anh nen]  [Social Graphic (co text)]    |
|                                           |
| Text: [________________] (neu co text)   |
|                                           |
|        [ ✨ Tao X anh ]                  |
|                                           |
| v Tuy chinh nang cao                     |
|   - Phong cach, Ti le, Logo, Prompt...   |
+------------------------------------------+
```

---

## Chi tiet ky thuat

### 1. Tach component thanh cac file nho

| File moi | Noi dung | Dong code (uoc tinh) |
|----------|----------|---------------------|
| `SimpleImageGenerator.tsx` | Component chinh, layout don gian | ~300 |
| `ImageChannelPicker.tsx` | Chon kenh bang chip toggles | ~80 |
| `ImageStyleCollapsible.tsx` | Phong cach + ti le + logo (collapsible) | ~200 |
| `ImageTextOptions.tsx` | Text input, position, typography | ~150 |
| `ImagePreviewGrid.tsx` | Hien thi ket qua (reuse ImageStreamingGrid) | ~50 |

**Tong: ~780 dong** (giam 48% so voi 1,496 dong hien tai)

### 2. SimpleImageGenerator - Layout moi

Thay vi split-panel 2 cot, dung single-column scrollable:

```text
Dialog (max-w-lg, nho gon hon)
|
|-- Header: "Tao anh AI" + brand info (1 dong)
|
|-- Channel chips (1-2 dong, mac dinh chon tat ca)
|
|-- Image type toggle (Anh nen / Social Graphic)
|
|-- [Neu Social Graphic] Text input + AI Optimize
|
|-- CTA Button: "Tao X anh"
|
|-- [Collapsible] Tuy chinh nang cao
|    |-- Phong cach anh (grid 4 col)
|    |-- Ti le khung hinh (chips)
|    |-- Logo options (toggle + panel)
|    |-- Text position + typography (neu co text)
|    |-- Negative prompt
|
|-- [Streaming/Preview] Ket qua
```

### 3. Smart Defaults - AI tu quyet dinh

Thay vi bat user chon:
- **Phong cach**: Tu dong theo brand industry (da co `suggestImageStyles`)
- **Ti le khung hinh**: Tu dong `auto` (da co `CHANNEL_OPTIMAL_ASPECT_RATIO`)
- **Logo**: Tu dong bat neu co `brandLogoUrl`, vi tri `bottom-right`
- **Text**: Tu dong dien tu Hook neu chon "Social Graphic"
- **Canvas Fallback**: Mac dinh bat, an khoi user

### 4. Loai bo che do Single

Hien tai co 2 mode: Batch va Single. Che do Single khong can thiet vi:
- Batch voi 1 kenh = Single
- Giam complexity dang ke (loai bo prompt editor, mode toggle)
- User van co the chon chi 1 kenh trong batch mode

### 5. Cac thay doi cu the

**File: `src/components/multichannel/SimpleImageGenerator.tsx` (MOI)**
- Component chinh thay the UnifiedImageGenerator
- Single-column layout, max-w-lg
- Channel picker bang compact chips (khong phai grid 2 col)
- Image type toggle (2 buttons)
- Text input (chi hien khi chon "Social Graphic")
- 1 nut CTA lon
- Collapsible "Tuy chinh nang cao" chua tat ca options con lai

**File: `src/components/multichannel/ImageChannelPicker.tsx` (MOI)**
- Compact chip-style channel toggles
- Select all / deselect all
- Hien thi icon + ten ngan (FB, IG, LI...)

**File: `src/components/multichannel/ImageAdvancedOptions.tsx` (MOI)**
- Collapsible wrapper chua:
  - Style grid (giu nguyen 8 styles)
  - Aspect ratio chips (giu nguyen)
  - Logo toggle + LogoOptionsPanel (giu nguyen)
  - VisualTextPositionPreview (chi hien khi co text)
  - Negative prompt

**File: `src/components/MultiChannelViewer.tsx` (SUA)**
- Thay import `UnifiedImageGenerator` bang `SimpleImageGenerator`
- Giu nguyen props interface

**File: `src/components/multichannel/UnifiedImageGenerator.tsx` (GIU LAI)**
- Khong xoa, giu lam backup/reference
- Sau nay co the xoa khi da on dinh

---

## So sanh truoc/sau

| Tieu chi | Hien tai | Sau khi doi |
|----------|----------|-------------|
| So dong code | 1,496 | ~780 (nhieu files) |
| So buoc de tao anh | 5-8 buoc | 1-2 buoc |
| So tuy chon hien thi | ~20+ | 3-4 (co the mo rong) |
| Dialog size | max-w-5xl (split panel) | max-w-lg (single column) |
| Mode | Batch + Single | Chi Batch (1 kenh = single) |
| Smart defaults | Co nhung user van phai chon | AI tu chon, user override |

---

## Rui ro va giai phap

| Rui ro | Giai phap |
|--------|-----------|
| Power users mat tinh nang | Tat ca tinh nang van o trong Collapsible |
| UnifiedImageGenerator cu bi break | Giu nguyen file cu, tao file moi |
| Logic hooks phuc tap | Reuse tat ca hooks hien tai (useAutoImageGeneration, useSocialImageGeneration) |

---

## Thu tu thuc hien

1. Tao `ImageChannelPicker.tsx`
2. Tao `ImageAdvancedOptions.tsx`
3. Tao `SimpleImageGenerator.tsx` (component chinh)
4. Cap nhat `MultiChannelViewer.tsx` de dung component moi
5. Test end-to-end
