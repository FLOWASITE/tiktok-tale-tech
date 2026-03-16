

## AI tự chọn vị trí logo trong chế độ "AI tự lo"

### Hiện trạng

- Chế độ "AI tự lo" (full) vẫn hiển thị LogoOptionsPanel cho user chọn vị trí thủ công (line 312-335 trong `ImageAdvancedOptions.tsx`)
- `useAutoImagePipeline.ts` hardcode `logoPosition: 'top-left'` (line 153) — không hề dùng giá trị user chọn
- Không có logic tự động chọn vị trí dựa trên nội dung/kênh

### Đề xuất: Thêm "auto" logo position cho chế độ full

**1. Thêm giá trị `'auto'` vào LogoPosition type**
- File: `src/components/multichannel/LogoOptionsPanel.tsx`, `src/hooks/useAutoImageGeneration.ts`
- Thêm `'auto'` vào union type `LogoPosition`

**2. Ẩn LogoOptionsPanel trong chế độ full, thay bằng nhãn read-only**
- File: `src/components/multichannel/ImageAdvancedOptions.tsx`
- Khi `promptMode === 'full'`, thay LogoOptionsPanel bằng nhãn: *"AI tự chọn vị trí logo phù hợp"*
- Tương tự cách đã xử lý "Text trên ảnh"

**3. Logic auto-select vị trí logo theo kênh + layout**
- File: `src/hooks/useAutoImageGeneration.ts`
- Thêm hàm `autoSelectLogoPosition(channel, aspectRatio, hasTextOverlay)`:
  - TikTok (9:16): `top-right` (tránh vùng avatar + safe zone dưới)
  - Instagram (1:1): `bottom-right`
  - Facebook/LinkedIn (16:9): `bottom-right`
  - YouTube (16:9): `top-left`
- Khi `logoPosition === 'auto'`, gọi hàm này trước khi truyền vào pipeline

**4. Cập nhật useAutoImagePipeline**
- File: `src/hooks/useAutoImagePipeline.ts`
- Thay `logoPosition: 'top-left'` → `logoPosition: 'auto'` để pipeline tự quyết

**5. Cập nhật UnifiedImageGenerator (nếu có)**
- File: `src/components/multichannel/UnifiedImageGenerator.tsx`
- Default `logoPosition` thành `'auto'` khi `promptMode === 'full'`

### Tóm tắt: 5 files cần sửa
1. `LogoOptionsPanel.tsx` — thêm type `'auto'`
2. `useAutoImageGeneration.ts` — thêm type + hàm `autoSelectLogoPosition()`
3. `ImageAdvancedOptions.tsx` — ẩn panel khi full mode
4. `useAutoImagePipeline.ts` — dùng `'auto'` thay `'top-left'`
5. `UnifiedImageGenerator.tsx` — default `'auto'` cho full mode

