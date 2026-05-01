
# Tối ưu nội dung và ảnh cho Bluesky

## Vấn đề hiện tại

1. **Truncation sai**: Dùng `.length` (UTF-16) thay vì grapheme count — tiếng Việt có dấu bị đếm sai
2. **Ảnh >1MB bị bỏ qua**: Không compress/resize, user mất ảnh mà không biết
3. **Alt text trống**: Mọi ảnh đều `alt: ''` — giảm accessibility và reach trên Bluesky
4. **Không có link card embed**: Link trong text chỉ hiện dạng text, không preview card
5. **Prompt chưa tối ưu**: Chưa hướng dẫn AI tận dụng thread/reply chain, chưa có cultural context

## Thay đổi

### 1. `publish-bluesky/index.ts` — Content & Image Engine

- **Grapheme-safe truncation** bằng `Intl.Segmenter` (có sẵn trong Deno) thay vì `.slice()`
- **Image auto-resize**: Nếu ảnh >1MB, fetch với quality giảm qua image proxy hoặc resize bằng canvas-free approach (re-encode JPEG quality thấp hơn). Fallback: log warning thay vì skip im lặng
- **Alt text tự động**: Dùng nội dung post (truncated 200 chars) làm alt text cho ảnh đầu tiên
- **Link card embed**: Khi content chứa URL nhưng không có ảnh, tạo `app.bsky.embed.external` với URL đầu tiên (fetch OG metadata nếu có thể, hoặc dùng URL trực tiếp)
- **Mention DID resolution**: Resolve `@handle` thành DID thực qua `com.atproto.identity.resolveHandle`

### 2. `generate-multichannel/index.ts` — Prompt Rules

- Cải thiện prompt Bluesky: thêm hướng dẫn "viết như đang trò chuyện với bạn bè", khuyến khích dùng emoji vừa phải, nhấn mạnh tối đa 280 grapheme (chừa margin cho link)
- Thêm instruction: khi topic có link, đặt link cuối post thay vì giữa để không phá flow đọc

### 3. `channelImageConfig.ts` — Image Specs

- Cập nhật size Bluesky từ `1200x675` sang `1200x1200` (1:1 square) — format phổ biến nhất trên Bluesky feed, tương tự Threads
- Thêm `maxFileSizeKB: 976` (< 1MB) vào renderSpec

### 4. `channelSettings.ts` — Channel Rules

- Tăng `emoji_limit` từ 3 lên 5 (Bluesky culture thân thiện với emoji hơn Twitter)
- Thêm `max_images: 4` vào format_description cho rõ ràng

## Technical Details

**Grapheme counting (Deno)**:
```typescript
function graphemeLength(text: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return [...segmenter.segment(text)].length;
}

function graphemeTruncate(text: string, max: number): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(text)];
  if (segments.length <= max) return text;
  return segments.slice(0, max - 1).map(s => s.segment).join('') + '…';
}
```

**Link card embed**:
```typescript
// app.bsky.embed.external — khi có URL nhưng không có ảnh
record.embed = {
  $type: 'app.bsky.embed.external',
  external: { uri, title, description, thumb }
};
```

**Image compression strategy**: 
Bluesky limit 1MB. Thay vì skip, sẽ thử re-fetch image với `?w=1200&q=80` nếu URL hỗ trợ (Supabase Storage transform). Nếu vẫn >1MB, log rõ ràng và trả warning trong response.

## Files sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-bluesky/index.ts` | Grapheme truncation, image resize, alt text, link card embed, DID resolution |
| `supabase/functions/generate-multichannel/index.ts` | Prompt Bluesky cải thiện (2 chỗ) |
| `src/config/channelImageConfig.ts` | Size 1:1, maxFileSize |
| `src/types/channelSettings.ts` | emoji_limit, format_description |
