

## Hoàn thiện "Cấu hình gói" (PlanLimitsManager)

Nâng cấp tab Cấu hình gói với giao diện chuyên nghiệp hơn, thêm tính năng quản lý features, và cải thiện trải nghiệm chỉnh sửa.

### Cải tiến

**1. Giao diện card nâng cấp**
- Thêm icon cho từng trường (Package, FileText, Image, Layers, Palette, Bot, DollarSign)
- Phân nhóm rõ ràng: "Hạn mức" (limits) và "Giá cước" (pricing) bằng separator
- Hiển thị giá trị `-1` thành badge "Không giới hạn" thay vì số -1
- Header card có gradient màu theo gói (xanh Starter, tím Pro, vàng Enterprise)
- Hiển thị tổng doanh thu ước tính từ mỗi gói (workspace count x price)

**2. Quản lý Features (CRUD)**
- Thêm nút "+" để thêm feature mới (inline input)
- Nút "x" trên mỗi badge feature để xóa
- Lưu features cùng lúc với các thay đổi khác

**3. Cải thiện UX chỉnh sửa**
- Nút "Hoàn tác" (Undo) để reset về giá trị gốc khi đang edit
- Dialog xác nhận trước khi lưu, hiển thị diff (giá trị cũ → mới)
- Highlight trường đã thay đổi bằng viền màu khác

**4. Tổng quan nhanh**
- Row tổng hợp phía trên cards: tổng workspace active, tổng MRR ước tính
- Tooltip trên mỗi trường giải thích ý nghĩa (ví dụ: "-1 = không giới hạn")

### Kỹ thuật

**File sửa:** `src/components/admin/plans/PlanLimitsManager.tsx`
- Thêm state `featureEdits` để track thêm/xóa features
- Thêm `AlertDialog` xác nhận trước save với diff view
- Thêm inline input cho thêm feature mới
- Phân chia numericFields thành 2 nhóm: `limitFields` và `priceFields`
- Thêm logic hiển thị "Không giới hạn" khi value = -1
- Highlight changed fields với `ring-2 ring-primary/50`

