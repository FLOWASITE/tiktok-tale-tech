

## Vấn đề (vùng khoanh đỏ)

Card "1. Tạo Prompt" trong `CarouselGenerationTracker.tsx` đang hiển thị 4 bước **fake** rotate theo `setInterval(2500ms)`:
- Phân tích chủ đề & ngữ cảnh
- Thiết kế cấu trúc carousel
- Viết nội dung từng slide
- Hoàn thiện prompt ảnh

→ Strikethrough giả + spinner "Hoàn thiện prompt ảnh" không phản ánh đúng pha streaming thật từ backend (`planning` / `ai_generating` / `parsing` / `compliance` / `revealing` / `finalizing`).

## Hướng sửa

Bind card này vào **real stream state** từ `CarouselGenerationContext` (đã có `phase`, `completedSlides`, `totalSlides`, `revealingSlide`, `partialSlides`).

### 1. Map phase backend → step UI
```
planning           → Phân tích chủ đề & ngữ cảnh
ai_generating      → Thiết kế cấu trúc carousel  
parsing/compliance → Viết nội dung từng slide
revealing          → Hiển thị slide N/M (live count)
finalizing/done    → Hoàn thiện prompt ảnh ✓
```

### 2. Refactor `CarouselGenerationTracker.tsx`
- Bỏ `setInterval` fake (lines 257-267) + state `promptStep`
- Đọc `activeJob` từ `useCarouselGeneration()` để lấy phase thật
- Step status (done/current/pending) tính từ phase thật, không phải timer
- Step "Viết nội dung từng slide" hiện sub-progress `slide N/M` khi phase=`revealing`
- Mỗi step done → check icon thật khi backend đã qua phase đó

### 3. Live preview slide vừa reveal (bonus)
- Dưới step "Viết nội dung", thêm 1 dòng nhỏ: "Slide vừa xong: [objective ngắn]" lấy từ `partialSlides[completedSlides-1]`
- Animate fade-in mỗi khi `completedSlides` tăng → user thấy "AI đang viết thật"

### 4. Loại bỏ bất đồng bộ với GlobalTracker
- Cả `CarouselGenerationTracker` (full-page) và `GlobalCarouselGenTracker` (mini) cùng đọc 1 nguồn `activeJob` → đảm bảo status text khớp nhau
- Khi `phase='syncing'` → hiển thị "Đang đồng bộ kết quả..." thay vì static label

## File sẽ chỉnh
- `src/components/carousel/CarouselGenerationTracker.tsx` — replace fake timer logic với context-driven phase mapping; thêm live slide preview line

## Kết quả
- Step 1 không còn nhấp nháy giả; check thật theo phase backend
- Khi đến phase `revealing`, user thấy đếm "Slide 3/6" tăng dần real-time
- Khớp 100% với mini tracker → không bị lệch trạng thái
- Vẫn giữ phong cách Soft Luxury hiện tại

