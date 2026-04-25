## 🎯 Vấn đề hiện tại

`cleanup-old-media/index.ts` queue mọi `image_url` vào `filesByBucket` mà **không khử trùng**. Khi nhiều bản ghi (đã xác minh có 10 cặp trong `carousel_images`) cùng tham chiếu một file:

1. **Lần 1**: `storage.remove([path])` xóa file thật → OK.
2. **Lần 2**: `storage.remove([path])` lại path cùng tên → trả về error "Object not found" → bị đẩy vào `summary.errors` → log nhiễu, làm tưởng có lỗi thật.
3. **Đếm sai**: `storage_files_removed += chunk.length` cộng cả path đã xóa rồi → số liệu phình ảo.

**Rủi ro phụ**: file vừa bị xóa do bước 1 (channel_image_history `is_selected=false`) có thể vẫn được tham chiếu bởi 1 bản ghi `is_selected=true` khác cùng URL → mất ảnh user đang dùng. (Hiện tại trong DB chưa thấy case này nhưng nên phòng ngừa.)

---

## 🛠️ Giải pháp — sửa duy nhất `supabase/functions/cleanup-old-media/index.ts`

### 1. Dùng `Set` per-bucket thay cho `Array` để tự khử trùng
```ts
const filesByBucket: Record<string, Set<string>> = {};
const queueDelete = (url) => {
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  (filesByBucket[parsed.bucket] ??= new Set()).add(parsed.path);
};
```

### 2. Thu thập "URL được giữ lại" trước khi xóa storage
Trước vòng `storage.remove`, query thêm 1 lượt các URL **đang được tham chiếu bởi bản ghi không bị xóa** (chủ yếu `is_selected=true` hoặc record < 7 ngày):

```ts
const protectedUrls = new Set<string>();
// channel_image_history: is_selected=true HOẶC created_at >= cutoff
const { data: keep1 } = await supabase
  .from('channel_image_history')
  .select('image_url')
  .or(`is_selected.eq.true,created_at.gte.${cutoff}`);
keep1?.forEach(r => r.image_url && protectedUrls.add(r.image_url));

// carousel_images: tương tự
// video_generations: status NOT IN ('completed','failed') HOẶC created_at >= cutoff
```

Sau đó loại path đang được protect khỏi `filesByBucket` trước khi remove. Điều này đảm bảo: nếu cùng `image_url` được dùng bởi 2 records (1 cũ `is_selected=false`, 1 mới `is_selected=true`), file sẽ **không** bị xóa khỏi storage — chỉ record cũ trong DB bị xóa.

### 3. Đếm chính xác `storage_files_removed`
Chỉ cộng số file remove **thành công** (response không có per-file error), không cộng nguyên `chunk.length`.

### 4. Filter "Object not found" khỏi `summary.errors`
Đây là noise hợp lệ (đã xóa rồi từ run trước, hoặc race condition) — log warn thay vì error.

---

## 📁 Files affected
- `supabase/functions/cleanup-old-media/index.ts` (chỉnh sửa — auto-redeploy qua Lovable Cloud)

## ✅ Kết quả
- 0 lần gọi `storage.remove` trùng path → log sạch, đếm đúng.
- File user đang dùng (`is_selected=true`) **tuyệt đối** không bị xóa nhầm dù record cũ trùng URL bị dọn.
- Backward compatible — không đổi schema, không đổi cron, không đổi response shape.