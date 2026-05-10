## Vấn đề
Khi user mở `/brands/new` → bấm **"Import & tự động fill"** → nhập URL website / chọn Fanpage → AI phân tích xong → bấm Áp dụng:
- `BrandImportDialog.onApplied` gọi `navigate('/brands/new', { state: { importedSuggestion }, replace: true })`.
- Nhưng `BrandCreate` đang mount sẵn ở màn chooser → React Router **không unmount**, chỉ update `location.state`.
- State `showStartChooser` được khởi tạo bằng `useState(!editingTemplate && !locationState?.importedSuggestion)` chỉ chạy 1 lần lúc mount → vẫn `true`.
- Hydration `useEffect` cho `importedSuggestion` chỉ gọi `setShowQuickStart(false)` + `setCurrentStep(1)`, **không tắt** `showStartChooser`.

→ Kết quả: user thấy lại màn chọn "Manual / Import" thay vì stepper Identity → Personas → Products → … dù form đã được nạp dữ liệu ngầm.

## Fix (1 file)

### `src/pages/BrandCreate.tsx`
Trong `useEffect` hydrate `importedSuggestion` (~line 219-247), thêm:

```ts
setShowStartChooser(false);
setImportDialogOpen(false);
```

cùng với 2 dòng `setShowQuickStart(false)` và `setCurrentStep(1)` đã có. Đảm bảo:
- Tắt màn chooser khi đã có dữ liệu import.
- Đóng `BrandImportDialog` (nếu còn mở từ flow trước).

Không đổi gì khác — `BrandImportDialog`, `BrandCreateStartChooser`, `useBrandImport`, edge functions giữ nguyên.

## Verification
1. Vào `/brands/new` → chọn "Import & tự động fill" → dán URL `https://flowa.one` → đợi progress chạy hết → bấm "Áp dụng vào Brand mới".
2. Quan sát: dialog đóng, **stepper 6 bước hiện ra ngay**, đang ở Step 1 "Identity", các trường Brand name / Tagline / Mission / Industry đã được fill từ AI suggestion.
3. Thử tương tự với flow Fanpage.
4. Test back: ở stepper bấm "Quay lại" → phải về `/brands` (header back button đã trỏ đúng), không loop về chooser.

## Ngoài scope
- Không đụng SSE pipeline, `BrandImportProgressPanel`, prompt extractor, schema DB.
- Không đổi UI chooser hay copy.
