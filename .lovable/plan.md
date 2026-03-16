

## Phân tích: Tại sao Logo vẫn bị che trong "Để AI lo"

### Truy vết Pipeline (từ logs thực tế)

```text
Step 1: generate-brand-image (poyo/nano-banana-2)
  → promptMode: full → overlayMode: ai_render
  → AI tạo ảnh WITH text/cards/banner baked-in
  → logoSafeZone: { position: 'top-left', sizePercent: 15 } ✅ ĐÃ GỬI

Step 2: overlay-logo-canvas  
  → Position: top-left, Size: 15%, Opacity: 30%
  → Logo resize: 1560x536 → 206x70px
  → Composite tại (20, 20) ✅ HOẠT ĐỘNG

Step 3: SKIPPED — ai_render mode
Step 4: SKIPPED — ai_render mode
```

### Nguyên nhân gốc (2 vấn đề đồng thời)

**Vấn đề 1: AI model KHÔNG tuân thủ "LOGO SAFE ZONE" prompt**
- PoYo/nano-banana-2 (Gemini Flash wrapper) rất yếu trong việc tuân thủ spatial constraints
- Prompt chỉ dẫn "keep top-left clear" nhưng AI vẫn render banner/text ở đó
- Đây là giới hạn cố hữu của image generation models — không thể fix 100% bằng prompt

**Vấn đề 2: Logo opacity 30% quá mờ**
- Logo chỉ 206x70px với opacity 30% → gần như trong suốt
- Trên nền AI-rendered có text/colors phức tạp → logo bị "nuốt" hoàn toàn

### Giải pháp đề xuất

**Approach: Post-process protection (deterministic, 100% reliable)**

Thay vì CHỈ dựa vào prompt để AI chừa chỗ (unreliable), thêm bước **clear logo zone** trước khi composite logo:

#### Thay đổi — 1 file: `supabase/functions/overlay-logo-canvas/index.ts`

1. **Thêm "Semi-transparent backdrop" phía sau logo** — vẽ một vùng nền mờ (gradient hoặc solid với opacity) tại vị trí logo TRƯỚC khi composite logo lên. Giúp logo luôn nổi bật bất kể nền phía sau là gì.

```typescript
// Before compositing logo, draw a subtle backdrop
function drawLogoBackdrop(
  baseImg: Image, 
  x: number, y: number, 
  width: number, height: number,
  backdropPadding: number = 8
) {
  // Create a semi-transparent dark/light backdrop rectangle
  const bx = Math.max(0, x - backdropPadding);
  const by = Math.max(0, y - backdropPadding);
  const bw = Math.min(baseImg.width - bx, width + backdropPadding * 2);
  const bh = Math.min(baseImg.height - by, height + backdropPadding * 2);
  
  const backdrop = new Image(bw, bh);
  backdrop.fill(0x00000066); // Semi-transparent black (40% opacity)
  // Round corners effect via composite
  baseImg.composite(backdrop, bx, by);
}
```

2. **Enforce minimum opacity cho logo** — nếu user set opacity < 50%, tự động nâng lên 50% khi ở `ai_render` mode (vì nền AI luôn phức tạp):

```typescript
// In the main handler, after parsing request:
const effectiveOpacity = Math.max(logoOpacity, 50); // Minimum 50% for visibility
```

3. **Giữ nguyên logoSafeZone prompt** (vẫn giúp phần nào), nhưng không phụ thuộc 100% vào nó

### Tóm tắt

| Lớp bảo vệ | Trước | Sau |
|---|---|---|
| AI prompt safe zone | ✅ Có nhưng unreliable | ✅ Giữ nguyên |
| Backdrop behind logo | ❌ Không có | ✅ Semi-transparent backdrop |
| Minimum opacity | ❌ Cho phép 30% | ✅ Enforce ≥ 50% |

### Scope
- 1 file: `supabase/functions/overlay-logo-canvas/index.ts` (~25 dòng thêm)
- Deterministic — hoạt động 100% bất kể AI model nào

