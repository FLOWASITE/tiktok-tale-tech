## Vấn đề
Hiện tại `useEntryMode` auto-switch sang `seo` khi user chọn kênh long-form (Website/Blogger/WordPress), kèm toast "Đã chuyển sang chế độ Cần cho SEO". Điều này ép buộc user, trái với mong muốn: **Idea-first là mặc định hệ thống, SEO chỉ là tùy chọn khi user chủ động bật**.

## Mục tiêu
- Mặc định luôn là `idea` cho mọi user mới / mọi tổ hợp kênh.
- SEO mode chỉ kích hoạt khi user **tự click** vào switcher.
- Bỏ toast auto-switch gây nhiễu.
- Giữ persist lựa chọn user qua localStorage (nếu user đã chọn `seo` lần trước, vẫn nhớ).

## Thay đổi

### 1. `src/hooks/useEntryMode.ts` — bỏ auto-switch
- Xóa toàn bộ `useEffect` auto-switch theo `channels`.
- Xóa khái niệm `OVERRIDE_KEY` / `overrideRef` / `resetOverride` (không còn cần vì không auto nữa).
- Mặc định khởi tạo: đọc localStorage; nếu chưa có → `'idea'`.
- `setMode(next)`: chỉ persist vào localStorage + setState. Bỏ logic override.
- Bỏ `import { toast }` và `LONG_FORM_CHANNELS` (nếu chỉ dùng nội bộ); export `LONG_FORM_CHANNELS` chỉ giữ nếu nơi khác import.

Signature mới:
```ts
export function useEntryMode(): { mode: EntryMode; setMode: (m: EntryMode) => void }
```
(Bỏ tham số `channels` vì không dùng.)

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx` — cập nhật call site
- Sửa chỗ gọi `useEntryMode(formData.channels)` → `useEntryMode()`.
- Bỏ destructure `resetOverride`, `isOverridden` nếu có.
- Giữ nguyên việc render `EntryModeSwitcher` + nhánh `seo` / `idea`.

### 3. (Tuỳ chọn UX nhỏ) `EntryModeSwitcher.tsx`
- Thêm subtitle nhỏ "Tùy chọn nâng cao" cạnh nhãn "Cần cho SEO" để báo hiệu đây là opt-in. Không bắt buộc.

### 4. Cập nhật memory
- Sửa `.lovable/memory/features/multichannel/hybrid-entry-mode-vn.md`:
  - Mode A (`seo`): đổi từ "Mặc định khi user chọn ≥1 long-form channel" → **"Opt-in: chỉ kích hoạt khi user tự chọn switcher"**.
  - Mode B (`idea`): đổi thành **"Mặc định hệ thống cho mọi tổ hợp kênh"**.
  - Bỏ section "Smart default & override" → thay bằng "Persist: localStorage `mc:entry_mode` nhớ lựa chọn user".

## Không đổi
- `formData.{topic, clusterId, targetKeywordIds}` shape giữ nguyên.
- Backend `generate-multichannel` không sửa.
- `SeoFirstEntry`, `PillarKeywordSection`, `SuggestedTopicsFromKeyword` không sửa.

## Kết quả
- User mở form → luôn ở "Theo ý tưởng".
- Muốn SEO-first → bấm tab "Cần cho SEO" → hệ thống nhớ cho lần sau.
- Không còn toast bất ngờ khi tick chọn kênh Website/Blog.
