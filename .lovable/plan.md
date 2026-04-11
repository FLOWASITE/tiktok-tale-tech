

# Semantic Topic Detection: Bổ sung embedding-based validation cho hasExplicitTopic

## Vấn đề
`hasExplicitTopic()` dùng danh sách cứng 60+ `NON_TOPIC_TERMS` để loại trừ. Khi ngôn ngữ hoặc ngành nghề thay đổi, danh sách này outdated. Ví dụ: "retinol" không nằm trong non-topic list nhưng cũng không rõ là topic hay chỉ là keyword ngẫu nhiên.

## Giải pháp
Thêm **semantic validation layer** phía sau heuristic detection. Khi heuristic nói "có topic", dùng gte-small embedding so sánh candidate topic với known topics/products của brand. Nếu similarity quá thấp với tất cả → coi là false positive, trả về `false`.

Quan trọng: Layer này chỉ chạy trong orchestrator (async, có supabase client), **không** thay đổi hàm `hasExplicitTopic()` gốc (vẫn giữ sync, pure string cho các nơi khác dùng).

## Thiết kế

```text
User message → hasExplicitTopic() [sync, heuristic]
                    ↓ true
              validateTopicSemantically() [async, embedding]
                    ↓
              Compare extracted candidate vs brand's topics/products
                    ↓
              similarity >= 0.4 → confirmed topic
              similarity < 0.4  → false positive, treat as no topic
```

## Thay đổi kỹ thuật

### 1) `orchestrator.ts` — Thêm `validateTopicSemantically()`

Hàm mới, async, nhận `(candidateText, brandTemplateId, supabaseClient)`:
- Dùng `Supabase.ai.Session('gte-small')` (đã có sẵn trong codebase) để embed candidate text
- Query `content_embeddings` table (đã có) với `search_embeddings` RPC, filter `content_types: ['topic']`, threshold thấp (0.35)
- Nếu không có kết quả, thử query `brand_products` bằng text match đơn giản
- Return `{ isValidTopic: boolean, topSimilarity: number, matchedContent?: string }`

### 2) `orchestrator.ts` — Cập nhật `orchestrateWorkflow()`

Trong flow hiện tại, sau khi `hasExplicitTopic()` trả `true`:
- Extract candidate topic text (từ regex patterns đã có: "về X", quoted text, etc.)
- Nếu có `brandTemplateId` trong options → gọi `validateTopicSemantically()`
- Nếu validation fail → override `hasTopic = false`, log decision

```typescript
// Pseudocode trong orchestrateWorkflow
let hasTopic = hasExplicitTopic(message);
if (hasTopic && options.brandTemplateId) {
  const candidate = extractTopicCandidate(message); // reuse regex logic
  if (candidate) {
    const validation = await validateTopicSemantically(
      candidate, options.brandTemplateId, supabaseClient
    );
    if (!validation.isValidTopic) {
      hasTopic = false;
      console.log(`[Orchestrator] Topic "${candidate}" failed semantic validation (sim: ${validation.topSimilarity})`);
    }
  }
}
```

### 3) `orchestrator.ts` — Thêm `extractTopicCandidate()`

Tách logic extract topic text từ `hasExplicitTopic()` thành hàm riêng. Trả về string candidate hoặc null. Reuse các regex pattern: "về X", quoted text, "topic: X", colon pattern.

### 4) `OrchestratorOptions` — Thêm `brandTemplateId?: string`

Để orchestrator có thể nhận brand context cho semantic validation. Thread từ `chat-topics/index.ts` (đã có `brandTemplateId` trong request body).

### 5) `chat-topics/index.ts` — Pass brandTemplateId vào orchestrator options

Minimal change: thêm `brandTemplateId` vào `OrchestratorOptions` khi gọi `runOrchestrator()`.

## Không thay đổi
- `hasExplicitTopic()` — giữ nguyên sync, pure function
- `NON_TOPIC_TERMS` — vẫn giữ, đây là first-pass filter nhanh
- `graph-engine.ts` `validateResearchInclusion()` — vẫn dùng heuristic (không có supabase client ở đó)
- Schema DB — dùng `search_embeddings` RPC có sẵn

## Performance
- Semantic validation chỉ chạy khi heuristic đã nói "có topic" → không thêm latency cho case "không có topic"
- gte-small embedding: ~5-10ms
- `search_embeddings` RPC: ~10-20ms
- Total overhead: ~20-30ms, chỉ cho trường hợp cần validate
- Cache plan key vẫn hoạt động bình thường (dùng kết quả sau validation)

## Kết quả kỳ vọng
- Giảm false positive khi heuristic detect topic nhưng thực ra là noise
- Tự động adapt theo brand data — thêm product/topic mới vào brand = detection tự cải thiện
- Không cần maintain `NON_TOPIC_TERMS` list thường xuyên

