

## Lỗi `picture_size_check_failed`

**Nguyên nhân**: Ảnh carousel hiện tại là **2048×2048 px**. TikTok Photo API chỉ chấp nhận tối đa **1080×1080** (vuông) hoặc **1080×1920** (dọc). Ảnh quá lớn bị từ chối.

**Giải pháp**: Thêm logic resize trong `normalizeImagesForTikTok()` — sau khi decode, nếu chiều nào > 1080px thì resize xuống max 1080px giữ nguyên tỷ lệ.

## Thay đổi

**File**: `supabase/functions/publish-tiktok/index.ts`

Trong hàm `normalizeImagesForTikTok()`, sau dòng decode (line ~327), thêm:

```typescript
// Resize if dimensions exceed TikTok limits (max 1080px per side)
const MAX_DIM = 1080;
if (image.width > MAX_DIM || image.height > MAX_DIM) {
  const scale = Math.min(MAX_DIM / image.width, MAX_DIM / image.height);
  const newW = Math.round(image.width * scale);
  const newH = Math.round(image.height * scale);
  console.log(`[tiktok-normalize] [${i + 1}] Resizing ${image.width}x${image.height} → ${newW}x${newH}`);
  image = image.resize(newW, newH);
}
```

Không thay đổi gì khác. Chỉ thêm 6 dòng resize trước `encodeJPEG`.

