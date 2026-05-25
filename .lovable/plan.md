
# Fix TikTok Direct Post — Compliance UX + App Name

## Phần 1 — Sửa trên TikTok Developer Portal (user thao tác, không cần code)

Vào https://developers.tiktok.com → app của bạn → **Basic Information**:
- Đặt **App Name** = **Organization Name** (cùng giá trị, ví dụ `Flowa`).
- Lưu, chờ portal cập nhật vài phút.

→ Khắc phục lỗi *"App Name & Organization Name should be the same"*.

## Phần 2 — Build TikTok-compliant composer (code)

TikTok bắt buộc UI đăng bài phải có đủ 5 thành phần, đúng thứ tự. Hiện tại `PublishVideoMenu.tsx` chỉ có 1 ô caption — vi phạm cả 5 điểm. Sẽ tách riêng một dialog dành cho TikTok thay vì dùng chung dialog generic.

### 2.1 Tạo mới `src/components/publishing/TikTokComposerDialog.tsx`

UI sẽ hiển thị theo **đúng thứ tự TikTok yêu cầu**:

1. **Account info row** (avatar + display_name + @username) — lấy từ `social_connections.platform_avatar_url` + `platform_display_name` + `platform_username`.
2. **Caption** (Textarea, max 4000 ký tự, có counter).
3. **Privacy level** — RadioGroup, options lấy động từ TikTok creator info API (PUBLIC_TO_EVERYONE / FOLLOWER_OF_CREATOR / MUTUAL_FOLLOW_FRIENDS / SELF_ONLY). Hiển thị label tiếng Việt + tiếng Anh ("Mọi người · Public", "Bạn bè · Friends", "Chỉ mình tôi · Only me").
4. **Allow users to** — 3 Switch: Comment / Duet / Stitch (mặc định ON; disable Comment nếu creator info trả `comment_disabled=true`).
5. **Disclose video content** (Commercial Content Disclosure):
   - Master Switch "Disclose video content"
   - Khi ON: 2 Checkbox độc lập — "Your brand" và "Branded content"
   - Hiển thị 1 banner cảnh báo:
     - Off → "Your video will be labeled 'Promotional content'." (chỉ hiện khi user bật Your brand)
     - Branded content ON → "Your video will be labeled 'Paid partnership'." + bắt buộc privacy level **không được** SELF_ONLY (disable option đó)
   - Link đọc thêm: `https://www.tiktok.com/legal/page/global/bc-policy/en`
6. **Confirmation footer**:
   - Text rõ ràng: *"By posting, you agree to TikTok's "[Music Usage Confirmation](https://www.tiktok.com/legal/page/global/music-usage-confirmation/en)"."* (hoặc bản branded content nếu bật).
   - Nút **"Post to TikTok"** (không dùng từ chung chung "Đăng ngay").

Reference UI tham khảo: https://developers.tiktok.com/doc/content-sharing-guidelines (TikTok cung cấp design spec chính thức).

### 2.2 Sửa `PublishVideoMenu.tsx`

- Khi `pickedPlatform === 'tiktok'` → mở `<TikTokComposerDialog>` thay vì dialog generic.
- Các platform khác giữ nguyên dialog hiện tại.

### 2.3 Sửa `useDirectPublish` + `publish-tiktok` edge function

Hiện tại edge function tự chọn `privacy_level` và đọc `disable_comment` từ creator info. Cần cho phép UI override:

- `publishToTikTok(opts)` nhận thêm:
  ```ts
  tiktokOptions: {
    privacyLevel: 'PUBLIC_TO_EVERYONE' | 'FOLLOWER_OF_CREATOR' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    disableComment: boolean;
    disableDuet: boolean;
    disableStitch: boolean;
    isCommercialContent: boolean;
    isYourBrand: boolean;
    isBrandedContent: boolean;
  }
  ```
- `publish-tiktok/index.ts`:
  - Bỏ logic auto-pick `PRIVACY_PRIORITY`, dùng `privacyLevel` từ request (vẫn validate nằm trong `privacy_level_options` từ creator info, sai → 400).
  - Body `post_info` thêm:
    ```json
    {
      "privacy_level": "...",
      "disable_comment": ...,
      "disable_duet": ...,
      "disable_stitch": ...,
      "brand_content_toggle": isBrandedContent,
      "brand_organic_toggle": isYourBrand
    }
    ```
  - Validate: nếu `isBrandedContent === true` và `privacyLevel === 'SELF_ONLY'` → 400 (theo policy TikTok).

### 2.4 Endpoint mới `get-tiktok-creator-info`

UI cần biết privacy options + comment_disabled **trước** khi cho user chọn. Tách logic `getCreatorPostSettings()` hiện có trong `publish-tiktok` thành endpoint GET riêng:

- `supabase/functions/get-tiktok-creator-info/index.ts` — input `{ connectionId }`, output `{ privacyLevelOptions, commentDisabled, duetDisabled, stitchDisabled, creatorAvatarUrl, creatorNickname, creatorUsername, maxVideoPostDurationSec }`.
- TikTokComposerDialog gọi endpoint này khi mở để render đúng options.

## Phần 3 — Tài liệu reapply

Tạo `docs/tiktok-reapply-checklist.md` ghi rõ:
- 5 UX bullet points (kèm screenshot mỗi điểm sau khi build xong).
- App Name = Org Name.
- Script quay video demo: kết nối → mở composer → bật từng option → submit.

## Phần 4 — Files thay đổi

**Tạo mới:**
- `src/components/publishing/TikTokComposerDialog.tsx`
- `src/hooks/useTikTokCreatorInfo.ts`
- `supabase/functions/get-tiktok-creator-info/index.ts`
- `docs/tiktok-reapply-checklist.md`

**Sửa:**
- `src/components/video/PublishVideoMenu.tsx` — route TikTok vào composer riêng.
- `src/hooks/useDirectPublish.ts` — thêm `tiktokOptions` cho `publishToTikTok`.
- `supabase/functions/publish-tiktok/index.ts` — accept options từ client, thêm `disable_duet/disable_stitch/brand_*_toggle`.

**Không động:** logic media proxy (`media.flowa.one`), JPEG normalize, polling status.

## Phần 5 — Verify

1. Mở `/video-studio` → nút "Đăng ngay" → chọn TikTok → dialog mới hiển thị đủ 5 phần đúng thứ tự.
2. Bật Branded content → option SELF_ONLY bị disable + label "Paid partnership" hiển thị.
3. Submit → kiểm tra `edge_function_logs` thấy body TikTok có `brand_content_toggle/brand_organic_toggle/disable_duet/disable_stitch`.
4. Quay 1 video demo 60s theo flow trên → upload vào form Reapply của TikTok kèm note "App Name updated to match Org Name".

