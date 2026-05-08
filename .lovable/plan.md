## Sửa UI Workspace "Kịch bản & Quay" (3 fix)

### 1. `src/components/video/QuickClipTab.tsx`

**Bỏ Aspect Ratio + Model AI khi embedded** (đã có ở header/preset social format ở Step 2):
- Lines 441–445 ("Tỉ lệ khung hình" + `<AspectRatioPicker>`): wrap trong `{!embedded && (...)}`.
- Lines 463–477 ("Model AI" + `<AdminModelBadge>`): wrap trong `{!embedded && (...)}`.
- Logic giá trị `aspect` vẫn giữ — auto-fill từ `currentScene?.aspect` (đã có sẵn trong `useEffect` trước đó), nên scene vẫn render đúng tỉ lệ kế thừa từ kịch bản.

**Phóng to textarea "Mô tả cảnh quay"** (lines 343–350):
- Thay `min-h-[100px] resize-none text-sm` →
  - Khi `embedded`: `min-h-[280px] lg:min-h-[420px] resize-y text-sm font-mono leading-relaxed`
  - Khi không: giữ `min-h-[140px] resize-y text-sm`.
- Dùng `cn()` để conditional. Cho phép user kéo cao thêm nếu cần.

### 2. `src/components/video/ScriptWorkspace.tsx`

**Bỏ AdminModelBadge ở title strip** (đã thêm ở turn trước):
- Trong title strip (badge metadata row): xoá phần `<span className="ml-auto"><AdminModelBadge .../></span>` cùng import nếu không còn ai dùng.
- Giữ `Maximize2` "Mở viewer fullscreen" ở top bar — không liên quan.

### 3. Memory
- Cập nhật `mem://features/video/script-to-studio-link-vn.md`: ghi rõ QuickClip embedded ẩn cả AspectRatio + ModelAI; prompt textarea phóng to (`min-h-280/420 lg`) + resize-y; ScriptWorkspace title strip không hiện AdminModelBadge.

### Test
1. `/videos?tab=scripts&view=:id`: workspace cột phải không còn block "Tỉ lệ khung hình" và "Model AI"; textarea Mô tả cảnh quay cao gấp ~3 lần (>= 280px), kéo được.
2. Title strip workspace không còn badge model.
3. `/quick` (nếu còn route legacy) hoặc QuickClip standalone vẫn giữ AspectRatioPicker + Model AI block.
