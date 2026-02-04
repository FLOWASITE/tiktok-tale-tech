

# Kế hoạch: Triển khai Canvas API Text Overlay - 100% Accuracy

## Tổng quan vấn đề

### Hiện trạng
- Edge function `overlay-text-canvas` đang dùng **ImageScript** nhưng thư viện này **KHÔNG có native text rendering**
- Chỉ vẽ được background block, text không được render
- Frontend đã có toggle `useCanvasFallback` và logic gọi function nhưng text không xuất hiện

### Giải pháp
Thay thế ImageScript bằng **`og_edge`** - thư viện được Supabase chính thức khuyến nghị cho việc render text/image. Hỗ trợ:
- Custom fonts (Google Fonts)
- Flexbox layout
- Text styling (color, size, weight)
- Background styling

## Kiến trúc mới

```text
┌──────────────────────────────────────────────────────────────┐
│                    Frontend Toggle                            │
│         [✓] Canvas Fallback - 100% text accuracy             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              generate-brand-image (Bước 1)                   │
│   Tạo ảnh nền (background_only) không có text                │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              overlay-text-canvas (Bước 2) - UPGRADED         │
│   1. Fetch ảnh nền từ URL                                    │
│   2. Load Google Font (Be Vietnam Pro - font Việt Nam)       │
│   3. Render text overlay dùng og_edge ImageResponse          │
│   4. Return ảnh cuối cùng với text chính xác 100%            │
└───────────────────────────────────────────────────────────────┘
```

## Chi tiết kỹ thuật

### 1. Cập nhật Edge Function `overlay-text-canvas`

Thay thế hoàn toàn implementation cũ bằng `og_edge`:

**Thư viện mới:**
- `og_edge@0.0.4` - Render text/image chính thức từ Supabase docs
- React JSX để định nghĩa layout
- Google Fonts loading cho tiếng Việt (Be Vietnam Pro)

**Các tính năng:**
- **Position**: center, top, bottom, top-left, bottom-right
- **Typography**: modern, classic, bold, minimal → map sang font styles
- **Text color**: Tự động contrast với background
- **Background overlay**: Semi-transparent cho readability
- **Word wrap**: Tự động wrap text dài

### 2. File cần thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/overlay-text-canvas/index.ts` | Viết lại hoàn toàn dùng og_edge |
| `supabase/functions/overlay-text-canvas/handler.tsx` | Mới - React component cho ImageResponse |

### 3. Logic xử lý chi tiết

**Bước 1: Load Google Font**
```typescript
async function loadGoogleFont(text: string): Promise<ArrayBuffer> {
  const font = 'Be+Vietnam+Pro:wght@400;600;700';
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    return await response.arrayBuffer();
  }
  throw new Error('Failed to load font');
}
```

**Bước 2: Position Mapping**
```typescript
const POSITION_STYLES: Record<TextPosition, React.CSSProperties> = {
  'center': { alignItems: 'center', justifyContent: 'center' },
  'top': { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 60 },
  'bottom': { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60 },
  'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start', padding: 60 },
  'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 60 },
};
```

**Bước 3: Typography Mapping**
```typescript
const TYPOGRAPHY_STYLES: Record<TypographyStyle, { fontWeight: number; letterSpacing: string; textTransform?: string }> = {
  'modern': { fontWeight: 600, letterSpacing: '-0.02em' },
  'classic': { fontWeight: 400, letterSpacing: '0.02em' },
  'bold': { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' },
  'minimal': { fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' },
};
```

**Bước 4: Composite với background image**
```typescript
return new ImageResponse(
  (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex',
      backgroundImage: `url(${baseImageUrl})`,
      backgroundSize: 'cover',
      ...POSITION_STYLES[position]
    }}>
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: '20px 40px',
        borderRadius: 12,
        ...TYPOGRAPHY_STYLES[typographyStyle],
      }}>
        <span style={{ color: textColor, fontSize }}>{text}</span>
      </div>
    </div>
  ),
  { width: imageWidth, height: imageHeight, fonts }
);
```

### 4. Xử lý đặc biệt

**Vietnamese Font Support:**
- Sử dụng "Be Vietnam Pro" từ Google Fonts
- Font hỗ trợ đầy đủ ký tự tiếng Việt với dấu

**Auto Font Size:**
- Tự động scale font size dựa trên độ dài text và kích thước ảnh
- Text ngắn (<20 chars): 48-64px
- Text trung bình (20-50 chars): 32-48px
- Text dài (>50 chars): 24-32px

**Background Overlay:**
- Semi-transparent black/white tùy theo contrast
- Rounded corners cho style hiện đại
- Padding dynamic theo text length

### 5. Cấu trúc file mới

```text
supabase/functions/overlay-text-canvas/
├── index.ts        # Main handler, validate input
├── handler.tsx     # React component for ImageResponse
└── utils.ts        # Font loading, position helpers
```

## Lợi ích

1. **100% Text Accuracy** - Text được render chính xác từng ký tự
2. **Vietnamese Support** - Font Be Vietnam Pro hỗ trợ đầy đủ tiếng Việt
3. **Consistent Styling** - Typography styles giống preview trên UI
4. **No AI Hallucination** - Không phụ thuộc AI để render text
5. **Fast & Reliable** - Thời gian xử lý < 2 giây

## Testing Plan

1. Test với text ngắn tiếng Việt: "Giảm 50%"
2. Test với text dài: "Khám phá bí mật làm đẹp từ thiên nhiên"
3. Test tất cả 5 positions
4. Test tất cả 4 typography styles
5. Verify ảnh output có text rõ ràng, đúng vị trí

