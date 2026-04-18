
## Vấn đề
JSON repair trong `generate-carousel` hiện chỉ kiểm slide count, không bắt được:
1. `fullPrompt` rỗng/quá ngắn (<30 từ) — schema-valid nhưng vô nghĩa
2. `headline` null/empty
3. `slideNumber` không liên tục 1..N (gap, duplicate, out-of-order)

Repair có thể "thành công" và trả về rác → user nhận carousel vô nghĩa.

## Khảo sát
Cần đọc `generate-carousel/index.ts` quanh chỗ repair/normalize để biết hàm validate hiện tại tên gì và nằm ở đâu.

## Giải pháp
Thêm validator `validateRepairedSlides(slides, expectedCount)` trả về `{ valid, errors[] }`:
- Length === expectedCount
- Mỗi slide: `slideNumber === index+1`, `fullPrompt` trim ≥ 30 từ, `textContent.headline` (nếu structured) hoặc `textContent` (nếu string) non-empty
- Sequence 1..N liên tục, không trùng

Nếu fail → throw để fallback regenerate (không cache, không lưu).

## Files
- `supabase/functions/generate-carousel/index.ts` — thêm validator + gọi sau repair
