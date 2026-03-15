

## Phân tích: Quá nhiều text trên ảnh và text không có ý nghĩa

### Nguyên nhân gốc

Phát hiện **2 lỗi nghiêm trọng** trong pipeline:

**Lỗi 1: Double Text Rendering (Text bị render 2 lần)**

Console log cho thấy cả **Step 3** (canvas text overlay) VÀ **Step 4** (structured overlay) đều chạy tuần tự cho cùng một ảnh:

```text
[useAutoImageGeneration] Applying canvas text overlay for instagram   ← Step 3
[useAutoImageGeneration] Canvas text overlay success for instagram
[useAutoImageGeneration] Applying structured overlay for instagram    ← Step 4
[useAutoImageGeneration] Structured overlay success for instagram
```

Nguyên nhân kỹ thuật: Ở dòng 233, điều kiện kiểm tra `imageContentType === 'with_text'` (giá trị gốc từ caller), trong khi `effectiveContentType` đã được force thành `'background_only'` khi có `structuredOverlay`. Nhưng Step 3 lại dùng `imageContentType` thay vì `effectiveContentType`, nên text vẫn bị render trước khi structured overlay thêm banner + hero + cards lên trên.

Kết quả: Ảnh có **2 lớp text chồng lên nhau** — một lớp từ canvas text, một lớp từ structured overlay.

**Lỗi 2: Quá nhiều overlay elements cùng lúc**

Structured overlay render **TẤT CẢ** elements đồng thời: banner + hero text + headline + 4 cards + CTA = tối đa **8 khối text** trên một ảnh. Với ảnh nhỏ (đặc biệt Instagram 1080x1080), điều này tạo ra visual clutter.

### Giải pháp

**1. `src/hooks/useAutoImageGeneration.ts` — Skip canvas text khi có structured overlay**

Thêm điều kiện `!structuredOverlay` vào check Step 3 (dòng 233) để không render text 2 lần.

~1 dòng thay đổi.

**2. `supabase/functions/overlay-text-canvas/index.ts` — Giới hạn mật độ overlay**

Thêm logic "smart density" trong `buildStructuredElement()`:
- Nếu có banner + heroText + cards + headline + cta (5+ elements): bỏ headline (vì hero text đã đủ nổi bật)
- Nếu có cả heroText và headline: chỉ giữ heroText
- Giới hạn cards tối đa 4 items, và nếu ảnh vuông (≤ 1:1 ratio) thì giới hạn 3 items
- Giảm kích thước font cho cards khi có nhiều elements đồng thời

~15 dòng thêm/sửa.

**3. `supabase/functions/decompose-image-request/index.ts` — Tinh chỉnh prompt**

Cập nhật system prompt để AI không tạo cả headline lẫn heroText cùng lúc, và CTA chỉ tạo khi thực sự cần thiết (nội dung quảng bá rõ ràng).

~5 dòng sửa.

### Tổng: ~20 dòng thay đổi. Không file mới. Fix lỗi double rendering + giảm visual clutter.

