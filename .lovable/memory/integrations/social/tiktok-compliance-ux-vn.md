---
name: TikTok Direct Post Compliance UX
description: Composer riêng cho TikTok với 5 phần bắt buộc + endpoint creator_info, options forward qua publish-tiktok
type: feature
---

# TikTok Composer (compliance UX)

- `src/components/publishing/TikTokComposerDialog.tsx` — 5 phần đúng thứ tự: Account info (avatar+name) → Caption → Privacy RadioGroup (động từ `privacy_level_options`) → Allow Comment/Duet/Stitch Switch → Disclose video content (Your brand / Branded content checkboxes, auto-disable SELF_ONLY khi Branded) → Confirmation footer + nút "Post to TikTok".
- `src/hooks/useTikTokCreatorInfo.ts` — React Query, gọi edge `get-tiktok-creator-info` với `{connectionId}`.
- `supabase/functions/get-tiktok-creator-info/index.ts` — JWT auth + org membership check, proxy TikTok `creator_info/query/`, trả `privacyLevelOptions`, `*Disabled`, `creator*`.
- `supabase/functions/publish-tiktok/index.ts` — `PublishRequest` nhận thêm `tiktokOptions`. `publishPhotoPost(...)` validate `privacyLevel` ∈ allowed options, reject Branded+SELF_ONLY, forward `disable_comment/duet/stitch` + `brand_content_toggle` + `brand_organic_toggle` vào `post_info`.
- `src/hooks/useDirectPublish.ts` — `PublishOptions.tiktokOptions` được spread qua channel-publisher xuống publish-tiktok.
- `PublishVideoMenu.tsx` route TikTok vào `TikTokComposerDialog`, generic dialog vẫn dùng cho FB/IG/YT/LinkedIn.
- App Name & Organization Name trên TikTok Developer Portal phải giống nhau (user-side fix, checklist `docs/tiktok-reapply-checklist.md`).
