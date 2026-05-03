## Vấn đề
Hiện tại Step 1 hiển thị **2 tab "Theo ý tưởng" / "Cần cho SEO"** (EntryModeSwitcher). User muốn:
- Bỏ tab "Theo ý tưởng" (vì đã là mặc định hệ thống, hiển thị tab gây thừa).
- Thay bằng **1 nút bật/tắt SEO mode rõ ràng** — off = idea (mặc định), on = seo.

## Thay đổi

### 1. Tạo component mới `src/components/multichannel/SeoModeToggle.tsx`
Một toggle gọn dùng `Switch` + label + icon `Target`, với mô tả phụ:
- Off: "Chế độ SEO — Tắt" · "Bắt đầu từ ý tưởng (mặc định)"
- On: "Chế độ SEO — Bật" · "Chọn pillar + keyword trước, AI gợi ý topic"

Props: `enabled: boolean`, `onChange: (v: boolean) => void`, `disabled?: boolean`.

UI gợi ý:
```
[🎯 Chế độ SEO          ◉━━○ ]
   Bắt đầu từ keyword cho long-form
```
Có hover tooltip giải thích khi nào nên bật (Website/Blog/WordPress).

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx` (Step 1 header, dòng 1186-1201)
- Bỏ block `EntryModeSwitcher` + 2 dòng mô tả "Cách bắt đầu".
- Thay bằng `<SeoModeToggle enabled={entryMode === 'seo'} onChange={(v) => setEntryMode(v ? 'seo' : 'idea')} disabled={isGenerating} />` đặt ở góc phải, hoặc 1 hàng riêng phía trên các block còn lại.
- Giữ nguyên nhánh `{entryMode === 'seo' && <SeoFirstEntry ... />}` bên dưới.

### 3. (Không xoá file) `EntryModeSwitcher.tsx` giữ nguyên (có thể dùng nơi khác sau), nhưng gỡ import khỏi wizard.

### 4. Cập nhật memory `.lovable/memory/features/multichannel/hybrid-entry-mode-vn.md`
- Đổi mô tả UI: "EntryModeSwitcher 2-tab" → "SeoModeToggle (Switch on/off)".
- Idea-first vẫn là mặc định; SEO chỉ bật khi user gạt switch.

## Không đổi
- `useEntryMode` hook giữ nguyên (đã đúng: default `idea`, persist localStorage).
- `formData` shape, backend, `SeoFirstEntry`, `PillarKeywordSection` không đổi.

## Kết quả
- Step 1 không còn 2 tab; chỉ 1 switch "Chế độ SEO" rõ ràng.
- Mặc định tắt → user thấy giao diện ý tưởng đơn giản.
- Bật switch → hiện block Pillar/Keyword/SuggestedTopics như trước.