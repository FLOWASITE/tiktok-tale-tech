# Bỏ Email và Telegram khỏi multichannel picker

## Vấn đề
Trong wizard tạo nội dung đa kênh (step 4 — chọn kênh), Email (nhóm Website & Long-form) và Telegram (nhóm Mạng xã hội) đang hiển thị nhưng user không dùng → cần ẩn.

## Thay đổi
**File duy nhất:** `src/types/multichannel.ts` — xoá 2 dòng trong mảng `CHANNELS`:
- Dòng 439: `{ value: 'email', ... }`
- Dòng 448: `{ value: 'telegram', ... }`

## Tác động
- `MultiChannelFormStepper` và `MultiChannelFormWizard` render groups bằng `CHANNELS.filter(c => c.category === ...)` → Email & Telegram tự biến mất khỏi cả 2 nhóm.
- Badge đếm "Website & Long-form 6/7" → 6/6; "Mạng xã hội 9/10" → 9/9.
- Các icon map `email`/`telegram` trong stepper/wizard giữ nguyên (không hại, chỉ là lookup dictionary).
- `channelContentTypeSupport`, mockups, hook generator… vẫn giữ key `email`/`telegram` để không phá nội dung cũ đã tạo trước đó.

## Ngoài phạm vi
- Không sửa CHANNELS ở Reports filter, CampaignCreate, BrandFormStepPersonas, customerPersona, product — đó là filter báo cáo / persona, không phải picker tạo nội dung.
- Không xoá data cũ trong DB.
