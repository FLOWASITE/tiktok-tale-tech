## Vấn đề
Trên mobile (viewport ~707×662), dialog "Import Brand từ website hoặc fanpage" ở bước preview kết quả không kéo lên xuống được — danh sách trường (Identity / Tagline / Sứ mệnh / Ngành / Đối tượng…) bị cắt, footer "Quay lại / Tiếp tục tạo brand" đè lên nội dung.

## Nguyên nhân
`src/components/brand/BrandImportDialog.tsx`:
- `DialogContent` dùng `max-h-[90vh] flex flex-col` (line 282).
- Nhánh preview (line 360) bọc bằng `<ScrollArea className="flex-1 pr-3">`. Radix `ScrollArea` cần **chiều cao xác định** + parent có `min-h-0` thì `flex-1` mới tính đúng. Hiện tại thiếu `min-h-0` → ScrollArea giãn theo content thay vì giới hạn theo viewport, khiến cả DialogContent tràn và body dialog không scroll.
- Nhánh form input (line 291) dùng `div ... overflow-y-auto` thì hoạt động bình thường → confirm root cause là ScrollArea + flex sizing.

## Cách sửa (UI-only, 1 file)
Trong `src/components/brand/BrandImportDialog.tsx`:

1. **DialogContent**: thêm `min-h-0 p-0 sm:p-6` không cần — chỉ cần đảm bảo flex child co lại được. Đổi class thành:
   `max-w-2xl max-h-[90vh] h-[90vh] sm:h-auto flex flex-col` (mobile fix chiều cao 90vh để flex-1 có cơ sở tính).

2. **Nhánh preview** (line 360): thay `<ScrollArea className="flex-1 pr-3">` bằng `<div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">` (đồng nhất với nhánh input ở line 291, tránh bug Radix ScrollArea trong flex).
   - Bỏ `</ScrollArea>` đóng ở line 474, thay bằng `</div>`.
   - Bỏ import `ScrollArea` nếu không còn chỗ nào dùng (line 9).

3. **DialogHeader & DialogFooter**: thêm `shrink-0` để không bị ép co khi content dài, đảm bảo footer luôn dính đáy và header luôn ở trên.

## Verify
- Mở `/brands/new` → chọn "Import tự động" → nhập `https://taf.vn` → Phân tích → ở màn preview, vuốt được lên/xuống thấy hết các trường + footer cố định.
- Test cả mobile (viewport hiện tại 707×662) và desktop (≥1024px) — desktop dialog không bị stretch full height vì `sm:h-auto`.

## Out of scope
- Không đụng logic extract / edge function / carousel logo selection.
- Không đổi copy hay layout các field.
