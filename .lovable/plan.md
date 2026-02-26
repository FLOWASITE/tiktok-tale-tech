

## Xóa trạng thái tiến trình cũ khi vào lại form Tạo mới đa kênh

### Vấn đề

Khi người dùng quay lại trang "Tạo mới đa kênh", các thanh tiến trình (progress bars) và trạng thái streaming từ lần tạo trước vẫn còn hiển thị. Nguyên nhân: React Router giữ lại component state khi navigate, và không có logic reset state khi component mount lại.

### Nguyên nhân kỹ thuật

1. Hook `useStreamingCoreContent` có hàm `reset()` nhưng **không bao giờ được gọi**
2. Hook `useStreamingGeneration` cũng giữ state cũ (streamingTexts, progress)
3. State `generationState`, `sseProgress` ở `MultiChannelCreate.tsx` không được reset khi remount
4. Không có `key` prop trên `MultiChannelFormWizard` để force remount

### Giải pháp

**File 1: `src/pages/MultiChannelCreate.tsx`**
- Thêm `key` prop dựa trên `location.key` cho component `MultiChannelFormWizard` -- khi navigate lại cùng route, React Router tạo location.key mới, buộc component remount hoàn toàn, reset tất cả state bên trong (bao gồm `useStreamingCoreContent`)
- Reset `generationState` về `'idle'` và `sseProgress` về `null` trong useEffect khi `location.key` thay đổi

**File 2: `src/hooks/useStreamingGeneration.ts`**
- Thêm logic cleanup khi unmount: abort controller, reset state

Cách tiếp cận dùng `key={location.key}` là đơn giản và triệt để nhất -- force React unmount/remount toàn bộ wizard, đảm bảo mọi state đều sạch.

