

# Plan Caching cho LLM Planning trong Orchestrator

## Vấn đề
Khi fast-path không match (confidence < 0.7), `planWithLLM()` gọi Gemini-3-Pro-Preview mỗi lần. Với `temperature: 0.1`, các message tương tự (cùng intent, cùng cấu trúc) sẽ ra cùng plan. 10 user gửi "viết bài về skincare mùa hè" = 10 LLM calls ra cùng kết quả.

## Giải pháp
Thêm **in-memory plan cache** (LRU) vào `orchestrator.ts`, cache theo hash của các signal quyết định plan — không cache theo nội dung message cụ thể.

## Cache Key Design

```text
planCache:{intentBucket}:{hasTopic}:{hasChannel}:{hasImage}:{msgLengthBucket}
```

- `intentBucket`: kết quả `matchIntent()` dù confidence < 0.7 (vẫn có intent gợi ý)
- `hasTopic`: `hasExplicitTopic()` → true/false  
- `hasChannel`: regex detect platform mentions (FB, IG, TT...)
- `hasImage`: detect image intent keywords
- `msgLengthBucket`: short(<30) / medium(30-100) / long(>100)

Ví dụ: `planCache:generate:true:true:false:medium` → cached plan

## Thay đổi kỹ thuật

### File: `supabase/functions/_shared/graph/orchestrator.ts`

1. Import `memoryCache` từ `../cache/memory-cache.ts` (đã có sẵn)

2. Thêm hàm `buildPlanCacheKey(message)`:
   - Chạy `matchIntent()` lấy intent (dù confidence thấp)
   - Check `hasExplicitTopic()`, detect channel/image/length bucket
   - Return cache key string

3. Wrap `planWithLLM()` trong `orchestrateWorkflow()`:
   ```
   // Before calling planWithLLM:
   const cacheKey = buildPlanCacheKey(state.userMessage);
   const cached = memoryCache.get<GraphPlan>(cacheKey);
   if (cached) {
     log("[Orchestrator] Plan cache HIT: " + cacheKey);
     return { ...cached, fastPath: false, fromPlanCache: true };
   }
   
   // After planWithLLM returns:
   memoryCache.set(cacheKey, plan, 600); // TTL 10 minutes
   ```

4. Thêm field `fromPlanCache?: boolean` vào `GraphPlan` interface trong `graph-state.ts`

5. Log cache hit/miss để monitor hiệu quả

### File: `supabase/functions/_shared/graph/graph-state.ts`
- Thêm `fromPlanCache?: boolean` vào `GraphPlan` interface

## Tại sao không dùng Redis/Semantic cache?
- Plan cache cần **ultra-low latency** (< 1ms) — memory cache phù hợp nhất
- Plan output rất nhỏ (< 1KB) — không tốn memory
- TTL ngắn (10 phút) đủ để cover burst traffic cùng intent
- Edge function instance thường serve nhiều request trong 10 phút → cache có hiệu quả ngay trong 1 instance

## Kết quả kỳ vọng
- Giảm 60-80% LLM planning calls trong burst traffic
- Latency giảm ~1-2s cho mỗi plan cache hit (bỏ qua LLM roundtrip)
- Zero risk: cache miss = fallback về LLM như hiện tại

