

## Thay đổi mặc định tạo ảnh

### Thay đổi 1: Logo mặc định ở góc trên bên trái
**File: `src/components/multichannel/SimpleImageGenerator.tsx`**
- Đổi `logoPosition` mặc định từ `'bottom-right'` sang `'top-left'`

### Thay đổi 2: Mặc định có text trên ảnh
**File: `src/components/multichannel/SimpleImageGenerator.tsx`**
- Đổi `imageContentType` mặc định từ `'background_only'` sang `'with_text'`

### Thay đổi 3: Auto pipeline cũng áp dụng mặc định mới
**File: `src/hooks/useAutoImagePipeline.ts`**
- Thêm `includeLogo: true` + `logoPosition: 'top-left'` + `logoUrl: brandLogoUrl` vào `genOptions` khi có brand logo
- Thêm `imageContentType: 'with_text'` + `useCanvasFallback: true` để ảnh tự động tạo cũng có text

### Kết quả
- Khi mở trình tạo ảnh (SimpleImageGenerator): logo mặc định góc trên trái, có text
- Khi tạo ảnh tự động (auto pipeline): cũng áp dụng logo góc trên trái + có text
- Người dùng vẫn có thể thay đổi các tùy chọn này trước khi tạo

