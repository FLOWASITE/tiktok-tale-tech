

## Fix: Chống tạo Carousel trùng lặp

### Nguyên nhân gốc

1. **Cache HIT vẫn INSERT mới**: Khi cache trả về nội dung cũ, edge function vẫn tạo record mới trong DB (line 886-915). Kết quả: 2 carousel khác ID nhưng cùng nội dung.
2. **Không có guard chống double-click**: `useCarousels.ts` dùng `generating` state nhưng setState là async — user click nhanh 2 lần có thể gọi `generateCarousel` 2 lần trước khi `generating` thành `true`.

### Hướng fix (2 layer bảo vệ)

**Layer 1 — Frontend: useRef guard trong `useCarousels.ts`**

- Thêm `const generatingRef = useRef(false)` 
- Đầu `generateCarousel`: check `if (generatingRef.current) return null` → set `generatingRef.current = true`
- Finally block: `generatingRef.current = false`
- Đảm bảo chặn 100% double-invoke từ UI

**Layer 2 — Backend: Dedup check trong `generate-carousel/index.ts`**

- Trước khi INSERT (line ~886), query check:
  ```sql
  SELECT id FROM carousels 
  WHERE user_id = ? AND topic = ? AND organization_id = ? 
  AND created_at > now() - interval '2 minutes'
  LIMIT 1
  ```
- Nếu tìm thấy → trả về carousel cũ thay vì INSERT mới
- Thêm log `"Dedup: returning existing carousel {id}"`

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useCarousels.ts` | Thêm `useRef` guard chống double-call |
| `supabase/functions/generate-carousel/index.ts` | Thêm dedup query trước INSERT |

### Không thay đổi
- Logic cache, AI generation, self-critique
- CarouselForm UI, button states
- Database schema

