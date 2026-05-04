---
name: Channel Mediums (Multichannel)
description: Phân loại kênh trong "Nội dung đa kênh" thành 2 nhóm Long-form / Social. TikTok & YouTube đã bị loại khỏi multichannel (chỉ Video Studio xử lý).
type: feature
---

# Channel categories trong Multichannel

`CHANNELS` ở `src/types/multichannel.ts` chỉ dùng **2 categories**:

## 1. `longform` — "Website & Long-form"
Bài dài có cấu trúc, CMS/blog/email:
- `website`, `blogger`, `wordpress`, `shopify`, `wix` — long-form CMS (giữ separation theo memory `Longform Channel Separation`)
- `email` — newsletter subject + body

## 2. `social` — "Mạng xã hội"
Post ngắn, social-first:
- Text social: `linkedin`, `twitter`, `threads`, `bluesky`, `telegram`
- Visual/social: `facebook`, `instagram`, `pinterest`, `zalo_oa`, `google_maps`

## Loại trừ
- **`tiktok`** và **`youtube`** KHÔNG xuất hiện trong picker multichannel.
- Video chỉ được publish từ **Video Studio** (xem memory `Video Publish + Audio Link`).
- DB columns `tiktok_content` / `youtube_content` vẫn giữ để không vỡ data cũ; type `Channel` union vẫn chứa 2 giá trị này — chỉ ẩn ở UI tạo mới.

## Components dùng category
- `CompactChannelGrid.tsx` — picker chính (Collapsible 2 nhóm: Globe icon = Long-form, Users icon = Social).
- `MultiChannelFormStepper.tsx` (line ~447) — group cho stepper picker.
- Bất kỳ filter nào theo `c.category === 'text'|'image'|'video'` đều phải migrate sang `'longform'|'social'`.
