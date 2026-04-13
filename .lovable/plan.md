

## Tối ưu tốc độ "Ý tưởng chủ đề" (Topic Suggestions)

### Phân tích nguyên nhân chậm

Luồng hiện tại của edge function `topic-ai` (action: `suggest`) chạy **tuần tự**:

```text
Cache check (DB) → Learning context (DB) → Perplexity x2 (3-8s mỗi call) → AI LLM (5-15s) → Parse + Cache save
```

Tổng thời gian: **10-25 giây** khi cache miss. User chỉ thấy skeleton chờ toàn bộ hoàn tất.

### Giải pháp: 3 tầng tối ưu

**1. Backend — Song song hóa tối đa trong edge function**
- Chạy `fetchTopicBrandContext`, `fetchLearningContext`, và `checkTopicCache` song song bằng `Promise.all` thay vì tuần tự
- File: `supabase/functions/topic-ai/index.ts` (line ~140-220)

**2. Backend — Thêm timeout cho Perplexity calls**
- Thêm `AbortController` với timeout 5 giây cho mỗi Perplexity API call
- Nếu timeout → bỏ qua data đó, vẫn sinh suggestions từ brand context + AI
- File: `supabase/functions/_shared/topic-utils.ts` (searchIndustryData, searchAudienceQuestions)

**3. Frontend — Loading UX cải thiện**
- Thay skeleton nhàm chán bằng animated loading state có text mô tả giai đoạn ("Đang phân tích brand...", "Đang tìm xu hướng...", "Đang tạo ý tưởng...")
- Hiển thị thời gian ước tính (~10-15s)
- File: `src/components/topic/TopicDiscoveryPanel.tsx` (renderTopicGrid)

### Chi tiết kỹ thuật

**Edge function parallelization:**
```text
// Trước (tuần tự ~3s)
brandContext = await fetchTopicBrandContext(...)
cache = await checkTopicCache(...)
learningContext = await fetchLearningContext(...)

// Sau (song song ~1s)
[brandContext, cache, learningContext] = await Promise.all([
  fetchTopicBrandContext(...),
  checkTopicCache(...),  
  fetchLearningContext(...)
])
```

**Perplexity timeout:**
```text
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
fetch(url, { signal: controller.signal })
```

**Loading UX phases:**
- 0-3s: "🔍 Đang phân tích thương hiệu..."
- 3-8s: "📊 Đang tìm xu hướng ngành..."
- 8s+: "✨ Đang tạo ý tưởng..."

### File cần sửa
- `supabase/functions/topic-ai/index.ts` — parallelization trong handleSuggest
- `supabase/functions/_shared/topic-utils.ts` — thêm timeout cho Perplexity calls
- `src/components/topic/TopicDiscoveryPanel.tsx` — loading UX

### Kết quả mong đợi
- Giảm thời gian từ ~15-25s xuống ~10-15s (cache miss)
- User không cảm thấy bị "treo" nhờ loading phases
- Perplexity timeout không block toàn bộ flow

