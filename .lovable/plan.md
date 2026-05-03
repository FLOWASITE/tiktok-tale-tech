# Social-aware Keyword Research v3.1

Mở rộng "Brand-aware research" hiện tại bằng một lớp **Social Signals** — đọc các kênh social brand đã kết nối + nội dung gần đây + engagement để AI hiểu brand đang thực sự nói gì, ai tương tác, từ khoá nào đang work.

## Mục tiêu
- Keyword gợi ý phản ánh **giọng thực** của brand trên social (không chỉ profile khai báo)
- Phát hiện **theme/hashtag/từ khóa hot** từ post gần đây để mở rộng seed
- Ưu tiên platform brand đang active (vd brand chỉ có TikTok+IG → seed nghiêng video/visual intent)
- Giữ guardrails Industry Memory như cũ

## 1. Backend — `supabase/functions/keyword-research-v2/index.ts`

### 1.1 New helper: `fetchSocialSignals(supabase, brandTemplateId, organizationId)`
Trả về `SocialSignals | null`:
```ts
{
  active_platforms: string[];           // ['facebook','instagram','tiktok',...]
  platform_handles: { platform, username, display_name }[];
  recent_topics: string[];              // top 10 title/topic từ multi_channel_contents 60 ngày
  recent_hashtags: string[];            // top 15 hashtag tần suất cao
  frequent_terms: string[];             // top 20 noun phrase từ caption gần đây (regex/freq)
  top_engaged_topics: string[];         // topic của posts có engagement cao (join post_metrics)
  audience_questions: string[];         // câu hỏi từ social_post_engagements (event_type='comment') — top 5
}
```
Truy vấn:
- `social_connections` filter `brand_template_id` + `is_active=true` → list platform/handle
- `multi_channel_contents` last 60d cùng brand → đọc fields `<platform>_content`, `tags`, `topic`
- `social_post_metrics` (nếu có) join `content_publishing_logs` → top engaged
- `social_post_engagements` event_type comment → extract câu hỏi (regex `?$`)

Tất cả wrap try/catch, fail mềm (return null) — không block research.

### 1.2 Mở rộng `fetchBrandCtx` → nhận thêm `organizationId`, gọi `fetchSocialSignals` song song với `Promise.all`. Gắn signals vào `BrandCtx.social_signals`.

### 1.3 `buildBrandBlock` — thêm section mới:
```
## SOCIAL FOOTPRINT (giọng thực tế của brand)
- Active channels: tiktok, instagram, facebook
- Handles: @flowa.vn (IG), @flowa (TikTok)
- Recent topics (60d): "AI marketing", "carousel trend", ...
- Trending hashtags brand đang dùng: #aimarketing #flowa ...
- High-engagement themes: "case study agency", "tutorial Canva"
- Audience đang hỏi: "Flowa có hỗ trợ TikTok không?", ...

→ Khi sinh keyword, ƯU TIÊN intent + chủ đề khớp social footprint.
   Nếu brand không có TikTok → hạn chế keyword "tiktok ...".
```

### 1.4 Smart seed derivation — bổ sung nguồn:
- `recent_topics` (weight cao nhất, 4 seed)
- `frequent_terms` (2 seed)
- `audience_questions` → seed dạng long-tail/question
- Loại trùng với pillar seeds đã có

### 1.5 Brand Fit scoring — thêm tiêu chí:
- `social_alignment_bonus`: +10 nếu keyword chứa term trong `recent_topics`/`frequent_terms`
- Final score giữ formula `priority*0.6 + brand_fit*0.4` nhưng `brand_fit` nay tính cả social alignment

## 2. Frontend

### 2.1 `KeywordResearchLabTab.tsx` — Brand DNA panel
Thêm sub-section **"Tín hiệu Social"** trong panel collapsible hiện có:
- Badge mỗi platform đã connect (icon + handle)
- Chip top 5 recent topics + top 5 hashtags
- Empty state: "Chưa kết nối social — kết nối để keyword chính xác hơn" + nút deep-link tới Brand Connections

### 2.2 `KeywordPreviewTable.tsx`
- Tooltip "Brand Fit" mở rộng: nếu match social signal → hiển thị "📱 Khớp social: <topic>"
- Filter mới: "Chỉ hiện keyword khớp social footprint"

## 3. Memory
Cập nhật `mem://features/seo/research-lab-v2-vn.md` ghi rõ:
- Social signals là input bổ sung cho brand context
- Fail-soft khi không có social hoặc query lỗi
- Không lưu raw post content vào prompt — chỉ aggregate (privacy + token budget)

## File thay đổi
- `supabase/functions/keyword-research-v2/index.ts` (helper + prompt + seed + scoring)
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (Social signals panel)
- `src/components/admin/seo-keywords/KeywordPreviewTable.tsx` (badge/filter)
- `.lovable/memory/features/seo/research-lab-v2-vn.md`

## Edge cases
- Brand chưa connect social nào → skip section, fallback brand profile như hiện tại (no regression)
- Brand có social nhưng chưa publish → vẫn dùng platform list để định hướng intent
- Token budget: cap mỗi list 5–15 items, total social block <600 tokens
