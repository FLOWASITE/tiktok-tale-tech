

## Fix: Banner che mất Logo — Đổi thứ tự pipeline

### Nguyên nhân

Pipeline hiện tại chạy theo thứ tự:
1. Generate background
2. **Logo overlay** (top-left, padding 20px)
3. Canvas text overlay (skipped nếu có structured)
4. **Structured text overlay** — render banner full-width ở top → **che mất logo**

Banner trong `overlay-text-canvas` (line 482-511) render full-width ở top với `padding: 12px 24px`, không biết logo đã được đặt ở đó.

### Giải pháp: Đổi thứ tự — Text overlay TRƯỚC, Logo overlay SAU

Thay vì cố tính offset phức tạp cho banner, đơn giản đổi thứ tự trong pipeline:

```
Background → Text/Structured overlay → Logo overlay
```

Logo sẽ luôn render **trên cùng** (on top of everything), không bao giờ bị che.

### Thay đổi code

**File: `src/hooks/useAutoImageGeneration.ts`**

Sắp xếp lại thứ tự các bước (lines 200-303):

1. **Step 2 (mới)**: Canvas text overlay (cũ Step 3) — nếu `useCanvasFallback && !structuredOverlay`
2. **Step 3 (mới)**: Structured overlay (cũ Step 4) — nếu `structuredOverlay`  
3. **Step 4 (mới)**: Logo overlay (cũ Step 2) — nếu `includeLogo && logoUrl`

Chỉ di chuyển block code, không thay đổi logic bên trong từng step.

### Kết quả

- Logo luôn hiển thị trên cùng, không bị banner hay text nào che
- Không ảnh hưởng đến các mode khác (brand_only, raw)
- Không cần sửa edge function

