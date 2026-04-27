# 🚀 Plan tối ưu tốc độ Gợi ý Chủ đề

**Mục tiêu**: Giảm thời gian chờ từ **96s → ~3-8s** cho cache MISS, **1.5s → ~0.2s** cho cache HIT.

---

## 📊 Baseline hiện tại (đo từ logs)

| Tình huống | Thời gian | Bottleneck |
|---|---|---|
| Cache MISS | 96s | qwen-plus generate 10 topics tuần tự |
| Cache HIT (DB) | 1.5s | Round-trip DB query |
| User perception | "Đứng yên" | Không có progress feedback |

---

## 🎯 4 thay đổi (theo thứ tự impact)

### **1. Pre-warm cache khi mở form** (impact: cao, effort: thấp)

**Vấn đề**: User click form → click chip → đợi 96s.
**Fix**: Fetch suggestions ngay khi user navigate vào trang Script/Multichannel/Carousel, dùng stale-while-revalidate.

**Files**:
- `src/hooks/ai/useTopicAI.ts`: Thêm option `prefetchOnMount: true` (default), fire `fetchSuggestions(false)` ngay khi hook mount + brand sẵn sàng
- `src/hooks/ai/topic-suggestions/useSuggestionsState.ts` (nếu có): expose `prefetch()` riêng biệt
- Trang `/scripts/new`, `/multichannel/new`, `/carousel/new`: gọi `useTopicAI({ prefetchOnMount: true })` từ component cha

**Hiệu quả kỳ vọng**: 80% case user click chip → cache đã warm → < 200ms

---

### **2. Streaming progressive UI** (impact: cao về UX, effort: trung bình)

**Vấn đề**: User thấy spinner đứng yên 96s → cảm tưởng app hỏng.

**Fix backend** (`supabase/functions/topic-ai/index.ts`):
- Bật `stream: true` khi gọi `callAI()` cho action `suggest`
- Stream từng topic ra qua SSE với event `topic_chunk` (tương tự pattern carousel streaming đã có)
- Khi xong → emit `topics_complete` + cache vào DB như cũ

**Fix frontend** (`src/hooks/ai/topic-suggestions/useSuggestionsFetch.ts`):
- Dùng `fetch` + `ReadableStream` thay cho `supabase.functions.invoke()`
- Parse SSE chunks → push từng topic vào state ngay khi đến
- Hiển thị `Loader2` chip + "Đang tạo topic 3/6..." trong `TopicSuggestionPanel`

**Files**:
- `supabase/functions/topic-ai/index.ts`
- `supabase/functions/topic-ai/lib/suggest.ts` (nếu tồn tại)
- `src/hooks/ai/topic-suggestions/useSuggestionsFetch.ts`
- `src/components/TopicSuggestionPanel.tsx`: thêm progress text

**Hiệu quả kỳ vọng**: User thấy topic đầu tiên ở **~3-5s** thay vì 96s. Total time vẫn ~60-80s nhưng cảm nhận nhanh hơn 10x.

---

### **3. Giảm 10 → 6 suggestions + nút "Tải thêm"** (impact: trung bình, effort: thấp)

**Vấn đề**: Generate 10 topic dài (mỗi topic 150-250 ký tự) chiếm phần lớn time.

**Fix**:
- `supabase/functions/topic-ai/lib/suggest.ts` (hoặc `index.ts`): default `count: 6`, max `12`
- `src/components/TopicSuggestionPanel.tsx`: thêm button "Tải thêm 6 ý tưởng" gọi `refresh()` với `count: 6, append: true`
- `src/hooks/ai/topic-suggestions/useSuggestionsState.ts`: support append mode

**Hiệu quả kỳ vọng**: ~96s → **~55-60s** cho lần đầu (~40% giảm). Cộng với streaming → user thấy topic đầu ở 3s.

---

### **4. Setup Upstash Redis cache** (impact: trung bình, effort: thấp — chủ yếu config)

**Hiện tại**: `[RedisCache] No Upstash credentials, cache disabled` → mất layer in-memory cache nhanh.

**Hướng dẫn setup** (sẽ trình bày trong chat sau khi approve):
1. User tạo account free tại https://upstash.com (10k commands/day free)
2. Tạo Redis database (region: Singapore cho latency tốt nhất với VN)
3. Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
4. Tôi dùng tool `add_secret` để inject vào Lovable Cloud
5. Code trong `supabase/functions/_shared/cache/redis-cache.ts` đã sẵn sàng — auto-detect và bật

**Hiệu quả kỳ vọng**: Cache HIT giảm từ 1.5s → **~150-200ms** (10x nhanh hơn DB cache).

---

## 📋 Thứ tự thực hiện

1. ✅ **Bước 1**: Giảm 10→6 suggestions (5 phút, deploy ngay)
2. ✅ **Bước 2**: Pre-warm cache on mount (10 phút)
3. ✅ **Bước 3**: Streaming SSE backend + frontend (30-45 phút — phức tạp nhất)
4. ⏸️ **Bước 4**: Hỏi user setup Upstash → add secret → enable Redis

---

## 🔍 Bonus fix (phát hiện trong log)

- **Model fallback bug**: Log báo `Unsupported model qwen-flash, fallback → qwen-plus`. Nếu user config qwen-flash mà code không support → cần thêm `qwen-flash` vào `SUPPORTED_MODELS` trong `topic-ai`. qwen-flash nhanh hơn qwen-plus ~2x. Sẽ fix kèm bước 1.

- **Web search skip**: Log show `Skipped all Perplexity API calls - cost optimization` — đúng ý đồ tiết kiệm. Không cần đổi.

---

## ✅ Kết quả dự kiến sau khi xong

| Tình huống | Trước | Sau |
|---|---|---|
| User mở form lần đầu | Click chip → đợi 96s | Topic xuất hiện sau 3s, full sau 30-40s |
| User click chip lần 2+ | 1.5s | ~200ms (Redis) hoặc ~500ms (DB cache) |
| Cảm nhận | "App hỏng" | "Mượt như Claude/ChatGPT" |

**Không có breaking changes**. Backward compatible với 3 form: Script, Multichannel, Carousel.