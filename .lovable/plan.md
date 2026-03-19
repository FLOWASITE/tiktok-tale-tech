

# Tối ưu Prompt để các slide có liên quan với nhau

## Phân tích hiện trạng

Hiện tại `sharedVisualWorld` chỉ trích xuất từ **slide 1** dòng `"consistent with previous slides: ..."`. Đây là một chuỗi ngắn (vd: `"luxury spa environment"`) — thiếu chi tiết để đảm bảo 3 slide song song tạo ra hình ảnh thực sự liên quan.

Vấn đề cốt lõi: khi chạy 3 slide song song, mỗi slide chỉ nhận được 1 chuỗi mơ hồ như `"same spa photography style"` → AI tự do diễn giải → kết quả khác nhau về ánh sáng, góc chụp, palette.

## Giải pháp: Xây dựng "Series Bible" từ tất cả slides

Thay vì chỉ lấy chuỗi ngắn từ slide 1, **tổng hợp một "Series Bible"** từ toàn bộ `fullPrompt` của tất cả slides — trích xuất các yếu tố chung (palette, setting, lighting, style) và truyền cho mọi slide.

## Chi tiết kỹ thuật

### File 1: `src/components/carousel/CarouselGenerationTracker.tsx`

Thay hàm extract `sharedVisualWorld` hiện tại (chỉ regex 1 slide) bằng hàm mới `buildSeriesBible`:

```typescript
function buildSeriesBible(slides: CarouselSlide[]): string {
  // Collect ALL "consistent with..." directives from all slides
  const consistencyParts: string[] = [];
  slides.forEach(s => {
    const match = s.fullPrompt.match(/consistent with (?:previous slides|series):\s*(.+?)$/im);
    if (match) consistencyParts.push(match[1].trim());
  });
  const uniqueParts = [...new Set(consistencyParts)];

  // Extract common visual elements from slide 1's full prompt
  const slide1Prompt = slides[0]?.fullPrompt || '';
  
  // Build comprehensive series bible
  const bible = [
    `SERIES VISUAL BIBLE (applies to ALL slides):`,
    uniqueParts.length > 0 
      ? `Visual world: ${uniqueParts.join('. ')}.` 
      : `Visual world: ${slides[0]?.designStyle || 'professional photography'}.`,
    `Total slides in series: ${slides.length}.`,
    `All slides share the SAME: lighting direction, color temperature, photography style, environment/setting, and visual mood.`,
    `Reference scene (slide 1): "${slide1Prompt.slice(0, 200)}..."`,
  ].join('\n');

  return bible;
}
```

### File 2: `supabase/functions/generate-carousel-image/index.ts`

Cập nhật phần VISUAL CONTINUITY trong `buildBackgroundPrompt` (dòng ~985-1017):

1. Khi `previousSceneDescription` dài (>100 ký tự, tức là Series Bible), sử dụng trực tiếp thay vì wrap trong template
2. Thêm directive yêu cầu AI **tham chiếu chéo** giữa các slide:

```typescript
if (seamlessContext.previousSceneDescription) {
  const desc = seamlessContext.previousSceneDescription;
  
  // If it's a Series Bible (long, comprehensive), use directly
  if (desc.length > 100) {
    parts.push(desc);
  } else {
    // Short description — wrap with continuity instruction
    if (isSeamless) {
      parts.push(`VISUAL WORLD: "${desc}". Same environment, lighting, visual flow, color temperature. Left edge connects to right edge of previous slide.`);
    } else {
      parts.push(`VISUAL WORLD: "${desc}". Same environment, lighting, photography style, color temperature across all slides.`);
    }
  }
}
```

3. Thêm **slide context block** — mô tả ngắn gọn nội dung các slide khác trong cùng batch để AI biết bối cảnh toàn series:

Trong `CarouselGenerationTracker.tsx`, truyền thêm `siblingSlidesSummary` vào request body:

```typescript
// Build sibling context for visual coherence
const siblingsSummary = carousel.slides_content
  .map(s => `Slide ${s.slideNumber}: ${s.objective}`)
  .join(' | ');
```

Truyền vào `seamlessContext.siblingSlidesSummary` và trong `buildBackgroundPrompt` thêm:

```
SERIES CONTEXT: This carousel contains: ${siblingsSummary}
Your slide must visually belong to this same story arc.
```

## Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| `CarouselGenerationTracker.tsx` | Thay `sharedVisualWorld` regex đơn giản → `buildSeriesBible()` tổng hợp từ tất cả slides + thêm `siblingSlidesSummary` |
| `generate-carousel-image/index.ts` | Xử lý Series Bible dài, thêm sibling context vào prompt |

## Kết quả mong đợi

- Mỗi slide nhận được bối cảnh đầy đủ về toàn bộ series (palette, setting, lighting, style) thay vì chỉ 1 câu ngắn
- AI biết được nội dung các slide khác → tạo hình ảnh liên quan về mặt kể chuyện
- Vẫn giữ batch parallel 3 slides — không cần chờ nhau

