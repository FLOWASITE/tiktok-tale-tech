
## Yêu cầu
User muốn một tài liệu chi tiết step-by-step về cách hệ thống Flowa tạo Carousel — để chuyên gia bên ngoài có thể đánh giá. Đây là **research/documentation task**, không phải implementation. Cần đọc code thực tế để mô tả chính xác.

## Phạm vi cần khảo sát
1. **Frontend trigger**: Form tạo carousel (`useCarousels.ts` → `generate-carousel` edge function)
2. **Edge function `generate-carousel`**: orchestrator logic
3. **Pipeline tạo nội dung slides**: prompt strategy, model dùng, structure output
4. **Pipeline tạo prompt ảnh từng slide**: Visual Engine V3, style presets, brand context injection
5. **Pipeline render ảnh**: provider (Lovable AI Gateway / PoYo), text-in-prompt rendering, fallback, retry
6. **Style preset system**: `carousel_style_presets` DB → design tokens → overlay config
7. **Persistence + progress**: DB schema, realtime updates, gallery
8. **Memory references**: `mem://features/carousel/comprehensive-v4-system-vn`, `mem://image-system/architecture-vn`, `mem://image-system/visual-specs-vn`, `mem://features/multichannel/image-generation-modes-vn`

## Files cần đọc (read-only)
- `supabase/functions/generate-carousel/index.ts` (+ subfolders nếu có)
- `supabase/functions/_shared/image-prompt-*.ts` (đã có overview)
- `src/lib/carouselStylePresets.ts` (đã có)
- `src/types/carousel.ts`
- `src/components/carousel/*` (form + viewer chính)
- `src/utils/parseCarouselSlides.ts` (đã có)
- 3 memory files về carousel + image system

## Cách trình bày
Vì là "đánh giá bởi chuyên gia", output sẽ là một **technical document tiếng Việt** trình bày trong chat (không tạo file), gồm các phần:

1. **Tổng quan kiến trúc** (sơ đồ ASCII data flow)
2. **Step 1 — User Input & Form Validation**: tham số đầu vào, brand context binding
3. **Step 2 — Orchestration trong edge function `generate-carousel`**: queue/sequential, error handling, cost tracking
4. **Step 3 — Sinh nội dung text từng slide** (Sequential Kinetics): prompt template, model (gpt-5/gemini), schema output 6 fields/slide, hook→problem→explain→solution→CTA
5. **Step 4 — Build Image Prompt cho từng slide** (Visual Engine V3): style preset lookup, design tokens, brand color sandwich, text-in-prompt rendering rules, safe zones, aspect ratio
6. **Step 5 — Gọi AI Image Provider**: Gemini 2.5 Flash Image (Nano Banana) chính, PoYo fallback, retry/early-exit polling, base64 → storage upload
7. **Step 6 — Persistence**: bảng `carousels`, `carousel_images` (nếu có), realtime channel, progress UI
8. **Step 7 — Hiển thị + Gallery**: viewer, edit, regenerate
9. **Điểm mạnh / Điểm cần đánh giá** (cho chuyên gia): consistency cross-slides, vietnamese text accuracy, brand fidelity, cost/latency, dedup
10. **Tham số kỹ thuật chi tiết**: model IDs, token budget, timeout, retry counts

Plan này không cần ask_questions — yêu cầu rõ ràng. Sau khi user approve, sẽ đọc các file trên rồi trả về tài liệu hoàn chỉnh trong 1 message (không cần thay đổi code, không cần tạo file artifact trừ khi user yêu cầu PDF).
