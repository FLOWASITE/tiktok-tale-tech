

## Triệu chứng
User thấy **quá nhiều ảnh** được tạo cho mỗi slide trong carousel — DB có nhiều row hơn dự kiến.

## Điều tra cần làm
Đọc code để xác định các điểm có thể tạo ảnh trùng:

1. **`useImageGeneration.ts` + `useCarouselImages.ts`**: Đã thấy logic — khi `generateImage()` thành công, có nơi nào gọi `saveImage()` không? Có double-insert không?
2. **`generate-carousel-image/index.ts`**: Edge function bây giờ tự `Persisted slide=3 to carousel_images` (thấy trong logs). Vậy frontend còn gọi `saveImage()` nữa không → **double insert**.
3. **`generate-carousel-images-batch`**: Loop có gọi mirror/persist 2 lần không? Logs có `[mirror] slide 3 mirrored` → nghi ngờ mirror tạo thêm row.
4. **CarouselViewer**: Component cha có trigger generate nhiều lần khi state thay đổi (useEffect dependency sai)?

## Giả thuyết chính (từ logs đã thấy)

Logs cho slide 3:
```
[generate-carousel-image] Persisted slide=3 to carousel_images   ← Edge tự insert (lần 1)
[mirror] slide 3 mirrored in 2264ms                              ← Mirror cũng insert (lần 2?)
```

Frontend `useImageGeneration.generateImage()` trả về `imageUrl` → `CarouselViewer` có thể gọi `useCarouselImages.saveImage()` → **insert lần 3**.

Cộng với `useCarouselImages.saveImage()` không dùng UPSERT mà:
1. Update `is_selected=false` cho version cũ
2. INSERT row mới (auto-bump version)

→ Mỗi click "Tạo ảnh" tạo +1 row vĩnh viễn (versioning by design), nhưng nếu **edge + mirror + frontend cùng insert** → 2-3 row mỗi lần generate.

Cũng có thể `useCarouselCardImages` realtime subscription kích trigger UI re-render → vô tình kích lại generate.

## Kế hoạch điều tra (read-only)

1. Đọc `supabase/functions/generate-carousel-image/index.ts` — xem chính xác chỗ persist + mirror logic.
2. Đọc `supabase/functions/generate-carousel-images-batch/index.ts` — xem loop có duplicate persist không.
3. Đọc `CarouselViewer.tsx` (hoặc component gọi `generateImage`) — xem sau khi generate xong có gọi `saveImage()` nữa không.
4. Query DB: `SELECT carousel_id, slide_number, COUNT(*) FROM carousel_images GROUP BY 1,2 HAVING COUNT(*) > 1` để confirm có duplicate.

## Kế hoạch sửa (sau khi xác định)

**Nếu nguyên nhân là double-insert (edge + frontend):**
- Bỏ `saveImage()` call ở frontend khi nhận response từ `generate-carousel-image` — edge function đã tự lưu.
- Frontend chỉ rely vào realtime subscription `useCarouselCardImages` để pick up row mới.

**Nếu nguyên nhân là mirror tạo row riêng:**
- Mirror chỉ nên upload R2 lại (re-host) và **UPDATE** `image_url` của row đã có, không INSERT mới.

**Nếu nguyên nhân là versioning không kiểm soát:**
- Thêm dedup check ở edge function: trước khi insert, query xem có row `is_selected=true` cho `(carousel_id, slide_number)` trong vòng 30s không → nếu có thì UPDATE thay vì INSERT.

## Files dự kiến đụng
- `supabase/functions/generate-carousel-image/index.ts` — nguồn truth duy nhất cho persist
- `src/components/CarouselViewer.tsx` (hoặc tương đương) — bỏ saveImage redundant
- `src/hooks/useCarouselImages.ts` — đảm bảo không double-insert nếu vẫn cần fallback

## Kết quả mong đợi
- Mỗi lần generate slide chỉ tạo **đúng 1 row** trong `carousel_images`.
- Không còn ảnh "ghost" version chồng chất.
- Logs sẽ chỉ ra rõ chỉ có 1 nơi insert.

