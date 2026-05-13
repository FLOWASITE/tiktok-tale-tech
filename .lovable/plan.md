## Vấn đề
Hiện tại pipeline carousel "nhét" brand logo bằng cách:
- Attach `logo_url` vào multi-image input (Lovable Gateway)
- Thêm `logoDirective` text trong prompt yêu cầu model đặt logo

→ Model thường **vẽ lại / bịa logo** ("alero", "mopd"), sai màu, sai tỉ lệ, hoặc bỏ qua hoàn toàn. Đây là 1 trong 6 root causes của aesthetic kém đã liệt kê ở Layer 1-3.

Trong khi đó `supabase/functions/overlay-logo-canvas/index.ts` đã sẵn sàng (imagescript, 9 vị trí, 5 style: clean/shadow/glass/pill/subtle, opacity, padding) — nhưng **carousel pipeline chưa gọi** (chỉ branded-image-composer cho FB/IG single-image dùng).

## Giải pháp — Layer 6: Deterministic Logo Compositing

### 6.1. Gọi `overlay-logo-canvas` sau khi mỗi slide generate xong
**File:** `supabase/functions/generate-carousel-images-batch/index.ts`

Sau khi 1 slide image generate thành công (trước khi upload/persist final URL):
- Nếu `carousel.include_logo = true` AND `brand_templates.logo_url` tồn tại → gọi `overlay-logo-canvas` với base = ảnh AI vừa ra, logo = brand logo URL
- Output URL mới (đã composite) thay thế URL gốc cho slide đó
- Fail-soft: lỗi overlay → giữ ảnh gốc + log warning, không block batch

### 6.2. Loại bỏ "fake logo" leak từ prompt
**File:** `supabase/functions/generate-carousel-image/index.ts`

- **Bỏ `logoDirective`** (line ~768) — không yêu cầu model render logo nữa
- **Bỏ attach logo image** vào multi-image gateway payload (line ~1054) — không inject logo làm reference image nữa
- Giữ `antiHallucinationGuard` "DO NOT render any logo/wordmark" mạnh hơn (đã có)
- `logoApplied` metadata vẫn track nhưng phản ánh "post-process bằng canvas", không phải "AI baked"

### 6.3. Default placement (no schema change)
Vì `brand_templates` chỉ có `logo_url` + `include_logo`, dùng defaults hợp lý cho carousel:
- **position**: `bottom-right` (slide 1..N-1) ; `bottom-center` (slide CTA cuối — visibility cao hơn)
- **logoSizePercent**: `10` (gọn, không lấn typography overlay)
- **logoStyle**: `subtle` (alpha 75%, không khung) → editorial, không phá composition
- **padding**: `48px` (~3% canvas 1080)
- **logoOpacity**: `100`

(Có thể nâng lên thành brand-template settings ở Layer 7 sau.)

### 6.4. Skip overlay khi text overlay sau đã handle logo
Nếu downstream pipeline tiếp tục gọi `overlay-text-canvas` và composer đó sẽ render logo → không gọi overlay-logo-canvas ở batch để tránh double. Check: hiện tại carousel **không** chạy text-canvas overlay step (text bake bằng prompt + trusted models), nên gọi logo-canvas ở batch là an toàn.

## Validation
1. Regen carousel `2454080d-060b-4e09-9666-e1be0cc2f5c3` (educational + flat_design + có brand logo)
2. So sánh A/B:
   - Trước: logo giả "alero" baked vào slide, sai màu, đè lên typography
   - Sau: logo thật bottom-right, 10%, alpha 75%, đồng nhất 4/4 slide
3. Test thêm 1 carousel `include_logo=false` để confirm skip path không gọi overlay
4. Edge function logs xác nhận `overlay-logo-canvas` được gọi N lần = số slide có logo

## Update memory
Append section "Layer 6: Canvas Logo Compositing" vào `aesthetic-guardrails-vn.md`:
- Cấm dùng prompt directive cho logo
- Always overlay deterministic post-gen
- Defaults position/size/style cho carousel

## Out of scope (defer)
- UI để user chọn position/size/style per carousel → Layer 7
- Mở rộng schema `brand_templates` thêm `logo_position/logo_size_percent/logo_style/logo_opacity` (giống branded-image-composer dùng) → cần migration + UI Brand form
- Logo compositing cho video pipeline
