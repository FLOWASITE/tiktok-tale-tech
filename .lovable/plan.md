

# Sửa bug: Zalo upload ảnh bìa trả `attachment_id`, code đọc `url`

## Nguyên nhân

Từ edge logs, Zalo upload API (`/v2.0/oa/upload/image`) trả về:
```json
{"data":{"attachment_id":"AFaH3Zv..."},"error":0,"message":"Success"}
```

Code hiện tại (dòng 176) kiểm tra `uploadResult.data?.url` → không tìm thấy → coi là lỗi → hiển thị "Không thể upload ảnh bìa lên Zalo (Success)".

**Ảnh bìa = ảnh đầu tiên đính kèm bài đăng** (`mediaUrls[0]`). User không cần làm gì thêm, chỉ cần có ảnh trong bài.

## Sửa `supabase/functions/publish-zalo/index.ts`

### 1. Đọc `attachment_id` thay vì `url` (dòng 176-178)
```typescript
// Trước (sai):
if (uploadResult.error === 0 && uploadResult.data?.url) {
  zaloCoverUrl = uploadResult.data.url;

// Sau (đúng):
if (uploadResult.error === 0 && uploadResult.data?.attachment_id) {
  zaloCoverAttachmentId = uploadResult.data.attachment_id;
```

### 2. Dùng `attachment_id` trong article create payload (dòng 206-208)
Thay `photo_url` bằng `attachment_id` khi có:
```typescript
cover: zaloCoverAttachmentId 
  ? { cover_type: 'photo', photo_url: zaloCoverAttachmentId, status: 'show' }
  : { cover_type: 'photo', photo_url: coverImageUrl, status: 'show' },
```

## File thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-zalo/index.ts` | Đọc `attachment_id` từ upload response, dùng trong article cover |

