

# Kế hoạch: Cải thiện thẩm mỹ Logo Overlay

## Mục tiêu
Nâng cấp tính năng overlay logo để tạo ra kết quả đẹp mắt, chuyên nghiệp hơn với nhiều tùy chọn thẩm mỹ.

## Các cải tiến đề xuất

### 1. Thêm Logo Style Presets (Phong cách logo)
| Style | Mô tả | Kỹ thuật |
|-------|-------|----------|
| **Clean** | Logo gốc, không hiệu ứng | Giữ nguyên |
| **Shadow** | Drop shadow mềm | Thêm shadow dưới logo |
| **Glassmorphism** | Nền kính mờ | Background blur + opacity |
| **Pill Badge** | Nền bo tròn | Rounded rectangle background |
| **Outline** | Viền mỏng quanh logo | Stroke effect |
| **Subtle** | Mờ nhẹ, không lấn át | Opacity 40-60% |

### 2. Thêm tùy chọn kích thước logo
- **Nhỏ**: 8-10% width (watermark style)
- **Vừa**: 12-15% width (cân đối)  
- **Lớn**: 18-22% width (nổi bật)
- **Slider tùy chỉnh**: 5-30%

### 3. Mở rộng vị trí đặt logo
Từ 4 góc → 9 vị trí (lưới 3x3):
```text
┌─────────────────────────────────┐
│  top-left    top-center    top-right   │
│                                         │
│  center-left    center    center-right │
│                                         │
│  bottom-left  bottom-center  bottom-right│
└─────────────────────────────────┘
```

### 4. Thêm Opacity control
- Slider từ 30% - 100%
- Cho phép logo mờ nhẹ như watermark

### 5. Thêm Background options cho logo
- **Transparent**: Không nền
- **White circle/pill**: Nền trắng
- **Dark circle/pill**: Nền tối
- **Blur backdrop**: Nền mờ (glassmorphism)
- **Brand color**: Dùng màu thương hiệu

---

## Chi tiết kỹ thuật

### File 1: `src/components/multichannel/UnifiedImageGenerator.tsx`

**Thêm các constants và UI:**

```typescript
// Mở rộng LogoPosition
type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'  
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Thêm LogoStyle type
type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';

// Thêm LogoSize type
type LogoSize = 'small' | 'medium' | 'large' | 'custom';

// Thêm state mới
const [logoStyle, setLogoStyle] = useState<LogoStyle>('shadow');
const [logoSize, setLogoSize] = useState<LogoSize>('medium');
const [logoOpacity, setLogoOpacity] = useState(100);
const [logoCustomSize, setLogoCustomSize] = useState(15);
```

**Thêm UI component LogoOptionsPanel:**
- Grid 3x3 cho position picker (visual)
- Style preset buttons với preview
- Size selector với slider tùy chỉnh
- Opacity slider

### File 2: `src/hooks/useAutoImageGeneration.ts`

**Mở rộng params:**
```typescript
interface GenerateParams {
  // ...existing
  logoStyle?: LogoStyle;
  logoSizePercent?: number;
  logoOpacity?: number;
}
```

**Cập nhật gọi overlay-logo-canvas:**
```typescript
const { data: overlayData, error: overlayError } = await supabase.functions.invoke('overlay-logo-canvas', {
  body: {
    baseImageUrl: finalImageUrl,
    logoUrl,
    position: logoPosition || 'bottom-right',
    logoSizePercent: logoSizePercent || 15,
    logoStyle: logoStyle || 'shadow',
    logoOpacity: logoOpacity || 100,
    // ...
  }
});
```

### File 3: `supabase/functions/overlay-logo-canvas/index.ts`

**Thêm xử lý style effects:**

