

# Fix: Carousel Tracker không chuyển sang slide tiếp theo

## Phân tích nguyên nhân

Qua phân tích code và network logs, phát hiện 2 vấn đề chính:

### 1. `generateImage` không được memoize → Timer liên tục bị reset
- `useImageGeneration` hook tạo hàm `generateImage` mới mỗi lần render
- `runImageGeneration` (useCallback) phụ thuộc vào `generateImage` → identity thay đổi mỗi render
- Effect tại dòng 271 cleanup timer cũ và tạo timer 500ms mới mỗi render
- Kết hợp với `elapsed` timer (mỗi 1s), `tipIndex` (6s), `promptStep` (2.5s) → timer bị reset liên tục
- Khi timer cuối cùng fire được, generation có thể bị gián đoạn bởi closure cũ

### 2. Notification gửi 3 lần (trùng lặp)
- Network logs cho thấy `carousel_prompt_done` được POST 3 lần cho cùng carousel
- Nguyên nhân: component có thể bị unmount/remount hoặc ref bị reset

## Giải pháp

### File 1: `src/hooks/useImageGeneration.ts`
- Wrap `generateImage` trong `useCallback` để ổn định function identity
- Deps: `[]` (chỉ dùng state setters và supabase client, đều stable)

### File 2: `src/hooks/useCarouselImages.ts`  
- Wrap `saveImage` trong `useCallback` (đã có, nhưng kiểm tra deps đúng)

### File 3: `src/components/carousel/CarouselGenerationTracker.tsx`
- Thay đổi cách khởi chạy image generation: dùng `useRef` lưu `runImageGeneration` function thay vì đặt nó trong dependency của useEffect
- Sử dụng pattern `ref.current = fn` + effect chỉ check `promptDone && !imageGenStarted` mà không depend on function identity
- Fix notification trùng: thêm guard check trước insert (query existing notification trước khi insert)

## Chi tiết kỹ thuật

```typescript
// useImageGeneration.ts: memoize generateImage
const generateImage = useCallback(async (prompt, carouselId, slideNumber, options) => {
  // ... existing logic
}, []); // stable - only uses setState and supabase

// CarouselGenerationTracker.tsx: stable ref pattern
const runImageGenRef = useRef<() => Promise<void>>();
runImageGenRef.current = runImageGeneration; // update ref on every render

useEffect(() => {
  if (promptDone && !imageGenStarted) {
    const timer = setTimeout(() => runImageGenRef.current?.(), 500);
    return () => clearTimeout(timer);
  }
}, [promptDone, imageGenStarted]); // no function dependency!
```

Thay đổi này đảm bảo:
1. Timer 500ms chỉ set 1 lần khi `promptDone` chuyển sang `true`
2. Function luôn dùng phiên bản mới nhất qua ref
3. Generation loop chạy liên tục không bị gián đoạn

