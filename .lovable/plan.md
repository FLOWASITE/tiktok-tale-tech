## Mục tiêu

Phân loại lại kênh xuất bản trong **Nội dung đa kênh** thành **2 nhóm**:

1. **Website & Long-form** — bài dài có cấu trúc (CMS/blog/email)
2. **Mạng xã hội** — post ngắn, social-first

Loại bỏ **TikTok** và **YouTube** khỏi multichannel (video sẽ chỉ post từ Video Studio .

## Mapping nhóm mới

**Website & Long-form (7):**

- `website`, `blogger`, `wordpress`, `shopify`, `wix` — long-form CMS
- `email` — newsletter dài có subject+body
- (giữ logic đã có cho long-form separation)

**Mạng xã hội (10):**

- `linkedin`, `twitter`, `threads`, `bluesky`, `telegram` — text social
- `facebook`, `instagram`, `zalo_oa`, `pinterest`, `google_maps` — visual/social

**Bỏ:** `tiktok`, `youtube` — không xuất hiện trong picker multichannel.

## Thay đổi

### 1. `src/types/multichannel.ts`

- Đổi `category` của tất cả channel: `'text'|'image'` → `'longform'|'social'` theo mapping trên.
- **Xoá 2 entry** `tiktok` và `youtube` khỏi `CHANNELS` array.
- Type `Channel` union: giữ `tiktok`/`youtube` để không vỡ DB columns/types cũ (`tiktok_content`, `youtube_content` vẫn tồn tại trong DB), nhưng chúng không xuất hiện trong UI picker nữa.

### 2. `src/components/multichannel/CompactChannelGrid.tsx`

- Thay 3 nhóm (Text/Image/Video) bằng 2 nhóm:
  - "Website & Long-form" (icon `FileText`/`Globe`) — `category === 'longform'`
  - "Mạng xã hội" (icon `Users` hoặc `Hash`) — `category === 'social'`
- Bỏ import `Video` nếu không còn dùng.

### 3. `src/components/multichannel/MultiChannelFormStepper.tsx` (lines 447-452)

- File này filter theo `'content'|'social'|'direct'|'local'` (không khớp categories trong types). Chuẩn hoá lại thành 2 nhóm mới `'longform'|'social'` để khớp với types.

### 4. Memory update

- Cập nhật `mem://architecture/multichannel/channel-medium-reclassification-vn` ghi nhận classification mới: 2 nhóm Long-form / Social, TikTok/YouTube đã bị bỏ khỏi multichannel publishing (chỉ Video Studio xử lý).

## Không thay đổi

- DB schema (`tiktok_content`, `youtube_content` columns giữ nguyên cho dữ liệu cũ).
- Edge function `generate-multichannel`, `publish-*` (không gọi cho 2 channel này nữa nhưng code vẫn hoạt động).
- Video Studio vẫn publish TikTok/YouTube qua flow riêng (theo memory `Video Publish + Audio Link`).
- Các view list/stats/filter có thể vẫn show data cũ nếu user đã từng tạo content TikTok/YouTube — chỉ chặn ở picker tạo mới.

## Rủi ro

- Nếu user có content TikTok/YouTube cũ, view stats/group-by-channel vẫn hiển thị bình thường (do `Channel` type giữ nguyên union).
- Không ảnh hưởng publishing đã schedule.