

## Plan: Mở rộng Safe-Area Logic để Cards/Footer/CTA không che Logo

### Vấn đề
Hiện tại safe-area logic chỉ xử lý **banner** — thêm padding trái/phải để tránh logo. Nhưng các phần tử khác (cards, footer, CTA, heroText) vẫn render full-width và có thể **đè lên logo**.

### Phân tích vị trí che khuất

```text
┌─────────────────────────┐
│ Banner (đã có safe-area)│  ← Logo top-left/right: OK
├─────────────────────────┤
│                         │
│   Cards / HeroText      │  ← Logo center-left/right: BỊ CHE
│                         │
├─────────────────────────┤
│ Footer (chưa safe-area) │  ← Logo bottom-left/right: BỊ CHE
└─────────────────────────┘
```

### Thay đổi — 1 file: `supabase/functions/overlay-text-canvas/index.ts`

**1. Tính `logoSafeHeight` bổ sung `logoSafeWidth` đã có**

```typescript
const logoSafeHeight = logoMeta 
  ? Math.ceil(imageHeight * (logoMeta.sizePercent / 100) * aspectRatio) + (logoMeta.padding * 2) 
  : 0;
```

**2. Footer: thêm safe-area padding (tương tự banner)**

Footer hiện có `padding: '8px 24px'` cố định. Thêm logic:
- Logo `bottom-left` → footer paddingLeft = logoSafeWidth
- Logo `bottom-right` → footer paddingRight = logoSafeWidth

**3. Cards container: thêm margin tránh logo ở center-left/center-right**

Khi logo ở `center-left` hoặc `center-right`, cards container cần:
- `center-left` → thêm `marginLeft` hoặc `paddingLeft` = logoSafeWidth
- `center-right` → thêm `marginRight` hoặc `paddingRight` = logoSafeWidth

**4. CTA button: tránh logo ở bottom-center**

Nếu logo ở `bottom-center` và CTA nằm phía dưới → thêm `marginBottom` = logoSafeHeight

**5. Split layout: điều chỉnh cột trái/phải**

Trong split layout, nếu logo ở `center-left`, cột trái (55%) cần padding thêm để không che logo.

### Tóm tắt logic mới

| Vị trí Logo | Phần tử bị ảnh hưởng | Xử lý |
|---|---|---|
| top-left/right | Banner | ✅ Đã có |
| top-center | Banner | ✅ Đã có (banner tránh center) |
| center-left | Cards, Split left col | **Thêm paddingLeft** |
| center-right | Cards, Split right col | **Thêm paddingRight** |
| center | Cards, HeroText | **Thêm padding both sides** |
| bottom-left/right | Footer | **Thêm paddingLeft/Right** |
| bottom-center | Footer, CTA | **Thêm marginBottom cho CTA** |

### Scope
- 1 file: `supabase/functions/overlay-text-canvas/index.ts` (~30 dòng thêm/sửa)
- Không thay đổi frontend — chỉ cải thiện rendering logic phía backend
- `logoMeta` đã được truyền đầy đủ từ pipeline, chỉ cần sử dụng thêm

