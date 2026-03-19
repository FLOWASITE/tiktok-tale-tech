

## Thêm chức năng Chỉnh sửa, Xóa, Toggle Featured cho Sản phẩm trong Brand View

### Vấn đề
`BrandViewProductsTab` (tab Sản phẩm khi xem brand đã tạo) chỉ có nút **Thêm** mới. `ProductCard` hiện tại chỉ hiển thị thông tin, **không có nút Sửa, Xóa, hay Toggle nổi bật**. Trong khi `ProductCatalogEditor` (dùng trong form tạo brand) đã có đầy đủ các chức năng này.

### Kế hoạch

**1. Thêm action buttons vào `ProductCard` (`BrandViewProductsTab.tsx`)**
- Thêm icon buttons: **Sửa** (Pencil), **Xóa** (Trash2), **Toggle nổi bật** (Star) vào header của mỗi ProductCard.
- Buttons hiện khi hover (group-hover pattern đã có sẵn trong card).

**2. Thêm Edit Dialog (`ProductQuickAddDialog` → nâng cấp thành `ProductEditDialog`)**
- Tạo component `ProductEditDialog.tsx` (hoặc mở rộng `ProductQuickAddDialog` thành dual-mode: add + edit).
- Khi bấm Sửa → mở dialog với form đã fill sẵn data → gọi `updateProduct` từ `useProductCatalog`.

**3. Thêm Delete + Toggle Featured vào `BrandViewProductsTab`**
- Import `deleteProduct`, `toggleFeatured` từ `useProductCatalog` hook (đã có sẵn).
- Xóa: confirm dialog → gọi `deleteProduct(id)` → refetch.
- Toggle featured: gọi `toggleFeatured(id, !current)` → refetch.

**4. Truyền callbacks từ parent vào `ProductCard`**
- Mở rộng `ProductCardProps` với `onEdit`, `onDelete`, `onToggleFeatured`.

### Files sẽ chỉnh
| File | Thay đổi |
|------|----------|
| `src/components/brand/BrandViewProductsTab.tsx` | Thêm edit/delete/toggle actions vào ProductCard, thêm state quản lý edit dialog, import thêm hooks |
| `src/components/brand/ProductQuickAddDialog.tsx` | Mở rộng hỗ trợ edit mode (nhận `editProduct` prop, pre-fill form, gọi `updateProduct`) |

### Chi tiết kỹ thuật

**ProductCard** sẽ thêm action bar:
```text
[Star toggle] [Pencil edit] [Trash2 delete]
```
Hiện ở góc trên phải card, opacity-0 group-hover:opacity-100.

**ProductQuickAddDialog** thêm props:
- `editProduct?: BrandProduct` — nếu có → mode edit, pre-fill form, title "Chỉnh sửa sản phẩm", button "Cập nhật".
- Gọi `updateProduct(editProduct.id, formData)` thay vì `createProduct`.

