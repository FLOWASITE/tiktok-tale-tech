# Fix: Chỉ chọn WordPress nhưng AI tạo cả Website + WordPress

## Vấn đề
Trong screenshot user chỉ tick **WordPress** ở "Thiên về Text", nhưng panel "AI đang tạo nội dung" hiện **2 cột song song**: `Website` (758 từ) và `wordpress` (338 từ). Hệ quả:

- Lãng phí quota: AI bị gọi 2 lần cho cùng một loại nội dung long-form.
- UI gây nhầm lẫn: user chỉ chọn 1 kênh nhưng thấy 2 thẻ.
- Nội dung 2 cột lệch nhau (vì là 2 lần generate độc lập), không nhất quán.

## Root cause
Tại `supabase/functions/generate-multichannel/index.ts` (dòng ~1532) backend đang **EXPAND** `wordpress` → thêm `website` vào danh sách channels chạy pipeline:

```ts
const needsWebsite = (out.includes('blogger') || out.includes('wordpress')) && !out.includes('website');
if (needsWebsite) out.push('website');   // ← thêm website BÊN CẠNH wordpress
```

Sau đó `generateChannelsParallel(channelsToGenerate)` chạy AI song song cho **cả `website` lẫn `wordpress`** → 2 stream events `streaming_text` riêng → frontend hiện 2 cột.

Vì `wordpress` và `website` cùng ghi vào cột DB `website_content` (xem `CHANNEL_TO_COLUMN.wordpress = 'website_content'`), việc generate hai lần là dư thừa.

## Giải pháp
**Collapse** thay vì **expand**: thay `wordpress`/`blogger` bằng `website` duy nhất trong pipeline; vẫn giữ `wordpress`/`blogger` trong `selected_channels` đã persist (logic sẵn có ở dòng ~1756 vẫn hoạt động đúng).

### Thay đổi file
**`supabase/functions/generate-multichannel/index.ts`** (~dòng 1532–1546):

Thay `expandLongFormAliases` (push thêm `website`) bằng `collapseLongFormAliases`:
- Nếu `channels` có `blogger`/`wordpress` → bỏ chúng ra, đảm bảo có đúng 1 `website`.
- Nếu user pick CẢ `website` lẫn `wordpress` → kết quả vẫn chỉ còn 1 `website` (không trùng).
- Áp dụng cho cả `formData.channels` và `formData.newChannels`.
- Logic `formData.channel === 'wordpress' → 'website'` (single-channel regenerate, dòng 1547-1552) giữ nguyên — đã đúng.

Logic `persistedSelectedChannels` (dòng ~1756) vẫn nhận diện `userPickedWordpress` từ `originalChannels` → DB lưu đúng `wordpress` trong `selected_channels`. Frontend `DirectPublishButton` (đã sửa ở turn trước) đã fallback `wordpress` → connection `wordpress_com`.

### Kết quả mong đợi
- Chỉ chọn WordPress → progress panel chỉ hiện **1 cột** "WordPress", chạy 1 lần AI.
- DB: `selected_channels = ['wordpress']`, `website_content` chứa nội dung long-form.
- Khi đăng: nút "Đăng WordPress" tìm connection `wordpress_com` (đã sửa ở lần trước) → publish OK.
- Chọn cả WordPress + Website cùng lúc → vẫn chỉ chạy 1 lần AI, persist `['wordpress', 'website']`.

### Không thay đổi
- Pipeline AI, prompt, length config, persist DB columns.
- UI components (`AIGenerationProgress`, `StreamingTextGrid`).
- Edge function nào khác — chỉ sửa duy nhất khối `expandLongFormAliases`.
