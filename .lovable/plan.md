## Mục tiêu
Cache 10 phút cho kết quả `suggest-cluster-topics` ở client, key = `[clusterId, sortedKeywordIds]`, để tránh gọi lại edge function/AI khi user bấm "Gợi ý topic" lặp lại với cùng pillar + bộ keyword đã chọn.

## Phạm vi & cách tiếp cận
Cache **client-side** (in-memory + `sessionStorage` fallback) là đủ — request hiện chỉ phụ thuộc `clusterId` + bộ keyword được chọn ở UI; không đụng edge function nên không phát sinh chi phí backend mới.

## Các thay đổi

### 1. New: `src/lib/topicSuggestionCache.ts`
Utility nhỏ quản lý cache:
- API: `getCached(key)`, `setCached(key, value)`, `buildKey(clusterId, keywordIds)`.
- TTL = `10 * 60 * 1000` ms.
- Storage: Map in-memory (singleton module-level) + mirror sang `sessionStorage` (`mc:topic_suggest_cache:v1`) để giữ khi user navigate giữa các step của wizard.
- `buildKey`: `${clusterId}::${[...keywordIds].sort().join(',')}` (sort để bộ keyword cùng tập nhưng khác thứ tự vẫn hit cache).
- Tự cleanup entry hết hạn khi đọc; giới hạn ~30 entry để tránh phình.

### 2. Edit: `src/components/seo/SuggestedTopicsFromKeyword.tsx`
- Thêm prop `selectedKeywordIds: string[]` (đã có sẵn ở `SeoFirstEntry`, chỉ cần truyền xuống).
- Trong `generate()`:
  1. Tính `key = buildKey(clusterId, selectedKeywordIds)`.
  2. Nếu có cache hợp lệ → set state từ cache, hiển thị badge "Cached" nhỏ + toast nhẹ "Dùng kết quả gần đây", **không** gọi `supabase.functions.invoke`.
  3. Nếu user bấm nút "Tạo lại" (đã `hasFetched`) → bypass cache (force refresh) và ghi đè entry mới.
- Khi nhận data thành công từ edge function → `setCached(key, suggestions)`.
- Khi `clusterId` hoặc `selectedKeywordIds` đổi → reset `hasFetched=false`, clear suggestions hiện hành (tránh hiển thị data lệch context).

### 3. Edit: `src/components/multichannel/SeoFirstEntry.tsx`
- Truyền `selectedKeywordIds={selectedKeywordIds}` xuống `<SuggestedTopicsFromKeyword />`.

## Ghi chú kỹ thuật
- Không cần đổi edge function `suggest-cluster-topics`; nếu sau này backend nhận thêm `keywordIds` thì cache key đã sẵn sàng.
- Không cache khi response rỗng (`suggestions.length === 0`) để user có thể retry sau khi bổ sung keyword.
- Force-refresh: nút "Tạo lại" đã có icon `RefreshCw` → reuse, chỉ cần thêm flag `force=true` khi gọi.
- Không thêm dependency mới.

## Files
- New: `src/lib/topicSuggestionCache.ts`
- Edit: `src/components/seo/SuggestedTopicsFromKeyword.tsx`
- Edit: `src/components/multichannel/SeoFirstEntry.tsx`