```typescript
interface OverlayRequest {
  // ...existing
  logoStyle?: 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';
  logoOpacity?: number; // 30-100
}

// Thêm function applyLogoStyle
async function applyLogoStyle(
  logoImg: Image,
  style: string,
  opacity: number,
  primaryColor?: string
): Promise<Image> {
  // Apply opacity
  if (opacity < 100) {
    logoImg.opacity(opacity / 100);
  }
  
  switch (style) {
    case 'shadow':
      // Tạo shadow layer phía dưới logo
      return addDropShadow(logoImg, 4, 0.3);
      
    case 'glass':
      // Tạo background blur rounded
      return addGlassBackground(logoImg);
      
    case 'pill':
      // Thêm pill-shaped background
      return addPillBackground(logoImg, primaryColor || '#ffffff');
      
    case 'outline':
      // Thêm stroke
      return addOutline(logoImg, 2, '#ffffff');
      
    case 'subtle':
      // Giảm opacity mặc định
      logoImg.opacity(0.5);
      return logoImg;
      
    default:
      return logoImg;
  }
}

// Mở rộng calculatePosition cho 9 vị trí
function calculatePosition(
  baseWidth: number,
  baseHeight: number,
  logoWidth: number,
  logoHeight: number,
  position: LogoPosition,
  padding: number
): { x: number; y: number } {
  const positions = {
    'top-left': { x: padding, y: padding },
    'top-center': { x: (baseWidth - logoWidth) / 2, y: padding },
    'top-right': { x: baseWidth - logoWidth - padding, y: padding },
    'center-left': { x: padding, y: (baseHeight - logoHeight) / 2 },
    'center': { x: (baseWidth - logoWidth) / 2, y: (baseHeight - logoHeight) / 2 },
    'center-right': { x: baseWidth - logoWidth - padding, y: (baseHeight - logoHeight) / 2 },
    'bottom-left': { x: padding, y: baseHeight - logoHeight - padding },
    'bottom-center': { x: (baseWidth - logoWidth) / 2, y: baseHeight - logoHeight - padding },
    'bottom-right': { x: baseWidth - logoWidth - padding, y: baseHeight - logoHeight - padding },
  };
  return positions[position] || positions['bottom-right'];
}
```

### File 4: `src/components/multichannel/LogoOptionsPanel.tsx` (Mới)

**Component UI chọn logo options:**

```typescript
// Visual 3x3 grid picker cho vị trí
// Style preset cards với icon preview
// Size buttons + custom slider
// Opacity slider
// Live preview thumbnail
```

---

## Giao diện người dùng mới

**Logo Options Panel trong UnifiedImageGenerator:**

```text
┌─────────────────────────────────────────┐
│ 🎨 Logo Options                          │
├─────────────────────────────────────────┤
│ Vị trí:                                  │
│ ┌───┬───┬───┐                           │
│ │ ◯ │ ◯ │ ◯ │  ← Visual position grid  │
│ ├───┼───┼───┤                           │
│ │ ◯ │ ◯ │ ◯ │                           │
│ ├───┼───┼───┤                           │
│ │ ◯ │ ◯ │ ● │  ● = selected            │
│ └───┴───┴───┘                           │
├─────────────────────────────────────────┤
│ Phong cách:                              │
│ [Clean] [Shadow✓] [Glass] [Pill] [Subtle]│
├─────────────────────────────────────────┤
│ Kích thước:                              │
│ [Nhỏ] [Vừa✓] [Lớn] [Tùy chỉnh: ━━●━━ 15%]│
├─────────────────────────────────────────┤
│ Độ trong suốt:                           │
│ ━━━━━━━━━━━━━━━━━━●━━ 100%              │
└─────────────────────────────────────────┘
```

---

## Files cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `src/hooks/useAutoImageGeneration.ts` | Thêm params logoStyle, logoSize, logoOpacity |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Thêm UI controls, state mới, cập nhật IMAGE_STYLES |
| `supabase/functions/overlay-logo-canvas/index.ts` | Thêm logic xử lý style, mở rộng position 9 điểm |
| `src/components/multichannel/LogoOptionsPanel.tsx` | **MỚI** - Component visual picker |
| `src/hooks/useSocialImageGeneration.ts` | Cập nhật types |

---

## Độ ưu tiên triển khai

1. **Phase 1** (Quan trọng nhất):
   - Mở rộng 9 vị trí
   - Thêm tùy chọn kích thước (slider)
   - Thêm opacity control

2. **Phase 2** (Nâng cao):
   - Style presets (shadow, glass, pill...)
   - Visual position picker component
   - Live preview

---

## Lợi ích sau khi hoàn thành

1. ✅ Logo hòa hợp với ảnh hơn (shadow, glass effects)
2. ✅ Nhiều vị trí linh hoạt (9 điểm thay vì 4)
3. ✅ Kích thước tùy chỉnh (5%-30%)
4. ✅ Watermark mode (opacity thấp)
5. ✅ Giao diện visual dễ dùng (grid picker)
6. ✅ Professional output quality

