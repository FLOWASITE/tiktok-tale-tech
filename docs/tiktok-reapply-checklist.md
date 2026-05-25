# TikTok Direct Post — Reapply Checklist

## 1. App Settings (TikTok Developer Portal)

- [ ] **App Name** = **Organization Name** (giống y hệt, ví dụ `Flowa`).
- [ ] Domain `media.flowa.one` đã Verified trong **URL Properties**.
- [ ] Scopes: `user.info.basic`, `video.publish`, `video.upload`.

## 2. UX Compliance — 5 yêu cầu của TikTok

Composer mới ở `src/components/publishing/TikTokComposerDialog.tsx` hiển thị đúng thứ tự:

1. **Account info** — avatar + display name + @username (từ `creator_info` API).
2. **Caption** — Textarea max 4000 ký tự.
3. **Privacy level** — RadioGroup với options động từ `privacy_level_options`.
4. **Allow users to** — 3 Switch Comment / Duet / Stitch (auto-disable nếu creator info trả `*_disabled=true`).
5. **Disclose video content** — master Switch + 2 Checkbox `Your brand` / `Branded content` + labels "Promotional content" / "Paid partnership"; branded content auto-disable SELF_ONLY.
6. **Confirmation** — link Music Usage Confirmation + (nếu Branded) Branded Content Policy + nút **Post to TikTok**.

## 3. Video demo cho reapply

Quay 30–60s screencast:
1. Mở Video Studio → Đăng ngay → chọn TikTok.
2. Show account info row (avatar/nickname).
3. Chọn Privacy = Public.
4. Toggle Comment off, Duet on, Stitch on.
5. Bật Disclose → chọn Branded content → show SELF_ONLY bị disable + "Paid partnership" label.
6. Bấm **Post to TikTok**.

## 4. Endpoints liên quan

- `supabase/functions/get-tiktok-creator-info/index.ts` — proxy creator_info API.
- `supabase/functions/publish-tiktok/index.ts` — nhận `tiktokOptions` từ client, gửi `disable_comment/duet/stitch` + `brand_content_toggle` + `brand_organic_toggle` lên TikTok.
