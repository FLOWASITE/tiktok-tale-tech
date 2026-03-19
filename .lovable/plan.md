

## Rà soát UI vs Backend — Các vấn đề cần sửa

### Vấn đề tìm thấy

**1. Badge hiển thị icon name thay vì icon component (BUG)**

Trong `CarouselViewer.tsx` dòng 526 và 532, badge carousel style và visual preset đang render `option.icon` — giá trị hiện tại là **string** (ví dụ `"Layers"`, `"Minus"`) thay vì Lucide component. Kết quả: badge hiện chữ "Layers" thay vì icon.

**Sửa:** Import icon map và render `<IconComponent>` trong badge, tương tự cách đã làm trong `CarouselStyleSelector.tsx`.

---

**2. Seamless validation result không hiển thị trên UI**

`useSeamlessValidation` trả về `seamlessResult` nhưng `CarouselViewer` chỉ dùng toast để thông báo. Không có UI persistent nào hiển thị:
- Điểm consistency score
- Chi tiết issues
- Suggestion tạo lại slide nào

**Sửa:** Thêm `SeamlessConsistencyCard` trong tab Preview hoặc Images khi `carousel.carousel_style === 'seamless'` và có result.

---

**3. CarouselLayoutPreview thiếu educational decorations**

Preview component chỉ có listicle badge và flat_design divider. Thiếu:
- **Educational progress dots** (●●○○○) cho body slides
- **Product badge** ("HOT") cho hook slide khi product_only

Backend `overlay-text-canvas` đã render các decorations này nhưng preview CSS mockup chưa mirror.

---

**4. `StructuredTextContent` editing hạn chế**

`SlidePromptCard` khi edit `textContent` field luôn convert sang plain string (`textContentToString`). Khi save lại, nó lưu string thay vì object. Carousel mới tạo có structured `textContent` nhưng sau khi edit sẽ mất cấu trúc.

**Sửa:** Khi textContent là object, hiện form fields riêng cho headline/subtitle/caption/dataValue/dataLabel thay vì 1 textarea.

---

**5. Seamless validation gọi với generatedImages chưa cập nhật**

Dòng 385-389: Sau `handleGenerateAllImages`, code tìm image URL từ `generatedImages` state. Nhưng state chưa kịp update vì `generateImage` update async. Result có thể thiếu URL.

**Sửa:** Thu thập URLs từ kết quả trả về trong vòng for loop thay vì đọc từ state.

---

### Kế hoạch sửa

| # | Vấn đề | File | Effort |
|---|--------|------|--------|
| 1 | Badge icon rendering | `CarouselViewer.tsx` | Nhỏ |
| 2 | Seamless result card | `CarouselViewer.tsx` | Trung bình |
| 3 | Preview decorations | `CarouselLayoutPreview.tsx` | Nhỏ |
| 4 | Structured text editing | `SlidePromptCard.tsx` | Trung bình |
| 5 | Fix seamless validation URL collection | `CarouselViewer.tsx` | Nhỏ |

