

## Nâng cấp hệ thống Overlay cho Infographic phức tạp

### Phân tích gap hiện tại

Sau khi đọc kỹ toàn bộ pipeline (overlay-text-canvas, decompose-image-request, hybridImageGenerator, hybridImageUtils, overlayTemplates), xác định các điểm yếu chính:

```text
Ảnh mẫu (mong muốn)              Hệ thống hiện tại
─────────────────────────         ────────────────────
Banner lớn, font bold             Banner nhỏ (3% width)
Số "3" trong vòng tròn lớn       heroText chỉ là text thuần
Card có tiêu đề + mô tả          Card chỉ có icon + label (1 dòng)
Ribbon nền gradient phức tạp     Ribbon đơn giản (1 màu)
5-6 sections xếp dọc hài hòa    Smart Density cắt CTA khi ≥5 elements
Footer contact bar rõ ràng       Footer OK nhưng font nhỏ
Khoảng cách sections cân đối     Padding/gap cứng, không responsive
```

### Kế hoạch 6 nâng cấp

#### 1. Cards hỗ trợ subtitle/description (2 dòng)
**Files**: `hybridImageUtils.ts`, `hybridImageGenerator.ts`, `overlay-text-canvas`, `decompose-image-request`

- Thêm `description?: string` vào `OverlayCardItem`
- Render card 2 dòng: **label** (bold) + description (light, font nhỏ hơn)
- AI decompose sinh description khi nội dung đủ chi tiết
- Giới hạn description ≤ 60 ký tự

#### 2. Hero Number Circle (số lớn trong vòng tròn)
**File**: `overlay-text-canvas`

- Khi `heroText` có text là số thuần (regex `/^\d+$/`), render thành vòng tròn lớn với số bên trong
- Style: circle diameter = 15% imageWidth, border gradient primary→secondary, số font = 60% diameter
- Khi text không phải số → giữ nguyên hero text thường

#### 3. Nới Smart Density cho education_infographic
**File**: `overlay-text-canvas`

- Hiện tại: cắt CTA khi elementCount ≥ 6, giới hạn 3-4 cards
- Sửa: khi layout liên quan education_infographic (detect qua có summaryRibbon), nới lên:
  - Max cards: 5 (thay vì 3-4)
  - Không cắt CTA khi có summaryRibbon (vì đã thiết kế cho layout dày)
  - Giảm font size cards thay vì cắt bỏ elements

#### 4. Cải thiện spacing/sizing động
**File**: `overlay-text-canvas`

- Banner font size: tăng từ 3% → 4% imageWidth cho education_infographic
- Cards padding: tăng từ `10px 16px` → `14px 20px` cho numbered cards
- Section gap: thêm `marginTop/marginBottom` động dựa trên tổng elements
- Footer font: tăng từ 1.8% → 2.2% imageWidth

#### 5. Ribbon nâng cấp visual
**File**: `overlay-text-canvas`

- Gradient 2 màu (primary → primary-dark) thay vì 1 màu
- Thêm border-left accent bar (4px solid secondary)
- Icon emoji trước text ribbon (✨ hoặc 📌)
- Padding lớn hơn, font bold hơn

#### 6. AI decompose sinh nội dung phong phú hơn
**File**: `decompose-image-request`

- Cập nhật tool schema: thêm `description` vào card items
- Cập nhật system prompt: hướng dẫn AI sinh card có label + description khi education_infographic
- Ví dụ: `{icon: "📊", label: "Tăng giảm trừ", description: "Mức giảm trừ gia cảnh tăng lên 13.5 triệu/tháng", number: 1}`

### Tổng kết: 4 files cần sửa

| File | Thay đổi |
|------|----------|
| `src/lib/hybridImageUtils.ts` | Thêm `description` vào OverlayCardItem |
| `src/lib/hybridImageGenerator.ts` | Tương tự + validate description |
| `supabase/functions/overlay-text-canvas/index.ts` | Hero circle, card 2 dòng, nới density, spacing, ribbon visual |
| `supabase/functions/decompose-image-request/index.ts` | Schema + prompt cho card description |

