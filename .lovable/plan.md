

# Thêm cộng dọc + cộng ngang cho bảng Workspace

## Hiện trạng
- Bảng đã có footer tổng dọc cho: Thành viên, Brands, Nội dung, Ảnh
- Chưa có cột **Tổng ngang** (sum per row)

## Thay đổi

### `AdminWorkspacesTab.tsx`

1. **Thêm cột "Tổng" (cộng ngang)** sau cột Ảnh:
   - Mỗi row hiển thị: `ws.brand_count + ws.content_count + ws.image_count`
   - Style đậm hơn để nổi bật so với các cột thành phần

2. **Cập nhật footer (cộng dọc)** thêm ô tổng ngang:
   - `filteredTotals` thêm field `total` = brands + contents + images
   - Footer hiển thị tổng của tổng

3. **Cập nhật colSpan** cho detail panel: 10 → 11

| File | Thay đổi |
|------|----------|
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm cột Tổng ngang + cập nhật footer |

