## Vấn đề

Đăng **carousel nhiều ảnh** lên Facebook fail với error generic `"An unknown error occurred"`. Logs xác nhận:
- 4 ảnh upload unpublished OK (có `photo_ids`)
- Gọi `POST /{page_id}/feed` với `attached_media[]` → FB trả lỗi sau ~32s
- Code throw `err.error?.message` → mất hết `code`, `error_subcode`, `fbtrace_id` nên không chẩn đoán được

Single-photo và text post **vẫn hoạt động** → token + permission OK. Bug chỉ xảy ra ở multi-photo path.

## Nguyên nhân khả dĩ (cao → thấp)

1. **Race condition**: FB cần vài giây xử lý ảnh unpublished. Gọi `/feed` ngay → FB chưa "ready" các media_fbid → trả lỗi generic.
2. **Photo URLs FB không fetch được** (CDN slow/timeout) → upload "thành công" nhưng FB chưa thật sự process xong.
3. **Caption format** (emoji, ký tự đặc biệt, hashtag) làm parser FB lỗi.

## Kế hoạch sửa

### 1. Log đầy đủ Facebook error (MUST)
File: `supabase/functions/publish-facebook/index.ts`

Hiện tại chỉ log `err.error?.message`. Đổi thành log full payload từ FB:
```ts
console.error('[FB multi-photo] error:', JSON.stringify(err, null, 2));
throw new Error(
  `FB error ${err.error?.code}/${err.error?.error_subcode}: ${err.error?.message} (trace: ${err.error?.fbtrace_id})`
);
```
Áp dụng cho cả 3 nhánh (single photo, multi-photo, text/link) + cho cả `uploadUnpublishedPhoto`.

### 2. Thêm delay + verify trước khi attach (MUST)
Sau khi `Promise.all(uploadUnpublishedPhoto)`:
- **Sleep 3 giây** cho FB process xong
- (Tuỳ chọn) GET `/{photo_id}?fields=id,images` để confirm ảnh ready, retry 2 lần × 2s nếu chưa

### 3. Retry logic cho `/feed` call (MUST)
Nếu `/feed` trả lỗi với code transient (1, 2, 4, 17, 341, 368) → retry tối đa 2 lần, mỗi lần delay 3s.

### 4. Fallback: nếu vẫn fail sau retry (NICE-TO-HAVE)
Tự động fallback sang đăng **album**: tạo album rồi POST từng ảnh vào album với caption ở post đầu. Đây là path stable hơn `attached_media`.

### 5. Surface lỗi đẹp hơn ở UI
File: `src/hooks/useRetryPublish.ts` đã có toast — không cần đổi. Chỉ cần backend trả message rõ ràng hơn.

## File thay đổi
- `supabase/functions/publish-facebook/index.ts` — log chi tiết + delay + retry + (optional) album fallback

## Sau khi deploy
Bạn thử đăng lại 1 carousel. Nếu **vẫn fail**, log mới sẽ cho thấy `error.code` + `error_subcode` + `fbtrace_id` cụ thể → tôi sẽ biết chính xác fix tiếp gì (token scope, photo URL bị block, caption issue, v.v.).

## Câu hỏi nhanh
Caption của bài Carousel bạn vừa thử có gì đặc biệt không (rất dài >5000 ký tự, nhiều emoji liên tiếp, link rút gọn lạ)? Nếu có, gửi tôi 1 đoạn để tôi loại trừ nguyên nhân #3.
