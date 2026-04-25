## 🎯 Vấn đề
Trong **View Content Đa kênh**, ảnh tạo cho **Instagram** (và một số kênh khác như TikTok, YouTube) **không đúng tỉ lệ tối ưu**:
- Mockup Instagram render khung `aspect-[4/5]` với `object-cover` (chuẩn IG Feed)
- Nhưng pipeline tạo ảnh trả về ảnh `1:1` → bị crop top/bottom, mất bố cục, trông "không tối ưu"

## 🔍 Root cause (đã verify từ code)

**File:** `src/hooks/useSocialImageGeneration.ts` line 142

```ts
const generateImage = useCallback(async ({
  ...
  aspectRatio = '1:1',   // ❌ Default cứng, không theo channel
  ...
})
```

- Caller (manual regenerate) không truyền `aspectRatio` → luôn nhận `'1:1'`
- Body request gửi tới `generate-brand-image` đã có `aspectRatio: '1:1'` → fallback `getChannelAspectRatio(channel)` ở edge function (line 790) **không kích hoạt** vì giá trị đã truthy
- Kết quả: Instagram nhận ảnh `1:1` thay vì `4:5`; tương tự TikTok có thể nhận `1:1` thay vì `9:16` nếu caller khác cũng dính

**Bằng chứng:**
- `src/config/channelImageConfig.ts:369` — `CHANNEL_OPTIMAL_ASPECT_RATIO` đã định nghĩa đúng (`instagram: '4:5'`, `tiktok: '9:16'`, `youtube: '16:9'`...)
- `src/components/preview/ChannelMockupFrame.tsx:521,637` — Instagram mockup khung `aspect-[4/5]`
- `supabase/functions/generate-brand-image/index.ts:790` — fallback `getChannelAspectRatio(channel)` chỉ chạy khi `aspectRatio` falsy

## 🔧 Giải pháp (2 lớp phòng thủ)

### Layer 1 — Frontend hook auto-resolve theo channel
Sửa `src/hooks/useSocialImageGeneration.ts`:
- Bỏ default cứng `aspectRatio = '1:1'`
- Nếu caller không truyền `aspectRatio` **VÀ** có `channel`, tự động lookup `CHANNEL_OPTIMAL_ASPECT_RATIO[channel]`
- Chỉ fallback `'1:1'` khi cả hai đều thiếu (ảnh generic không gắn channel)

```ts
import { CHANNEL_OPTIMAL_ASPECT_RATIO } from '@/config/channelImageConfig';

const generateImage = useCallback(async ({
  ...
  aspectRatio,         // không default
  channel,
  ...
}) => {
  const resolvedAspectRatio =
    aspectRatio
    ?? (channel ? CHANNEL_OPTIMAL_ASPECT_RATIO[channel] : undefined)
    ?? '1:1';
  // ... gửi resolvedAspectRatio thay vì aspectRatio
});
```

### Layer 2 — Backend defensive (đã có sẵn, chỉ verify)
`supabase/functions/generate-brand-image/index.ts:790` đã có:
```ts
const finalAspectRatio = aspectRatio || getChannelAspectRatio(channel as Channel);
```
→ Giữ nguyên. Đây là safety net cho trường hợp client cũ/khác chưa update.

### Layer 3 — Verify caller chính của manual regenerate
Tìm tất cả nơi gọi `generateImage(...)` với `channel` nhưng không truyền `aspectRatio` để confirm Layer 1 fix triệt để (sẽ làm trong implementation).

## 📊 Tác động
- ✅ Instagram: ảnh sinh ra đúng `4:5` (Portrait Feed) — không còn bị crop
- ✅ TikTok: `9:16` Vertical — đúng chuẩn Reels/TikTok feed
- ✅ YouTube/Facebook/LinkedIn/Twitter: `16:9` Landscape
- ✅ Threads/Telegram/Google Maps: `1:1` Square
- ✅ Không ảnh hưởng caller đã truyền `aspectRatio` tường minh (Wizard/SimpleImageGenerator vẫn override được)

## 📁 Files sẽ sửa
- `src/hooks/useSocialImageGeneration.ts` — bỏ default cứng + auto-resolve theo channel

## ⚠️ Lưu ý
- Ảnh **đã sinh** (cached trong `multi_channel_contents.channel_images`) sẽ vẫn ở tỉ lệ cũ. User cần bấm "Tạo lại ảnh" (force regenerate) cho Instagram để ảnh mới đúng `4:5`.
- Không cần migration DB.
- Không cần redeploy edge function (Layer 2 đã sẵn).
