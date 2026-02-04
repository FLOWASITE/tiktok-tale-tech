
# Kế hoạch: Sửa lỗi Text không hiển thị trên ảnh Social Graphics

## Phân tích nguyên nhân

Qua kiểm tra logs và code, tôi đã xác định được 2 vấn đề chính:

### Vấn đề 1: Chế độ Single Mode không hỗ trợ Canvas Fallback
- **Hook `useSocialImageGeneration.ts`** (dùng cho Single mode) chỉ gọi `generate-brand-image` mà **không có** logic gọi `overlay-text-canvas` sau đó
- Khi user chọn chế độ Single + "Có text", hệ thống hoàn toàn dựa vào AI để render text - điều này có thể không chính xác

### Vấn đề 2: Canvas Fallback mặc định là TẮT
- Toggle `useCanvasFallback` được khởi tạo là `false` 
- Người dùng phải chủ động bật toggle này để đảm bảo text hiển thị chính xác

## Giải pháp

### Thay đổi 1: Bật Canvas Fallback mặc định
Thay đổi giá trị mặc định của `useCanvasFallback` từ `false` → `true` khi chế độ "Có text" được chọn.

**File:** `src/components/multichannel/UnifiedImageGenerator.tsx`
```typescript
// Thay đổi khởi tạo
const [useCanvasFallback, setUseCanvasFallback] = useState(true); // Mặc định BẬT
```

### Thay đổi 2: Thêm Canvas Fallback vào Single Mode
Cập nhật hook `useSocialImageGeneration.ts` để hỗ trợ canvas text overlay:

**File:** `src/hooks/useSocialImageGeneration.ts`

Thêm logic sau khi tạo ảnh:
1. Nếu `useCanvasFallback = true` và `imageContentType = 'with_text'`:
2. Gọi `generate-brand-image` với `imageContentType: 'background_only'` (tạo ảnh nền không có text)
3. Gọi `overlay-text-canvas` để thêm text chính xác 100%

### Thay đổi 3: Truyền `useCanvasFallback` từ UI vào Single Mode
Cập nhật `UnifiedImageGenerator.tsx` để truyền `useCanvasFallback` vào `handleSingleGenerate`:

```typescript
const imageUrl = await singleGen.generateImage({
  // ...existing params
  useCanvasFallback, // Thêm param mới
});
```

### Thay đổi 4: Import channel config để lấy dimensions
Thêm import `CHANNEL_IMAGE_CONFIG` vào `useSocialImageGeneration.ts` để lấy kích thước ảnh chính xác cho từng kênh.

## Chi tiết kỹ thuật

### File 1: `src/hooks/useSocialImageGeneration.ts`

```typescript
// Thêm import
import { CHANNEL_IMAGE_CONFIG } from '@/config/channelImageConfig';

// Thêm param vào interface
interface GenerateImageParams {
  // ...existing params
  useCanvasFallback?: boolean; // NEW
}

// Trong generateImage function - sau khi có imageUrl từ generate-brand-image:
if (useCanvasFallback && imageContentType === 'with_text' && textToInclude) {
  // Get dimensions for channel
  const channelConfig = channel ? CHANNEL_IMAGE_CONFIG[channel] : null;
  const [widthStr, heightStr] = (channelConfig?.size || '1200x630').split('x');
  const imageWidth = parseInt(widthStr, 10) || 1200;
  const imageHeight = parseInt(heightStr, 10) || 630;

  // Call canvas overlay
  const { data: overlayData, error: overlayError } = await supabase.functions.invoke('overlay-text-canvas', {
    body: {
      baseImageUrl: imageUrl,
      text: textToInclude,
      position: textPosition || 'center',
      typographyStyle: typographyStyle || 'modern',
      textColor: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      contentId,
      channel,
      imageWidth,
      imageHeight,
    },
  });

  if (!overlayError && overlayData?.success) {
    imageUrl = overlayData.imageUrl;
  }
}
```

### File 2: `src/components/multichannel/UnifiedImageGenerator.tsx`

```typescript
// Line 241: Thay đổi giá trị mặc định
const [useCanvasFallback, setUseCanvasFallback] = useState(true);

// Line 420-436: Thêm useCanvasFallback vào handleSingleGenerate
const imageUrl = await singleGen.generateImage({
  // ...existing params
  useCanvasFallback, // NEW
});
```

## Lợi ích

1. **100% Text Accuracy** - Text luôn hiển thị chính xác nhờ Satori render
2. **Tự động kích hoạt** - Người dùng không cần bật toggle thủ công
3. **Hỗ trợ cả Single và Batch mode** - Đồng nhất trải nghiệm
4. **Tiếng Việt hoàn hảo** - Font Be Vietnam Pro hỗ trợ đầy đủ dấu

## Testing

Sau khi triển khai, cần test:
1. Tạo ảnh Single mode với "Có text" → Text phải hiển thị chính xác
2. Tạo ảnh Batch mode với "Có text" → Text phải hiển thị chính xác
3. Kiểm tra text tiếng Việt có dấu: "Giảm 50% hôm nay!"
4. Kiểm tra tất cả 5 vị trí text (center, top, bottom, top-left, bottom-right)
