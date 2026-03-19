
Mục tiêu: sửa dứt điểm 2 lỗi bạn gặp (“ảnh các slide không cùng chủ đề/không liên quan nhau” + “text lộn xộn/mất chữ”).

1) Chẩn đoán đã xác nhận từ code + dữ liệu hiện tại
- `generate-carousel` đang dùng Prompt Registry nhưng DB chỉ có `prompt_key=system` cho function này, thiếu `generate`.
- Vì thiếu prompt `generate`, `userPrompt` có thể thành rỗng => AI không nhận đủ context topic/style => prompt ảnh nền dễ generic/lệch chủ đề.
- Cache input của `generate-carousel` chưa chứa `carouselStyle`, `visualPreset`, `prompt schema version` => có thể tái dùng kết quả cũ chất lượng thấp.
- `overlay-text-canvas` tải font theo `displayText` (thường chỉ headline), nhưng render cả `textLayers` (subtitle/caption/dataLabel) => thiếu glyph tiếng Việt ở các layer còn lại, gây mất chữ.
- Ở carousel overlay mode vẫn có các chỗ fit font với min 12/14 => chữ nhỏ và bố cục thiếu nhất quán.

2) Kế hoạch triển khai (code)
A. Hardening prompt generation (ưu tiên cao nhất)
- File: `supabase/functions/generate-carousel/index.ts`
- Thêm helper “safe prompt fetch”:
  - Lấy prompt từ registry theo từng key.
  - Nếu thiếu/rỗng/quá ngắn => fallback về hardcoded prompt hiện có trong file (không để trống).
- Chỉ dùng prompt registry khi đủ cả `system` + `generate` hợp lệ.
- Log rõ nguồn prompt (`registry` vs `fallback`) để debug.

B. Chặn cache trả kết quả cũ/lệch
- File: `supabase/functions/generate-carousel/index.ts`
- Mở rộng `cacheInput` thêm:
  - `carouselStyle`, `visualPreset`, `outputLang`, hash `brandGuideline`, `promptSchemaVersion` (ví dụ `carousel_v4`).
- Điều chỉnh dedup gần thời gian tạo để so cả style/preset (tránh trả nhầm bản cũ cùng topic).

C. Chuẩn hóa đầu ra slide trước khi lưu DB
- File: `supabase/functions/generate-carousel/index.ts`
- Thêm bước `normalizeCarouselSlides()`:
  - Ép `textContent` về object chuẩn `{headline, subtitle?, caption?, dataValue?, dataLabel?}`.
  - Cắt/chuẩn hóa độ dài subtitle/caption theo preset để tránh text quá dài.
  - Bảo đảm `objective` không rỗng; fallback bằng `getSlideObjective(...)`.
  - Validate `fullPrompt` đủ chi tiết (>=30 từ, không chứa chỉ dẫn vẽ text). Nếu fail thì sửa bằng rule-based sanitize.

D. Khóa chủ đề khi tạo ảnh nền (safeguard)
- Files:
  - `src/hooks/useImageGeneration.ts`
  - `src/components/CarouselViewer.tsx`
  - `supabase/functions/generate-carousel-image/index.ts`
- Truyền thêm `carouselTopic` + `slideObjective` vào request generate ảnh.
- Trong `buildBackgroundPrompt`, thêm directive ngắn:
  - “Scene must stay directly relevant to topic X and objective Y; no abstract generic background unrelated to topic.”

E. Sửa text overlay mất chữ/lộn xộn
- File: `supabase/functions/overlay-text-canvas/index.ts`
- Khi có `textLayers`, dùng `fontLoadText = join(all layer text)` để load font (không chỉ headline).
- Nâng min font thực tế trong carousel path lên 16 (bỏ các call min 12/14).
- Chuẩn hóa layer spacing/line-height theo role để tránh “vỡ” bố cục giữa slide.

F. Cập nhật Prompt Registry (để không tái lỗi)
- Tạo migration SQL upsert prompt `generate-carousel` với đủ 2 key:
  - `system` (bản mới, chuẩn structured + fullPrompt rules)
  - `generate` (luôn truyền topic/platform/style/slideCount rõ ràng)
- Giữ fallback trong code để an toàn nếu registry bị thiếu lần nữa.

3) Tiêu chí nghiệm thu
- Tạo mới carousel cùng topic, style educational:
  - 100% slide giữ cùng “thế giới” hình ảnh (setting, palette, mood).
  - Không còn prompt nền generic kiểu abstract không liên quan topic.
  - Text không mất ký tự tiếng Việt, không bị quá nhỏ khó đọc.
  - Flow giữa slide nhất quán (hook -> body -> CTA rõ ràng).

4) Test E2E sau khi làm
- Chạy “Tạo Prompt + Ảnh” với: “5 Tips Marketing cho Spa”, style `educational`, preset `gradient`.
- Soát 3 điểm:
  1) cùng palette + style xuyên suốt;
  2) text render sạch (không lặp/mất chữ, size ổn);
  3) ảnh bám chủ đề từng slide.
