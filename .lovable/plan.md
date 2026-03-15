

## Plan: Khắc phục 7 vấn đề từ đánh giá chuyên gia

Sau khi rà soát code thực tế, đây là trạng thái từng issue và các thay đổi cần thiết:

### Issue 1: `brand_only` thiếu style selection → CẦN SỬA
**Hiện tại**: Style grid chỉ hiện ở `raw` (line 212: `promptMode === 'raw'`). Ở `brand_only`, `imageStylePreset` gửi `undefined`, backend fallback về `computeStyleFromBrand()` — user không biết style nào được chọn.

**Fix**: Hiển thị style grid cho `brand_only` với label khác: "Chọn phong cách (hoặc để brand tự quyết)".

**File**: `src/components/multichannel/ImageAdvancedOptions.tsx` — đổi điều kiện line 212 từ `promptMode === 'raw'` thành `promptMode !== 'full'`. Thêm label phụ cho brand_only.

**File**: `src/components/multichannel/SimpleImageGenerator.tsx` — line 454: cho phép `brand_only` cũng gửi `imageStyle` nếu user chọn (hiện chỉ cho `raw`).

### Issue 2: Negative prompt chỉ ở `raw` → KHÔNG CẦN SỬA
**Thực tế code** (line 450-459): Negative prompt **đã hiển thị cho TẤT CẢ modes**. Không có điều kiện `promptMode` nào filter nó. Bảng mô tả sai, code đúng. Chỉ cần cập nhật documentation.

### Issue 3: Post-gen quick actions cho `full` mode → TÍNH NĂNG MỚI (tách riêng)
Đây là feature mới (regeneration chips "Đổi style", "Sáng hơn", "Ít text hơn"). Nên tách thành task riêng vì cần thiết kế UX + backend prompt tweaking logic. Không nằm trong scope fix này.

### Issue 4: Text position "AI decides" → CẦN CLARIFY trong code comment
**Thực tế**: Khi `full` mode + structured overlay, text position do channel layout rules trong `overlay-text-canvas` quyết định (deterministic). Khi canvas text, position do `CHANNEL_TEXT_LAYOUTS` trong prompt builders quyết định. Không phải "AI decides" — đây là channel-optimized auto. Chỉ cần sửa UI label.

### Issue 5: `brand_only` "light apply" → ĐÃ IMPLEMENT ĐÚNG
**Thực tế code** (line 368-387 trong `image-prompt-builders.ts`): `buildStrategicContext` cho `brand_only` inject persona name + age + occupation + journey stage dưới dạng "CONTEXT HINTS (Informational — prioritize user description)". Đây chính xác là "light apply". Code đúng, mô tả cần chi tiết hơn.

### Issue 6: Error/fallback behavior → THÊM COMMENT (không thay đổi logic)
Hiện tại: nếu generation thất bại → toast error, status = 'error'. Không có auto-fallback style. Đây là acceptable behavior hiện tại. Ghi nhận để xử lý sau.

### Issue 7: Thiếu rows trong bảng so sánh → DOCUMENTATION ONLY
Localization + Content source rows cần thêm vào `PromptPreview.tsx` để reviewer thấy.

---

### Tổng hợp thay đổi code

**1. `src/components/multichannel/ImageAdvancedOptions.tsx`** (~5 lines)
- Line 212: Đổi `promptMode === 'raw'` → `promptMode !== 'full'` cho style grid
- Thêm label phụ cho brand_only: "Chọn hoặc để AI tính từ ngành + tone"

**2. `src/components/multichannel/SimpleImageGenerator.tsx`** (~1 line)  
- Line 454: Cho phép `brand_only` gửi `imageStylePreset` nếu user chọn khác 'auto'

**3. `src/components/multichannel/PromptPreview.tsx`** (~10 lines)
- Thêm row "Nguồn nội dung" (Content source) phân biệt theo mode
- Thêm row "Bản địa hóa" (Localization) hiện ✓ auto cho cả 3 mode
- Sửa label "Text position" thành "Channel-optimized auto" cho mode `full`

Tổng: ~16 lines thay đổi, 3 files. Không breaking changes.

