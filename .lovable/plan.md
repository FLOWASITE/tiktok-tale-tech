

# Kế hoạch: Thêm phong cách chữ không khung (No Border/Background)

## Mục tiêu
Thêm các phong cách typography mới cho ảnh Social Graphics mà **không có nền/khung bao quanh chữ** - chữ sẽ hiển thị trực tiếp trên ảnh.

## Phân tích hiện tại

Hiện tại có 4 phong cách chữ, **tất cả đều có nền đen mờ** (`rgba(0, 0, 0, 0.6)`) và `borderRadius`:

| Style | Mô tả | Có nền |
|-------|-------|--------|
| `modern` | Sans-serif, semibold | ✅ Có |
| `classic` | Serif, medium | ✅ Có |
| `bold` | Sans, uppercase, black | ✅ Có |
| `minimal` | Sans, light, spaced | ✅ Có |

## Giải pháp đề xuất

Thêm **3 phong cách mới không có khung/nền**, sử dụng **text-shadow** để chữ vẫn đọc được trên mọi background:

| Style mới | Mô tả | Hiệu ứng |
|-----------|-------|----------|
| `clean` | Chữ trần không nền | Text-shadow nhẹ để tạo độ tương phản |
| `outline` | Viền chữ (stroke) | Viền trắng/đen quanh chữ, không có nền |
| `glow` | Chữ phát sáng | Text-shadow glow effect, không nền |

## Chi tiết kỹ thuật

### File 1: `src/hooks/useSocialImageGeneration.ts`

Mở rộng TypographyStyle type:

```typescript
// Cũ: 4 styles có khung
export type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal';

// Mới: Thêm 3 styles không khung
export type TypographyStyle = 
  | 'modern' | 'classic' | 'bold' | 'minimal'  // Có khung
  | 'clean' | 'outline' | 'glow';               // Không khung
```

### File 2: `supabase/functions/overlay-text-canvas/index.ts`

Thêm logic xử lý styles không có nền:

```typescript
// Thêm hàm kiểm tra style có nền hay không
function hasBackground(style: TypographyStyle): boolean {
  const noBackgroundStyles = ['clean', 'outline', 'glow'];
  return !noBackgroundStyles.includes(style);
}

// Typography styles mapping - mở rộng
function getTypographyStyles(style: TypographyStyle): {
  fontWeight: number;
  letterSpacing: string;
  textTransform: string;
  textShadow?: string;  // NEW: text-shadow cho styles không nền
} {
  switch (style) {
    // --- Styles có khung (giữ nguyên) ---
    case 'modern':
      return { fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'none' };
    case 'classic':
      return { fontWeight: 400, letterSpacing: '0.02em', textTransform: 'none' };
    case 'bold':
      return { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' };
    case 'minimal':
      return { fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase' };
      
    // --- Styles KHÔNG khung (mới) ---
    case 'clean':
      return { 
        fontWeight: 600, 
        letterSpacing: '-0.01em', 
        textTransform: 'none',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)'
      };
    case 'outline':
      return { 
        fontWeight: 700, 
        letterSpacing: '0.02em', 
        textTransform: 'none',
        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 2px 2px 4px rgba(0,0,0,0.5)'
      };
    case 'glow':
      return { 
        fontWeight: 600, 
        letterSpacing: '0.01em', 
        textTransform: 'none',
        textShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4), 2px 2px 8px rgba(0,0,0,0.8)'
      };
      
    default:
      return { fontWeight: 600, letterSpacing: '-0.02em', textTransform: 'none' };
  }
}

// Cập nhật buildElement để hỗ trợ không có nền
function buildElement(...) {
  const showBackground = hasBackground(typographyStyle);
  
  return {
    // ...
    children: {
      type: 'div',
      props: {
        style: {
          // Chỉ áp dụng background nếu style có nền
          backgroundColor: showBackground ? backgroundColor : 'transparent',
          padding: showBackground ? `${padding / 2}px ${padding}px` : 0,
          borderRadius: showBackground ? 16 : 0,
          // ...
        },
        children: {
          type: 'span',
          props: {
            style: {
              // Thêm textShadow cho styles không nền
              textShadow: typographyConfig.textShadow || 'none',
              // ...
            }
          }
        }
      }
    }
  };
}
```

### File 3: `src/components/multichannel/VisualTextPositionPreview.tsx`

Thêm các options mới vào UI:

