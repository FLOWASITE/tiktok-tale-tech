

# Fix: Lọc Scripts theo Organization hiện tại

## Vấn đề

`useScripts.ts` query `scripts` không có filter `organization_id`, nên hiển thị scripts của **tất cả workspace**.

## Giải pháp

### `src/hooks/useScripts.ts`

1. **fetchScripts**: Thêm `.eq('organization_id', currentOrganization.id)` vào query. Nếu chưa có `currentOrganization`, return early (như đã làm với `user`).

2. **useEffect dependency**: Thêm `currentOrganization?.id` vào dependency array để refetch khi user switch workspace.

Chỉ thay đổi 1 file, ~5 dòng sửa.

