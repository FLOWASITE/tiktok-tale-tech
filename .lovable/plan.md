

# Fast-Path Decision Logging & Analysis

## Vấn đề
Fast-path regex dùng confidence cứng (0.7-0.95) nhưng tiếng Việt context-dependent. "Viết bài về Facebook" có thể là `generate` hoặc `research`. Hiện chỉ có `console.log` — không thể phân tích sau để tune pattern.

## Giải pháp
Log mọi fast-path decision vào DB (dùng bảng `agent_pipeline_logs` có sẵn), kèm đủ metadata để sau này so sánh với user behavior (sửa lại, hỏi lại, abandon).

## Thay đổi

### 1) `supabase/functions/_shared/graph/orchestrator.ts`

Mở rộng `matchIntent` trả thêm metadata:
```typescript
interface FastPathResult {
  intent: string;
  confidence: number;
  matchedPatterns: string[];   // regex patterns đã match
  allScores: Record<string, number>; // score của mọi intent
  ambiguityFlag: boolean;      // true nếu 2+ intent cùng score
}
```

Thêm hàm `buildFastPathLogEntry(message, result)` tạo structured JSON cho `output_summary`.

Trong `orchestrateWorkflow`, sau khi fast-path thành công, gọi fire-and-forget log:
```typescript
if (fastPlan) {
  logFastPathDecision(state, matchResult, supabaseClient); // non-blocking
  return fastPlan;
}
```

Cũng log khi fast-path MISS (confidence < 0.7) để biết LLM planning đã handle đúng chưa.

### 2) `supabase/functions/_shared/graph/orchestrator.ts` — `logFastPathDecision`

Hàm mới, fire-and-forget insert vào `agent_pipeline_logs`:
```typescript
async function logFastPathDecision(state, matchResult, supabase) {
  try {
    await supabase.from('agent_pipeline_logs').insert({
      pipeline_id: state.metadata?.pipelineId, // nullable nếu chat-only
      agent_name: 'orchestrator_fastpath',
      action: matchResult ? 'fast_path_hit' : 'fast_path_miss',
      input_summary: state.userMessage.slice(0, 300),
      output_summary: JSON.stringify({
        intent: matchResult?.intent,
        confidence: matchResult?.confidence,
        allScores: matchResult?.allScores,
        ambiguityFlag: matchResult?.ambiguityFlag,
        matchedPatterns: matchResult?.matchedPatterns,
        templateChosen: templateKey,
        messageLength: state.userMessage.length,
      }),
      tokens_used: 0,
      cost_usd: 0,
      duration_ms: 0,
    });
  } catch (_) { /* fire and forget */ }
}
```

### 3) Xử lý pipeline_id nullable

`agent_pipeline_logs.pipeline_id` hiện `NOT NULL` với FK constraint. Chat flow (graph engine) không luôn có pipeline_id. Hai lựa chọn:

- **Option A**: Tạo migration `ALTER TABLE agent_pipeline_logs ALTER COLUMN pipeline_id DROP NOT NULL` — đơn giản, cho phép log orchestrator decisions không gắn pipeline
- **Option B**: Tạo bảng riêng `orchestrator_decision_logs` — tách biệt hơn nhưng thêm bảng

→ Chọn **Option A** vì bảng hiện có đã đủ cột, chỉ cần relax constraint.

### 4) Thêm ambiguity detection vào `matchIntent`

Khi 2+ intent có score bằng nhau hoặc chênh ≤ 1, set `ambiguityFlag: true`. Đây là signal quan trọng nhất để phát hiện false positive sau này.

## Files thay đổi
- `supabase/functions/_shared/graph/orchestrator.ts` — mở rộng matchIntent, thêm logFastPathDecision
- Migration mới — `ALTER COLUMN pipeline_id DROP NOT NULL`

## Kết quả
- Mọi fast-path decision được log kèm confidence, all scores, ambiguity flag
- Query đơn giản để tìm false positive: `WHERE ambiguityFlag = true AND confidence < 0.85`
- So sánh với user behavior: join với conversation messages để xem user có hỏi lại/sửa không
- Dữ liệu để tune regex patterns theo thời gian

