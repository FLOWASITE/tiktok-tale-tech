

# Fix: Agent Multichannel không tạo được ảnh đúng

## Nguyên nhân

Khi Agent gọi `generate-brand-image`, nó chỉ truyền `contentId`, `channel`, `brandTemplateId` và `imageContentType: "with_text"`. Trong khi UI (manual flow) truyền đầy đủ:

- `contentSummary` — nội dung text của kênh (để AI hiểu context tạo ảnh)
- `textToInclude` — text cần render lên ảnh (bắt buộc khi `imageContentType = "with_text"`)
- `contentRole`, `contentAngle`, `hookMessage`...

Khi `imageContentType = "with_text"` mà `textToInclude` rỗng → ảnh sinh ra không có text → hoặc lỗi khi render.
Khi `contentSummary` undefined → prompt tạo ảnh không có context nội dung → ảnh generic.

## Giải pháp

### File: `supabase/functions/agent-creator-v2/index.ts`

**Thay đổi trong `generateImagesForChannels()`** — sau khi multichannel content đã tạo xong, trước khi gọi `generate-brand-image`:

1. Fetch nội dung text từng channel từ bảng `multi_channel_contents` (dùng `contentId`)
2. Truyền `contentSummary` = nội dung channel text (truncated ~500 chars)
3. Đổi `imageContentType` từ `"with_text"` → `"background_only"` (vì agent không có decompose step để tạo structured overlay — ảnh background_only vẫn đẹp và phù hợp hơn)
4. Truyền thêm `contentRole`, `contentAngle` từ content data

Cụ thể:
- Thêm param `supabase` vào `generateImagesForChannels()` 
- Fetch `multi_channel_contents` record 1 lần để lấy text các channel
- Map `{channel}_content` → `contentSummary` cho từng channel
- Đổi `imageContentType: "background_only"` (agent không cần text overlay phức tạp)

```typescript
async function generateImagesForChannels(
  supabaseUrl: string,
  serviceKey: string,
  supabase: any,           // NEW
  contentId: string,
  channels: string[],
  brandTemplateId: string | null | undefined,
): Promise<{ success: string[]; failed: string[] }> {
  // Fetch content text for all channels
  const { data: mcContent } = await supabase
    .from("multi_channel_contents")
    .select("*")
    .eq("id", contentId)
    .single();

  // ... rest of function, pass contentSummary per channel
  callFunction(supabaseUrl, serviceKey, "generate-brand-image", {
    contentId,
    channel,
    contentSummary: (mcContent?.[`${channel}_content`] || '').slice(0, 500),
    brandTemplateId,
    imageContentType: "background_only",
    contentRole: mcContent?.content_role,
    contentAngle: mcContent?.content_angle,
  });
}
```

- Cập nhật call site ở `routeMultichannel()` line 377 truyền thêm `supabase`

### Phạm vi: 1 file
`supabase/functions/agent-creator-v2/index.ts` — sửa `generateImagesForChannels()` + call site

