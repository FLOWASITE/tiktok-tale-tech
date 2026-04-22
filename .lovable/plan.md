

# Fix: Ảnh từ Telegram thiếu text, logo, footer

## Root cause

Manual flow (`useAutoImageGeneration`) tạo ảnh qua **pipeline 3 bước**:
1. **Step 1** — `generate-brand-image` với `structuredElements/structuredTemplate/logoSafeZone` để AI render text chính xác và chừa chỗ cho logo
2. **Step 2** — gọi `overlay-brand-logo` để composite logo PNG lên ảnh (post-processing, không phụ thuộc AI)
3. **Step 3** — overlay SVG footer/CTA (Canvas) cho CTA + footer info

Telegram bot chỉ làm **Step 1** với body **tối thiểu** (`contentId, channel, brandTemplateId, imageContentType, contentSummary, textToInclude`):
- Không truyền `structuredElements` → AI tự quyết, hay bỏ text hoặc sai dấu tiếng Việt
- Không gọi `overlay-brand-logo` → **không có logo**
- Không overlay footer SVG → **không có footer (SĐT, website, địa chỉ)**
- Không truyền `promptMode` → mặc định `full` (OK), nhưng vẫn không đủ vì thiếu structured + post-processing

## Giải pháp

Tạo **shared helper** `composeBrandedImage` ở `_shared/branded-image-composer.ts` thực hiện đủ pipeline 3 bước, dùng chung cho cả manual và Telegram. Sau đó refactor `generateImageForSinglePost` trong `telegram-webhook` gọi helper này.

### File mới: `supabase/functions/_shared/branded-image-composer.ts`

Export `composeBrandedImage({ supabaseUrl, serviceKey, contentId, channel, brandTemplateId, channelText, channelTitle? })` trả về `{ success, imageUrl, errorCode, error, steps }`.

Pipeline:
1. **Read brand template** (logo_url, footer_info, image_style) qua service client
2. **Step 1 — generate-brand-image** với body đầy đủ:
   - `imageContentType: 'with_text'` nếu text ≤120 ký tự, ngược lại `background_only`
   - `textToInclude`, `textPosition: 'center'`, `typographyStyle: 'modern'`
   - `logoSafeZone: { position: 'bottom-right', sizePercent: 15 }` nếu có logo
   - `promptMode: 'full'`
   - `contentRole: 'sprout'` (an toàn cho social post Telegram)
3. **Step 2 — overlay-brand-logo** (gọi nếu `brand.logo_url`):
   - `imageUrl` từ step 1, `logoUrl: brand.logo_url`, `position: 'bottom-right'`, `sizePercent: 15`
   - Nếu fail → fallback bỏ qua logo, tiếp tục với ảnh step 1 (không block)
4. **Step 3 — footer overlay** (gọi nếu `brand.footer_info` có data):
   - Dùng existing edge function `overlay-footer-svg` (hoặc tạo SVG trực tiếp trong helper bằng Canvas API/sharp nếu chưa có) — **phase này check trước**: nếu chưa tồn tại edge function footer độc lập, helper sẽ chỉ làm step 1+2, log warning để pha sau bổ sung
5. Trả URL cuối + diagnostic log từng step

### Sửa `supabase/functions/telegram-webhook/index.ts`

Trong `generateImageForSinglePost` (~line 1280-1336):
- Thay block fetch trực tiếp `generate-brand-image` bằng `await composeBrandedImage(...)`
- Map `result.success / result.errorCode` vào `ok` + `failReason` như cũ (giữ nguyên 3 case message)
- Giữ AbortSignal.timeout 120s, giữ notify follow-up

### Verify trước khi code

Kiểm tra 2 thứ ở phase implement:
1. `supabase/functions/overlay-brand-logo/index.ts` có exist + accept `imageUrl + logoUrl + position + sizePercent` (nếu khác signature thì adapt)
2. Có edge function nào sẵn cho footer SVG không (search `overlay-footer`, `footer-svg`). Nếu không có → footer sẽ defer sang pha sau, helper chỉ render logo (đã giải quyết 2/3 vấn đề user nêu)

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/branded-image-composer.ts` | **NEW** — helper 3-step compose (read brand → generate-brand-image với full params + structured → overlay-brand-logo → footer if available) |
| `supabase/functions/telegram-webhook/index.ts` | Refactor `generateImageForSinglePost` dùng `composeBrandedImage` thay vì gọi raw `generate-brand-image` |

## Rủi ro

Thấp. Helper bọc cùng 1 edge function existing, giữ luồng fire-and-forget. Nếu logo/footer overlay fail → fallback dùng ảnh raw (giống ảnh hiện tại Telegram đang trả) → user **không thể tệ hơn** trạng thái bây giờ.

## Ngoài phạm vi

- Tạo edge function `overlay-footer-svg` mới nếu chưa có (defer pha sau, sẽ confirm khi implement)
- Refactor manual flow `useAutoImageGeneration` cũng dùng chung helper này (defer — manual flow đã hoạt động, không cần đụng)
- Cho user chọn vị trí logo/footer qua Telegram command (defer)

