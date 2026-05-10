## Mục tiêu
Hai màn admin "Industry" hiện vỡ layout ở viewport ≤ 768px (đặc biệt 707px hiện tại):
- `AdminIndustryPacks.tsx`: header bị tràn, action buttons trong PackCard chật kín.
- `GlobalPacksTable.tsx`: table 7 cột không scroll ngang, cột "Phổ biến" với Switch + Input không vừa.

Chỉ chỉnh **UI/presentation**, không đụng logic, hooks, query, schema.

---

## Thay đổi

### 1. `src/pages/AdminIndustryPacks.tsx`

**Header (dòng ~547-567)**
- Đổi `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
- Title `text-2xl` → `text-xl sm:text-2xl`, icon scale theo.
- Action buttons: nhóm `flex flex-wrap gap-2`, nút "Create Pack" và "Refresh" full-width trên mobile (`flex-1 sm:flex-initial`); ẩn label "Refresh" trên mobile (chỉ icon).

**Filters (dòng ~573-600)**
- Đã có `flex-col sm:flex-row` — giữ nguyên, chỉ chỉnh select width thành `w-full sm:w-[160px]`.

**Country Tabs (dòng ~603-621)**
- TabsList đã `flex-wrap`. Thêm `overflow-x-auto sm:overflow-visible` để fallback. TabsTrigger thêm `text-xs sm:text-sm`.

**Grid pack list (dòng ~626, 674)**
- Hiện `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Giữ nguyên (đã ổn cho 707px → 1 cột).

**PackCard actions (dòng ~199-301)**
- Wrapper `flex gap-2` → `flex flex-wrap gap-2`. Cụm 4 icon buttons giữ nguyên, nút status (Publish/Deprecate/Reactivate) thành `w-full sm:flex-1` để không bị bóp.
- Stats grid `grid-cols-3` giữ nguyên.

### 2. `src/components/admin/GlobalPacksTable.tsx`

**Header (dòng ~114-141)**
- `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`.
- Cụm 2 nút filter wrap `flex-wrap`.

**Table wrapper (dòng ~156-279)**
- Bọc `<Table>` trong `<div className="overflow-x-auto -mx-4 sm:mx-0">` + table thêm `min-w-[720px]` để scroll ngang mượt.
- Cột "Phổ biến": gói Switch + Input thành `flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2`.
- Cột "Tên": thêm `min-w-[140px]` để không bị bóp; "Industry Code" `whitespace-nowrap`.

**(Tùy chọn nhỏ)** Thêm `CardContent className="p-2 sm:p-6"` để giảm padding mobile, table có thêm chỗ thở.

---

## Out of scope
- Đổi cấu trúc data, tabs, dialog, hay logic toggle popular/active.
- Layout admin sidebar / global shell.
- i18n, accessibility audit toàn diện.

## Verify
Resize preview 360 / 707 / 1024 / 1440:
- Header không tràn, button không vỡ hàng xấu.
- PackCard 1 cột mobile, action row wrap đẹp.
- GlobalPacksTable scroll ngang mượt ở mobile, switch + input không chồng.
