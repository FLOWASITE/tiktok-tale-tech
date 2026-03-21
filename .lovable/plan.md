

# Sửa lỗi: Zalo OA báo thành công nhưng bài không được đăng

## Nguyên nhân gốc

Từ edge logs:
1. `article/create` → **Success** (error: 0), trả về token
2. `article/verify` → **Error -214**: `"Media is being processed. Please wait for a moment"`

Code hiện tại (dòng 189) chỉ `console.warn` lỗi `-214` rồi vẫn trả `success: true`. Bài viết chưa thực sự được publish vì Zalo chưa xử lý xong ảnh bìa.

## Giải pháp

### Sửa `supabase/functions/publish-zalo/index.ts`

**Retry verify với delay**: Khi gặp error `-214` (media processing), chờ 3-5 giây rồi retry verify tối đa 3 lần. Nếu vẫn thất bại → trả lỗi rõ ràng thay vì `success: true`.

Cụ thể:
- Thay block verify đơn lẻ (dòng 166-191) bằng retry loop
- Mỗi lần gặp `-214` → `await sleep(4000)` rồi gọi lại `/article/verify`
- Tối đa 3 lần retry (tổng ~12-16 giây chờ)
- Nếu sau 3 lần vẫn `-214` → trả `success: false` với message: "Zalo đang xử lý ảnh bìa, vui lòng thử lại sau vài phút"
- Các lỗi khác (không phải `-214`) → xử lý như hiện tại

### Sửa `src/hooks/useDirectPublish.ts`

Thêm nhận diện errorCode `MEDIA_PROCESSING` → toast thân thiện hướng dẫn user thử lại.

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-zalo/index.ts` | Retry verify loop khi gặp -214 |
| `src/hooks/useDirectPublish.ts` | Xử lý errorCode MEDIA_PROCESSING |

