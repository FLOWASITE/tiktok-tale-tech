

## Phân tích cải tiến Topic AI - Tình trạng hiện tại và Đề xuất

### Tình trạng hiện tại của Topic AI

**Architecture:**
- Edge function `topic-ai` thống nhất với 12 actions: suggest, refine, refine_intel, next_best, weekly_plan, conflict_check, learning, trending, gap_analysis, cluster, keywords, suggest_compliant
- Frontend hook `useTopicAI` consolidates 5 modules: refinement, intelligence, recommendations, trending, suggestions
- Đã tích hợp Perplexity API cho real-time web search
- Có caching với 8-hour buckets (đã tối ưu từ 4h)
- Có Learning Context để học từ feedback

---

### Điểm cần cải tiến

| Lĩnh vực | Vấn đề | Mức độ |
|----------|--------|--------|
| **Missing Feature** | Chưa có `suggest_audience` action để gợi ý đối tượng mục tiêu từ topic | Cao |
| **Cost Optimization** | Nhiều parallel calls không cần thiết (industryInsight + audienceQA luôn chạy) | Trung bình |
| **Persona Matching** | Logic match persona chỉ dựa trên tên, không có semantic matching | Trung bình |
| **Error Handling** | Error handling lặp lại code giữa các modules | Thấp |
| **Cache Strategy** | Cache key không bao gồm personas/products context | Thấp |
| **Prompt Engineering** | Prompts cho một số actions chưa tận dụng hết learning context | Thấp |

---

### Cải tiến 1: Thêm `suggest_audience` Action (Ưu tiên cao)

**Mục đích:** Hỗ trợ AudienceSmartSelector gợi ý audience dựa trên topic đã nhập

**Request interface:**
```typescript
interface SuggestAudienceRequest {
  action: 'suggest_audience';
  topic: string;
  contentGoal?: string;
  brandTemplateId?: string;
  organizationId?: string;
}
```

**Response interface:**
```typescript
interface SuggestAudienceResponse {
  success: boolean;
  matchedPersonaId?: string;        // ID của persona phù hợp nhất
  matchedPersonaName?: string;
  matchScore: number;               // 0-100
  suggestedAudience: string;        // Mô tả audience nếu không match persona
  reasoning: string;                // Giải thích vì sao match/suggest
  keyCharacteristics: string[];     // Đặc điểm chính của audience
  alternativePersonaIds?: string[]; // IDs của personas khác có thể phù hợp
}
```

**Logic:**
1. Fetch all personas từ brand
2. Nếu có personas:
   - Gọi AI để analyze topic vs persona pain points/desires
   - Trả về matchedPersonaId nếu score > 70%
   - Trả về top 2-3 alternatives nếu có nhiều match
3. Nếu không có personas:
   - AI generate suggested audience description
   - Gợi ý tạo persona từ description

---

### Cải tiến 2: Semantic Persona Matching (Ưu tiên trung bình)

**Vấn đề hiện tại (line 1086-1091):**
```typescript
// Chỉ match bằng string includes - không chính xác
const matchedPersona = brandContext.personas.find((p: any) =>
  p.name?.toLowerCase().includes(item.targetPersona.toLowerCase()) ||
  item.targetPersona.toLowerCase().includes(p.name?.toLowerCase())
);
```

**Giải pháp đề xuất:**
1. Sử dụng embeddings để match semantic:
   - Tạo embedding cho topic + angle
   - So sánh với embeddings của persona pain_points + desires
   - Chọn persona có cosine similarity cao nhất

2. Fallback logic:
   - Nếu không có embeddings, dùng keyword matching
   - Match pain_points, desires, occupation keywords

---

### Cải tiến 3: Smart Parallel Calls (Ưu tiên trung bình)

**Vấn đề hiện tại (line 189-192):**
```typescript
// Luôn gọi cả 2, ngay cả khi không cần
const [industryInsight, audienceQA] = await Promise.all([
  industryToSearch ? searchIndustryData(...) : null,
  industryToSearch ? searchAudienceQuestions(...) : null,
]);
```

**Giải pháp:**
1. Thêm flag `skipWebSearch` để bypass Perplexity calls khi:
   - Brand đã có đủ learning context (> 20 feedback points)
   - Cache hit recent (< 4 hours)
   - User đang trong trial/low-cost mode

2. Conditional parallel calls:
```typescript
const parallelTasks = [];
if (shouldSearchIndustry) parallelTasks.push(searchIndustryData(...));
if (shouldMineAudienceQA) parallelTasks.push(searchAudienceQuestions(...));
const results = await Promise.all(parallelTasks);
```

---

### Cải tiến 4: Enhanced Cache Key (Ưu tiên thấp)

**Vấn đề:** Cache key không reflect personas/products changes
```typescript
// Hiện tại
const cacheKey = `topic-suggestions-v7:${orgId}:${industry}:${goal}:${brandId}:${format}:${hourBucket}`;
```

**Giải pháp:**
```typescript
// Thêm hash của personas/products count để invalidate khi data thay đổi
const contextHash = hashCode(`${personas.length}-${products.length}-${mappings.length}`);
const cacheKey = `topic-suggestions-v8:${orgId}:${industry}:${goal}:${brandId}:${format}:${contextHash}:${hourBucket}`;
```

---

### Cải tiến 5: Consolidated Error Handler (Ưu tiên thấp)

**Vấn đề:** `handleIntelApiError` và `handleRecApiError` trong useTopicAI.ts gần như giống nhau (lines 191-273)

**Giải pháp:** Tạo generic handler:
```typescript
const createApiErrorHandler = (setError, setErrorCode, moduleName) => {
  return (err, fallbackMessage) => {
    // Unified logic
  };
};
```

---

### Files cần tạo/sửa

| File | Thay đổi | Độ phức tạp |
|------|----------|-------------|
| `supabase/functions/topic-ai/index.ts` | Thêm `handleSuggestAudience` handler | Trung bình |
| `supabase/functions/_shared/topic-utils.ts` | Thêm `semanticMatchPersona` utility | Trung bình |
| `src/hooks/ai/useTopicAI.ts` | Thêm `suggestAudience` method vào module | Thấp |
| `src/hooks/ai/types.ts` | Thêm `SuggestAudienceResult` type | Thấp |

---

### Roadmap đề xuất

| Phase | Công việc | Ưu tiên |
|-------|-----------|---------|
| Phase 1 | Thêm `suggest_audience` action (cần cho AudienceSmartSelector) | Cao |
| Phase 2 | Semantic persona matching với embeddings | Trung bình |
| Phase 3 | Smart parallel calls & cost optimization | Trung bình |
| Phase 4 | Cache key enhancement & error consolidation | Thấp |

---

### Kết quả mong đợi

| Trước | Sau |
|-------|-----|
| Không có AI gợi ý audience | AI match persona từ topic với reasoning |
| String-based persona matching | Semantic matching với embeddings |
| Luôn gọi Perplexity API | Smart conditional calls giảm cost |
| Error handlers trùng lặp | Consolidated, maintainable code |

