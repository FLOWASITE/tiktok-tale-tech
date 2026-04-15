

## Phương án đăng Carousel lên các nền tảng Social

### Hiện trạng phân tích

```text
Platform      | Backend Edge Fn    | Multi-image   | Carousel native | Frontend switch | Hoạt động?
──────────────┼────────────────────┼───────────────┼─────────────────┼─────────────────┼──────────
Facebook      | publish-facebook   | ✅ multi-photo | ❌ (album only)  | ✅ case có      | ✅ OK
Instagram     | publish-instagram  | ✅ carousel    | ✅ native carousel| ✅ case có      | ✅ OK  
LinkedIn      | publish-linkedin   | ⚠️ 1 ảnh only | ❌               | ❌ case thiếu   | ❌ Chưa
X / Twitter   | publish-twitter    | ✅ media upload| ❌               | ✅ case có      | ⚠️ Max 4 ảnh
TikTok        | ❌ không có        | ❌             | ❌               | ❌              | ❌ Chưa
```

### Vấn đề cần xử lý

**1. LinkedIn — Chỉ hỗ trợ 1 ảnh**
- Backend `publish-linkedin` hiện chỉ upload `mediaUrls[0]`, bỏ qua các ảnh còn lại
- LinkedIn REST API hỗ trợ multi-image post (tối đa 9 ảnh) qua `multiImage` content type
- Frontend `DirectPublishButton` switch case không có `linkedin` → rơi vào `default` → không gọi publish

**2. X/Twitter — Giới hạn 4 media**
- Twitter API v2 chỉ cho phép tối đa 4 media per tweet
- Carousel có thể 5-10 slides → cần cắt giảm hoặc chia thread
- Backend đã có logic upload media nhưng chưa validate giới hạn

**3. TikTok — Chưa có edge function**
- Không có `publish-tiktok` edge function
- TikTok Content Posting API yêu cầu: OAuth2, video upload hoặc photo post (slideshow)
- TikTok Photo Post API (carousel) hỗ trợ 2-35 ảnh

**4. Facebook — Multi-page**
- Backend `publish-facebook` lấy `platform_user_id` (Page ID) từ connection
- Nhiều page = nhiều connection records → đã hoạt động nếu user có nhiều Facebook connections
- Frontend cần hiển thị tên page cụ thể thay vì chỉ "Facebook"

**5. Frontend DirectPublishButton — Thiếu case**
- `linkedin`: không có case → không publish được
- `tiktok`: có trong CHANNEL_TO_PLATFORM map nhưng không nằm trong `isSupported` list

---

### Kế hoạch triển khai

#### Phase 1: LinkedIn multi-image (ưu tiên cao)

**Backend — `supabase/functions/publish-linkedin/index.ts`**
- Thêm hàm `createMultiImagePost()` sử dụng LinkedIn `multiImage` content type
- Upload tất cả ảnh (tối đa 9) qua `initializeImageUpload` → `uploadImageBinary` → collect `imageUrn[]`
- Nếu >1 ảnh: dùng `multiImage` content type thay vì `media` single image
- Nếu 1 ảnh: giữ nguyên logic hiện tại

**Frontend — `src/components/social/DirectPublishButton.tsx`**
- Thêm case `linkedin` vào switch trong `handlePublish()`, gọi qua `channel-publisher` (giống facebook/instagram)
- Thêm `'linkedin'` vào mảng `isSupported`

**Frontend — `src/hooks/useDirectPublish.ts`**
- Thêm hàm `publishToLinkedIn()` 

#### Phase 2: X/Twitter carousel handling

**Backend — `supabase/functions/publish-twitter/index.ts`**
- Thêm validation: nếu `mediaUrls.length > 4`, chỉ lấy 4 ảnh đầu tiên
- Log warning khi phải cắt bớt ảnh
- (Tùy chọn nâng cao sau: tự động chia thành thread nếu >4 ảnh)

**Frontend — `CarouselViewer.tsx`**
- Hiển thị warning badge khi carousel có >4 slides và channel là Twitter: "X chỉ hỗ trợ tối đa 4 ảnh"

#### Phase 3: Facebook multi-page display

**Frontend — `DirectPublishButton.tsx`**
- Khi channel là `facebook`, hiển thị tên page (`platform_display_name`) thay vì chỉ "Facebook"
- Nếu có nhiều Facebook connections cho cùng brand, hiển thị dropdown chọn page

**Frontend — `CarouselViewer.tsx`**
- `CAROUSEL_PLATFORM_CHANNELS` map hiện chỉ liệt kê platform chung → cần merge với actual connections để hiển thị từng page riêng biệt

#### Phase 4: TikTok (phức tạp nhất — cần OAuth + API mới)

**Backend — Tạo mới `supabase/functions/publish-tiktok/index.ts`**
- Sử dụng TikTok Content Posting API v2
- Photo Post flow: `POST /v2/post/publish/content/init/` với `media_type: "PHOTO"`, `photo_images` array
- Upload ảnh trước qua TikTok's photo upload endpoint
- Cần OAuth access token từ `social_connections` table

**Backend — `channel-publisher/index.ts`**
- Thêm mapping: `tiktok: 'publish-tiktok'`
- Thêm ACTION_TO_CHANNEL: `tiktok: 'tiktok'`

**Frontend**
- Thêm `'tiktok'` vào `isSupported` trong DirectPublishButton
- Thêm `publishToTikTok()` vào `useDirectPublish`
- Thêm case `tiktok` vào switch

**Lưu ý**: TikTok Photo Post API yêu cầu app có quyền `video.publish` scope. Cần kiểm tra xem OAuth flow hiện tại (`connect-social`) đã request scope này chưa.

---

### Thứ tự thực hiện đề xuất

1. **LinkedIn multi-image + frontend case** — ít rủi ro, API đã có sẵn
2. **X/Twitter 4-image limit** — chỉ thêm validation + warning
3. **Facebook multi-page display** — cải thiện UX
4. **TikTok** — cần nghiên cứu thêm OAuth scope + tạo edge function mới

### Files thay đổi tổng hợp

| File | Thay đổi |
|------|----------|
| `supabase/functions/publish-linkedin/index.ts` | Multi-image upload + multiImage content type |
| `supabase/functions/publish-twitter/index.ts` | Validate max 4 media |
| `supabase/functions/publish-tiktok/index.ts` | **MỚI** — TikTok Photo Post API |
| `supabase/functions/channel-publisher/index.ts` | Thêm tiktok mapping |
| `src/components/social/DirectPublishButton.tsx` | Thêm linkedin + tiktok cases, multi-page display |
| `src/hooks/useDirectPublish.ts` | Thêm publishToLinkedIn, publishToTikTok |
| `src/components/CarouselViewer.tsx` | Twitter warning, multi-page logic |

