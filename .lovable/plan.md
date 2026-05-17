# Tối ưu 2 AI function: rule-based + cache

## 1. `suggest-channels` → Rule-based (bỏ AI)

Thay AI call bằng bảng điểm `CHANNEL_FIT` deterministic.

**Logic:**
- Bảng `OBJECTIVE_CHANNEL_SCORES`: map `objective × channel → score (0-100)`
  - `awareness`: tiktok 95, facebook 90, instagram 85, youtube 80, linkedin 40, blog 50, zalo 60
  - `engagement`: instagram 95, tiktok 90, facebook 85, threads 80, linkedin 60
  - `conversion`: facebook 90, instagram 85, blog 80, website 85, linkedin 75, google_business 70
  - `retention`: zalo 90, email 95, blog 70, facebook 60
  - `seo/traffic`: blog 95, website 90, youtube 75
  - `b2b/leads`: linkedin 95, blog 80, website 75
- **Modifier theo brand/industry:**
  - Industry `beauty/aesthetic` → +10 instagram, +15 tiktok, −20 linkedin
  - Industry `b2b/saas/legal` → +20 linkedin, +10 blog, −15 tiktok
  - Brand tone `professional` → +5 linkedin/blog
  - Brand tone `playful/genz` → +10 tiktok/instagram
- **Filter:** chỉ giữ channels có trong `available_connections` (đã connect)
- **Output:** top 3-6 channels theo score giảm dần, kèm `reason` ngắn ("Phù hợp awareness + audience trẻ trên TikTok")

**Code:** rewrite `supabase/functions/suggest-channels/index.ts`
- Bỏ `callAI`, bỏ AI config
- Pure function `scoreChannels({ objective, industry, brandTone, available })`
- Latency <5ms, 0$ cost, deterministic
- Xóa entry `suggest-channels` khỏi `ai-config.ts` + admin UI (migration soft-delete row trong `ai_function_configs`)

## 2. `suggest-piece-topics` → Giữ AI + thêm Cache 7 ngày

**Cache key:** `hash(brand_id + pillar + angle + role + channel + existing_titles.join('|'))`

**Triển khai:**
- Dùng `withCache()` từ `_shared/cache-utils.ts` (đã có)
- TTL: 7 ngày = 604800s
- Scope: `'org'` (cache per organization, không cross-tenant)
- Update `ai-config.ts`: `cache_ttl_seconds: 604800`
- Update DB row trong `ai_function_configs` cho `suggest-piece-topics`

**Expected impact:**
- 70-80% cache hit rate (user thường suggest lại cùng pillar/angle trong 1 campaign)
- Cost giảm từ ~$0.0003/call → ~$0.00006/call trung bình
- Latency cache hit <50ms (thay vì 2-4s gọi AI)

## Files thay đổi

```text
supabase/functions/suggest-channels/index.ts          [rewrite - bỏ AI]
supabase/functions/suggest-piece-topics/index.ts      [thêm withCache wrap]
supabase/functions/_shared/ai-config.ts               [xóa suggest-channels, set TTL 604800 cho suggest-piece-topics]
supabase/migrations/<new>.sql                         [DELETE suggest-channels row, UPDATE TTL cho suggest-piece-topics]
```

## Verify sau khi deploy

1. Curl `suggest-channels` với 3 objective khác nhau → check score ranking đúng
2. Curl `suggest-piece-topics` 2 lần liên tiếp cùng input → lần 2 phải hit cache (check `x-cache: HIT` header hoặc log)
3. Check Admin AI Management UI → `suggest-channels` không còn, `suggest-piece-topics` hiện TTL 7d
