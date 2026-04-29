## Vấn đề

Icon `ChannelIcon` đã đúng (Pinterest đỏ, Blogger cam, WordPress xanh) nhưng trên **card nội dung đa kênh** ở các flow khác vẫn sai vì có **nhiều mapping cục bộ** chưa cập nhật:

| File | Pinterest | Blogger | WordPress |
|---|---|---|---|
| `MultiChannelFormWizard.tsx` (L188-192) | `Instagram` ❌ | BloggerIcon (cũ) | WordPressIcon (cũ) |
| `MultiChannelHookGenerator.tsx` (L110-115) | `Instagram` ❌ | `Globe` ❌ | `Globe` ❌ |
| `MultiChannelFormStepper.tsx` (L156-160) | `Instagram` ❌ | BloggerIcon | WordPressIcon |
| `ExpandChannelsDialog.tsx` (L31-35) | `Instagram` ❌ | `Globe` ❌ | `Globe` ❌ |
| `ExpandChannelsStreamingDialog.tsx` (L34-39) | `Instagram` ❌ | `Globe` ❌ | `Globe` ❌ |
| `UnifiedImageGenerator.tsx` (L92-98) | `Instagram` ❌ | `Globe` ❌ | `Globe` ❌ |
| `ImageChannelPicker.tsx` (L20-24) | `Instagram` ❌ | `Globe` ❌ | `Globe` ❌ |
| `CampaignChannelStatus.tsx` (L22-31) | emoji `📌` ❌ | thiếu | thiếu |

Các icon `BloggerIcon`/`WordPressIcon` import trực tiếp render màu `currentColor` nên trông xám/đen — không có khung nền brand như `ChannelIcon` xử lý.

## Giải pháp

**Refactor toàn bộ về một nguồn duy nhất**: dùng `<ChannelIcon channel={ch} size="sm" />` từ `src/components/multichannel/streaming/ChannelIcon.tsx` (đã có Pinterest đỏ, Blogger cam `#FF5722`, WordPress xanh `#21759B` đầy đủ).

### Thay đổi cụ thể

1. **`MultiChannelFormWizard.tsx`** — thay 3 entries `pinterest/blogger/wordpress` trong `CHANNEL_ICONS` map bằng `<ChannelIcon channel="..." size="sm" />`.

2. **`MultiChannelFormStepper.tsx`** — sửa `pinterest: <Instagram />` thành `<ChannelIcon channel="pinterest" size="sm" />`. Đồng bộ Blogger/WordPress cùng cách.

3. **`MultiChannelHookGenerator.tsx`** — map `channelIconMap` từ Lucide component sang component wrapper dùng `ChannelIcon` (hoặc đổi cách render trực tiếp).

4. **`ExpandChannelsDialog.tsx`** & **`ExpandChannelsStreamingDialog.tsx`** — thay 3 entries Pinterest/Blogger/WordPress bằng `<ChannelIcon size="sm" />`.

5. **`UnifiedImageGenerator.tsx`** — entries `pinterest/blogger/wordpress` đang dùng `Instagram`/`Globe` — đổi sang `<ChannelIcon size="sm" />` (giữ `color`/`bgColor` chỉ dùng cho text label nếu cần, vì `ChannelIcon` đã tự lo background brand).

6. **`ImageChannelPicker.tsx`** — đổi `CHANNEL_META.pinterest/blogger/wordpress` icon sang `<ChannelIcon size="sm" />`. Đồng thời update label: `pinterest → 'Pin'`, `blogger → 'Blog'`, `wordpress → 'WP'` (không dùng chung 'IG'/'Web' lẫn lộn nữa).

7. **`CampaignChannelStatus.tsx`** — bỏ map emoji `CHANNEL_ICONS`, thay bằng render `<ChannelIcon channel={status.channel} size="sm" />` ở dòng 68. Tự động cover hết các kênh kể cả Pinterest/Blogger/WordPress/Zalo/Telegram… không còn fallback `📱`.

## Files modified
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `src/components/multichannel/MultiChannelFormStepper.tsx`
- `src/components/multichannel/MultiChannelHookGenerator.tsx`
- `src/components/multichannel/ExpandChannelsDialog.tsx`
- `src/components/multichannel/ExpandChannelsStreamingDialog.tsx`
- `src/components/multichannel/UnifiedImageGenerator.tsx`
- `src/components/multichannel/ImageChannelPicker.tsx`
- `src/components/campaign/detail/CampaignChannelStatus.tsx`

## Không thay đổi
- `ChannelIcon.tsx` & `SocialIcons.tsx` (đã đúng từ lần trước)
- Logic kết nối / data — chỉ sửa tầng hiển thị icon
