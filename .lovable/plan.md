
# Tăng chiều dọc Form đăng Facebook Page

## Thay đổi

### `src/components/social/DirectPublishButton.tsx`

1. **Textarea "Nội dung bài đăng"** (line 356-357): Tăng `rows` từ 4 → 8, tăng `max-h` từ `120px/200px` → `250px/400px`
2. **DialogContent** (line 285): Thêm `max-h-[90vh] overflow-y-auto` để dialog có thể scroll khi nội dung dài

| Dòng | Trước | Sau |
|------|-------|-----|
| 356-357 | `rows={4}`, `max-h-[120px] sm:max-h-[200px]` | `rows={8}`, `max-h-[250px] sm:max-h-[400px]` |

Sửa 1 file, ~2 dòng thay đổi.
