
## Bối cảnh
Anh báo "Không thấy ảnh Carousel được tạo" trên route `/carousel`. Console logs cho thấy lỗi lặp lại liên tục mỗi giây:

```
[useBackgroundGeneration] Create task error: {
  "code": "23514",
  "message": "new row for relation \"generation_tasks\" violates check constraint \"generation_tasks_task_type_check\""
}
```

→ Đây là root cause: hook `useBackgroundGeneration` đang cố INSERT vào bảng `generation_tasks` với `task_type` không match CHECK constraint → DB từ chối → image generation task không bao giờ được tạo → ảnh không xuất hiện.

## Investigation cần làm (read-only)

1. **DB**: Query CHECK constraint definition
   ```sql
   SELECT pg_get_constraintdef(oid) FROM pg_constraint 
   WHERE conname = 'generation_tasks_task_type_check';
   ```
2. **DB**: Check sample existing rows + columns
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name='generation_tasks';
   SELECT task_type, COUNT(*) FROM generation_tasks GROUP BY task_type;
   ```
3. **Code**: `src/hooks/useBackgroundGeneration.ts` — tìm chỗ INSERT, xem `task_type` value đang gửi
4. **Code**: Caller trong `/carousel` page — xem trigger nào đang gọi liên tục (loop mỗi giây = useEffect thiếu deps hoặc retry không có backoff)

## Root cause hypothesis
- Frontend gửi `task_type: 'carousel_image'` (hoặc tương tự) nhưng CHECK constraint chỉ allow set khác (vd `'carousel'`, `'image_generation'`).
- Caller retry không có debounce → spam DB mỗi giây.

## Fix plan (sau khi approve)

**Phase 1 — Sửa task_type mismatch**
- Đọc CHECK constraint → xác định allowed values
- Sửa `useBackgroundGeneration.ts` gửi đúng `task_type` value
- HOẶC tạo migration ALTER constraint thêm value mới (nếu UX cần value đó)

**Phase 2 — Stop infinite retry loop**
- Trong caller (carousel page hook), thêm:
  - Guard `if (error) return` không retry tự động
  - Hoặc exponential backoff
  - useEffect deps array đúng để không re-fire mỗi render

**Phase 3 — Verify image pipeline**
- Test tạo carousel mới → check `generation_tasks` row được insert với status='pending'
- Check `carousel_images` table có row sau khi pipeline complete
- Check edge function `generate-carousel-image` logs không có error

## Output sau khi approve
1. Query DB constraint + columns (parallel)
2. Read `useBackgroundGeneration.ts` + carousel page caller (parallel)
3. Trình bày exact mismatch + sửa 1-2 file
4. Yêu cầu anh test "Tạo carousel mới" để confirm ảnh xuất hiện
