import { CarouselSlide, textContentToString } from '@/types/carousel';

export function formatSlidePrompt(slide: CarouselSlide): string {
  return `[Slide ${slide.slideNumber}]

[1] Mục tiêu slide:
${slide.objective}

[2] Nội dung chữ xuất hiện trên ảnh:
${textContentToString(slide.textContent)}

[3] Phong cách thiết kế:
${slide.designStyle}

[4] Màu sắc – bố cục:
${slide.colorLayout}

[5] Tỉ lệ khung hình:
${slide.aspectRatio}

[6] Yêu cầu kỹ thuật:
${slide.technicalRequirements}

---
PROMPT HOÀN CHỈNH:
${slide.fullPrompt}`;
}

export function formatAllSlidesPrompt(slides: CarouselSlide[]): string {
  return slides.map((slide) => formatSlidePrompt(slide)).join('\n\n========================================\n\n');
}

export function getSlideObjectiveLabel(slideNumber: number, totalSlides: number): string {
  if (slideNumber === 1) return 'Hook - Gây sốc, tò mò';
  if (slideNumber === 2) return 'Nêu vấn đề';
  if (slideNumber === 3 || slideNumber === 4) return 'Giải thích';
  if (slideNumber === totalSlides - 1) return 'Giải pháp / Lời khuyên';
  if (slideNumber === totalSlides) return 'CTA - Kêu gọi hành động';
  return 'Hậu quả / Lợi ích';
}
