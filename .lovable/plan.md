

## Tách trạng thái "Đăng" ra khỏi dropdown phê duyệt

### Vấn đề
`StatusSelector` hiện gộp cả trạng thái phê duyệt (Nháp, Chờ duyệt, Đã duyệt) và trạng thái đăng bài (Đăng 1 phần, Đã đăng) vào cùng 1 dropdown. Trạng thái đăng bài được xác định tự động khi publish, không nên để user chọn thủ công.

### Giải pháp
1. **Dropdown chỉ còn 3 trạng thái phê duyệt**: Nháp, Chờ duyệt, Đã duyệt
2. **Trạng thái đăng bài hiển thị dạng Badge read-only** bên cạnh dropdown (nếu status là `partially_published` hoặc `published`)
3. Khi status là `partially_published`/`published`, dropdown vẫn hiển thị nhưng disabled hoặc hiển thị badge thay vì dropdown

### Chi tiết kỹ thuật

**File: `src/components/StatusSelector.tsx`**
- Tách `STATUS_OPTIONS` thành 2 nhóm:
  - `APPROVAL_OPTIONS`: draft, review, approved (cho dropdown)
  - `PUBLISH_OPTIONS`: partially_published, published (chỉ hiển thị badge)
- Nếu `status` là publish → render Badge read-only thay vì dropdown
- Nếu `status` là approval → render dropdown bình thường chỉ với 3 option

**Không cần sửa file khác** — CarouselViewer, ScriptViewer, KanbanCard... đều dùng `StatusSelector` component, nên sửa 1 chỗ sẽ áp dụng toàn bộ.

### Kết quả
- Dropdown chỉ cho chọn: Nháp → Chờ duyệt → Đã duyệt
- Khi đã đăng/đăng 1 phần → hiển thị badge, không cho đổi ngược về draft