```typescript
const TYPOGRAPHY_OPTIONS: { 
  value: TypographyStyle; 
  label: string; 
  description: string;
  fontClass: string; 
  icon: React.ReactNode;
  sampleText: string;
  hasBackground: boolean;  // NEW: đánh dấu có nền hay không
}[] = [
  // Styles có khung - giữ nguyên
  { value: 'modern', label: 'Modern', ... hasBackground: true },
  { value: 'classic', label: 'Classic', ... hasBackground: true },
  { value: 'bold', label: 'Bold', ... hasBackground: true },
  { value: 'minimal', label: 'Minimal', ... hasBackground: true },
  
  // Styles KHÔNG khung - MỚI
  { 
    value: 'clean', 
    label: 'Clean', 
    description: 'Chữ trần, đổ bóng',
    fontClass: 'font-sans font-semibold drop-shadow-lg', 
    icon: <Type className="w-4 h-4" />,
    sampleText: 'Không khung',
    hasBackground: false,
  },
  { 
    value: 'outline', 
    label: 'Outline', 
    description: 'Viền chữ nổi bật',
    fontClass: 'font-sans font-bold', 
    icon: <Square className="w-4 h-4" />,
    sampleText: 'Viền chữ',
    hasBackground: false,
  },
  { 
    value: 'glow', 
    label: 'Glow', 
    description: 'Chữ phát sáng',
    fontClass: 'font-sans font-semibold', 
    icon: <Sparkles className="w-4 h-4" />,
    sampleText: '✨ Phát sáng',
    hasBackground: false,
  },
];
```

### File 4: `src/components/multichannel/TextPositionMockup.tsx`

Cập nhật để preview đúng các styles không khung.

---

## Giao diện người dùng mới

```text
┌────────────────────────────────────────────────┐
│ Kiểu chữ                                       │
├────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐       │
│ │ 📝 Modern       │  │ 📝 Classic      │  ← Có nền
│ │ Thiết kế hiện   │  │ Phong cách      │       │
│ │ đại             │  │ cổ điển         │       │
│ └─────────────────┘  └─────────────────┘       │
│                                                │
│ ┌─────────────────┐  ┌─────────────────┐       │
│ │ 📝 Bold         │  │ 📝 Minimal      │  ← Có nền
│ │ NỔI BẬT         │  │ TỐI GIẢN        │       │
│ └─────────────────┘  └─────────────────┘       │
├────────────────────────────────────────────────┤
│ 🚫 Không khung (mới)                           │
│ ┌─────────────────┐  ┌─────────────────┐       │
│ │ ✨ Clean        │  │ 🔲 Outline      │       │
│ │ Không khung     │  │ Viền chữ        │  ← Không nền
│ └─────────────────┘  └─────────────────┘       │
│                                                │
│ ┌─────────────────┐                            │
│ │ 💫 Glow         │                            │
│ │ ✨ Phát sáng    │                       ← Không nền
│ └─────────────────┘                            │
└────────────────────────────────────────────────┘
```

---

## Files cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `src/hooks/useSocialImageGeneration.ts` | Mở rộng TypographyStyle type |
| `src/hooks/useAutoImageGeneration.ts` | Cập nhật type nếu cần |
| `supabase/functions/overlay-text-canvas/index.ts` | Thêm logic không nền + text-shadow |
| `src/components/multichannel/VisualTextPositionPreview.tsx` | Thêm UI options mới |
| `src/components/multichannel/TextPositionMockup.tsx` | Cập nhật preview mockup |

---

## Kỹ thuật text-shadow

Để chữ đọc được trên mọi nền mà không cần background box:

```css
/* Clean - Shadow đơn giản */
text-shadow: 2px 2px 4px rgba(0,0,0,0.8);

/* Outline - Viền 4 hướng */
text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, 
             -1px 1px 0 #000, 1px 1px 0 #000;

/* Glow - Phát sáng */
text-shadow: 0 0 10px rgba(255,255,255,0.8),
             0 0 20px rgba(255,255,255,0.6);
```

---

## Lợi ích

1. ✅ **Thẩm mỹ đa dạng** - Có thêm lựa chọn không khung nền
2. ✅ **Phù hợp với ảnh đẹp** - Không che mất background ảnh
3. ✅ **Vẫn đọc được** - Text-shadow đảm bảo contrast
4. ✅ **Phong cách hiện đại** - Glow/Outline rất phổ biến trên social media
5. ✅ **Tương thích ngược** - Các style cũ vẫn hoạt động bình thường

