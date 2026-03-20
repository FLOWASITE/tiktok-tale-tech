

# Hỗ trợ đăng nhiều ảnh lên Facebook

## Vấn đề
Hiện tại `publish-facebook` chỉ dùng `mediaUrls[0]` — luôn chỉ post 1 ảnh duy nhất, bỏ qua các ảnh còn lại.

## Giải pháp
Sử dụng **Facebook Multi-Photo Upload API**:
1. Upload từng ảnh dưới dạng "unpublished" (`published=false`) qua `/{pageId}/photos`
2. Thu thập tất cả `photo_id` trả về
3. Tạo 1 feed post kèm tất cả ảnh via `/{pageId}/feed` với `attached_media[0]={media_fbid:id1}&attached_media[1]={media_fbid:id2}...`

## Thay đổi

### `supabase/functions/publish-facebook/index.ts`
Cập nhật hàm `publishToFacebook`:

- **1 ảnh**: Giữ nguyên logic hiện tại (post trực tiếp qua `/photos`)
- **2+ ảnh**: 
  1. Upload song song từng ảnh với `published=false` → lấy `id`
  2. Gọi `/{pageId}/feed` với `message` + `attached_media` array
  3. Return `postId` và `postUrl` như bình thường

```text
// Pseudo-code cho multi-photo:
const photoIds = await Promise.all(
  mediaUrls.map(url => uploadUnpublished(pageId, accessToken, url))
);

const params = { access_token, message: content };
photoIds.forEach((id, i) => {
  params[`attached_media[${i}]`] = `{"media_fbid":"${id}"}`;
});

POST /{pageId}/feed with params
```

Sửa 1 file edge function, ~30 dòng thay đổi trong hàm `publishToFacebook` (line 53-84).

