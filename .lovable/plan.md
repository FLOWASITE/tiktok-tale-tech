# Sửa flow Import Brand: xác nhận Ngành + chọn Màu

## Vấn đề
1. **Ngành gợi ý không hiện danh sách**: sau khi import (Website/Fanpage), `BrandCreate.tsx` (line 272) auto-set `industries=[s.industry_suggestion]` rồi đóng mọi dialog. User không thấy danh sách ngành AI gợi ý để chọn/xác nhận. `IndustrySelectionDialog` (đã có sẵn AI suggestion qua `suggest-industry` edge function với confidence + reason) không được mở.
2. **Màu brand sai**: hydrate auto-pick theo priority `s.primary_color || palette.primary || meta.theme_color || s.primary_color_suggestion` (line 289). Nếu nguồn đầu tiên sai (ví dụ AI đoán nhầm, hoặc `palette.primary` lấy từ logo background trắng/đen), user bị ép màu sai mà không thấy các candidate khác để chọn.

## Giải pháp

### 1. Mở `IndustrySelectionDialog` sau import (thay vì auto-fill)
Trong `src/pages/BrandCreate.tsx`:
- Bỏ dòng `if (s.industry_suggestion) setIndustries([s.industry_suggestion]);` trong block hydrate import.
- Thêm state `showIndustryConfirmAfterImport` set `true` khi hydrate xong từ `importedSuggestion` và chưa có `globalPackId`.
- Render `<IndustrySelectionDialog open={showIndustryConfirmAfterImport} suggestedContext={suggestedContext} recentlyUsedIds={recentlyUsedIds} onSelectIndustry={handleIndustryTemplateSelect} onOpenChange={...} />` — dialog này đã tự gọi `suggest-industry` với `brandText=suggestedContext` và hiển thị top 5 ngành (primary ≥60% + related) kèm confidence + reason để user click chọn.
- `handleIndustryTemplateSelect` (đã có) sẽ set `globalPackId` + `industries` + đóng dialog.

### 2. Color Palette Chooser sau import
Trong `src/pages/BrandCreate.tsx` Step Identity (hoặc inline panel khi vừa import):
- Gom tất cả candidate màu từ import vào 1 mảng:
  - `s.primary_color` (AI suy luận)
  - `meta.theme_color` (HTML meta)
  - `palette.primary` + `palette.candidates[]` (từ logo extraction)
  - `s.primary_color_suggestion`
  - dedupe + filter hex hợp lệ.
- Không auto-set `primaryColor` nữa nếu có ≥2 candidate khác nhau. Thay vào đó hiển thị 1 banner nhỏ ngay đầu Step Identity: "AI tìm thấy N màu từ website — chọn màu chủ đạo:" + grid swatches (8x8, click = `setPrimaryColor`). Mỗi swatch có tooltip nguồn ("Theme color", "Logo dominant", "AI gợi ý").
- Nếu chỉ có 1 candidate → giữ auto-set như cũ.
- Banner ẩn sau khi user click chọn (state `colorChosenFromImport`).

## Phạm vi kỹ thuật
**File sửa**: chỉ `src/pages/BrandCreate.tsx`.
- Bỏ auto-set industries từ import; thêm state + render `IndustrySelectionDialog`.
- Thêm `importedColorCandidates` memo + state `colorChosenFromImport`; render banner palette ở đầu Step 1.
- Không sửa edge function `suggest-industry`, `import-brand-from-website`, `IndustrySelectionDialog.tsx`, `BrandImportDialog.tsx`.

## Out of scope
- Không đổi logic extract màu ở backend.
- Không đổi AI prompt của `suggest-industry`.
- Không đổi sidebar admin (đã làm ở message trước).
