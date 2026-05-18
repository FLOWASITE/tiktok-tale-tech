---
name: Campaign Content Mix
description: agent_goals.content_mix (jsonb) lưu phân bổ post/carousel/video per kênh; GoalWizard preview tab có bảng inline 6 cột editable, auto-rebalance, hỗ trợ theo CHANNEL_CONTENT_SUPPORT
type: feature
---

## Schema
- `agent_goals.content_mix jsonb NOT NULL DEFAULT '{}'::jsonb`
- Shape: `{ [channelId]: { post: number, carousel: number, video: number } }`
- `channelId` khớp `AVAILABLE_CHANNELS[].id` trong GoalWizard (không phải `channelKey`)

## Support matrix
`src/lib/channelContentTypeSupport.ts` — `CHANNEL_CONTENT_SUPPORT`:
- Long-form (website/blogger/wordpress/shopify/wix/medium/email): chỉ post
- Social full (facebook/instagram/linkedin/threads/twitter/bluesky/telegram): post+carousel+video
- Pinterest: post+carousel
- Zalo OA / Google Maps: chỉ post

## Default mix (`defaultContentMix`)
- text-only: 100% post
- pinterest-like: 60% post / 40% carousel
- full: 60% post / 30% carousel / 10% video

## UI
- GoalWizard preview tab — block "Kênh × Tần suất × Loại nội dung"
- Grid 6 cột: Kênh | Tần suất | ~Tổng | 📝 | 🎞 | 🎬
- Cell hỗ trợ = `<Input type=number>`, cell không hỗ trợ = "—"
- `rebalanceMix()` giữ sum = total khi user sửa 1 cell, phân phối phần còn lại theo tỉ lệ
- Badge "Tổng" chuyển amber khi sum mix ≠ total

## Auto-sync
- useEffect re-seed `defaultContentMix(ch, total)` khi:
  - channel mới thêm
  - total posts của channel thay đổi (frequency/duration đổi)
- toggleChannel xoá entry khi bỏ chọn kênh

## Persistence
- `useAgentGoals.createGoal` đã spread `content_mix` vào insert
- `GoalSubmitData.content_mix` optional, default `{}`
- Backward compat: goal cũ `content_mix = {}` → UI tự fill default từ channelPostsMap

## V1.1 (chưa làm)
- `generate-campaign-strategy` đọc `content_mix` để force phân bổ `content_type` của CampaignContentPiece thay vì heuristic
