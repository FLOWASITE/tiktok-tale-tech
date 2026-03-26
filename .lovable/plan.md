

# Fix: Ảnh tạo bởi Agent không hiển thị trên giao diện xem nội dung

## Nguyên nhân gốc

Khi Agent pipeline tạo ảnh cho multichannel, luồng gọi là:
1. `agent-creator-v2` gọi `generate-brand-image` cho từng kênh
2. `generate-brand-image` lưu ảnh vào **`channel_image_history`** table
3. Nhưng **KHÔNG** cập nhật cột **`multi_channel_contents.channel_images`** (JSON)

Khi user tạo ảnh thủ công qua UI, callback `onSaveChannelImage` sẽ cập nhật `channel_images` JSON column. Nên ảnh hiển thị bình thường.

Giao diện xem (MultiChannelViewer) đọc ảnh từ:
```
content.channel_images?.[channel]?.url
```
Do Agent không ghi vào đây → ảnh không hiện.

Carousel **không bị lỗi này** — hệ thống carousel dùng bảng `carousel_images` riêng và viewer đọc đúng từ bảng đó.

## Giải pháp

Sửa `generate-brand-image/index.ts` — sau khi lưu vào `channel_image_history`, **đồng thời cập nhật** `multi_channel_contents.channel_images` JSON column.

### File: `supabase/functions/generate-brand-image/index.ts` (~line 765-788)

Thêm logic cập nhật `channel_images` sau khi insert vào `channel_image_history`:

```typescript
// After saving to channel_image_history, also update channel_images on the content record
if (contentId && channel) {
  try {
    const { data: currentContent } = await supabase
      .from("multi_channel_contents")
      .select("channel_images")
      .eq("id", contentId)
      .single();

    const currentImages = (currentContent?.channel_images as Record<string, any>) || {};
    currentImages[channel] = {
      url: imageUrl,
      provider: modelUsed,
      aspectRatio: finalAspectRatio,
    };

    await supabase
      .from("multi_channel_contents")
      .update({ channel_images: JSON.parse(JSON.stringify(currentImages)) })
      .eq("id", contentId);

    console.log(`[generate-brand-image] Updated channel_images for ${channel}`);
  } catch (syncErr) {
    console.warn("[generate-brand-image] channel_images sync error:", syncErr);
  }
}
```

### Phạm vi: 1 file
- `supabase/functions/generate-brand-image/index.ts` — thêm sync vào `channel_images`

### Lưu ý
- Không ảnh hưởng luồng tạo ảnh thủ công (vẫn giữ callback cũ)
- Carousel không bị ảnh hưởng (dùng bảng riêng)
- Ảnh cũ đã tạo bởi Agent sẽ không tự hiện — chỉ áp dụng cho pipeline mới

