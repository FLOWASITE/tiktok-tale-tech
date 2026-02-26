

# Sprint 2: Triển khai 4 tính năng tiếp theo

## Tổng quan
Triển khai 4 đề xuất Sprint 2: Continuation Pattern, Distributed Tracing, User Feedback Loop, và Image Node Blackboard Integration.

---

## Task 5: Continuation Pattern (Chống Timeout)

**Vấn đề:** Pipeline `generate_with_research` (7 nodes) có thể mất > 55s, gây timeout Edge Function.

**Thay đổi:**

1. **`graph-state.ts`** - Thêm fields mới vào `GraphState`:
   - `continuationToken?: string`
   - `continuingFromNode?: string`
   - Thêm status `'continuing'` vào union type

2. **`graph-engine.ts`** - Sửa `executeGraph()`:
   - Thêm `continuationThresholdMs` vào `GraphExecutionOptions` (default 40000ms)
   - Trong vòng lặp BFS, khi `Date.now() - startTime > continuationThresholdMs`:
     - Save checkpoint via `onCheckpoint`
     - Set `state.status = 'continuing'`, `state.continuationToken = checkpointId`
     - Return partial result với `exitReason: 'continuation_required'`
   - Sửa `runOrchestrator()`:
     - Thêm `continuationToken?: string` vào `RunOrchestratorOptions`
     - Nếu có `continuationToken`: load checkpoint, xác định node tiếp theo, resume graph từ đó thay vì chạy lại orchestrator

3. **`useChatStreaming.ts`** - Frontend xử lý continuation:
   - Xử lý SSE event `continuation_required` (data chứa `continuationToken`)
   - Khi nhận event: hiển thị "Dang hoàn thiện..." + tự động gửi request mới với `continuationToken` trong body
   - Giữ nguyên message hiện tại, append thêm content từ continuation

---

## Task 6: Distributed Tracing

**Vấn đề:** Không thể trace end-to-end từ Frontend qua Graph Engine đến External API.

**Thay đổi:**

1. **Tạo file `supabase/functions/_shared/tracing.ts`**:
   ```text
   - createTrace(requestId): Tao trace object { traceId, rootSpanId, spans[] }
   - createSpan(traceId, parentSpanId, name): Tao span con
   - endSpan(span): Ghi thoi gian ket thuc
   - getTraceHeaders(traceId, spanId): Return headers W3C Trace Context
   ```

2. **`graph-engine.ts`**:
   - Inject `traceId` vào `GraphState.metadata.traceId` ngay khi `runOrchestrator()` bat dau
   - Moi node execution: tao span con tu root span
   - Emit trace info trong `node_complete` event

3. **`ai-provider.ts`**:
   - Them `x-trace-id` header vao moi LLM API call
   - Extract tu `options` hoac tu context

4. **`logger.ts`** - Sua `saveMetrics()`:
   - Dam bao `traceId` always luu vao `ai_metrics` record
   - Them `spanId` vao metrics cho per-node granularity

---

## Task 7: User Feedback Loop

**Vấn đề:** Hệ thống không thu thập feedback từ user thực tế để calibrate Governor.

**Thay đổi:**

1. **Database migration** - Tao bang `content_feedback`:
   ```sql
   CREATE TABLE public.content_feedback (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     conversation_id UUID,
     message_id TEXT,
     trace_id TEXT,
     governor_score INTEGER,
     feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
     tags TEXT[] DEFAULT '{}',
     comment TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   -- RLS: user chi thao tac duoc feedback cua minh
   ```

2. **Tao component `src/components/chat/ContentFeedback.tsx`**:
   - Thumbs up / Thumbs down buttons
   - Tag chips khi thumbs_down: "Off-brand", "Quá dài", "Không liên quan", "Sai thông tin"
   - Tag chips khi thumbs_up: "Tuyệt vời", "Đúng ý", "Sáng tạo"
   - Optional comment textarea (collapse by default)
   - Goi Supabase insert vao `content_feedback`

3. **Tích hợp vào chat message render**:
   - Hien thi `ContentFeedback` duoi moi assistant message co `reviewScores` hoac `generatedContent`
   - Truyen `traceId`, `governorScore` tu message metadata

---

## Task 8: Image Node Blackboard Integration

**Vấn đề:** Image Node không dùng Blackboard v2, không lưu output cho cross-session memory.

**Thay đổi:**

1. **`image-node.ts`**:
   - Them `retriever?: BlackboardRetriever` vao `ImageNodeContext`
   - Neu co retriever: goi `retriever.retrieve(state.userMessage)` de lay context thay vi `buildStateContext()`
   - Sau khi generate xong: goi `retriever.store()` voi metadata (prompt, aspect_ratio, style, channel)
   - Return metadata trong state update de graph-engine co the extract

2. **`blackboard-retriever.ts`** - Sua `extractStorableContent()`:
   - Them case `'image'`:
     ```typescript
     case 'image': {
       if (!update.generatedImage) return null;
       const img = update.generatedImage;
       const meta = [
         img.prompt && `Prompt: ${img.prompt}`,
         img.aspect_ratio && `Aspect: ${img.aspect_ratio}`,
         img.style && `Style: ${img.style}`,
         img.channel && `Channel: ${img.channel}`,
       ].filter(Boolean).join('\n');
       return { content: meta || JSON.stringify(img), contentType: 'image_generation' };
     }
     ```

3. **`graph-engine.ts`** - Sua `runOrchestrator()`:
   - Truyen `retriever` vao Image Node context khi tao node registry (da co pattern cho cac node khac)

---

## Cau truc thay doi

| File | Loai | Mo ta |
|------|------|-------|
| `supabase/functions/_shared/tracing.ts` | Moi | Distributed tracing module |
| `src/components/chat/ContentFeedback.tsx` | Moi | Feedback UI component |
| `supabase/functions/_shared/graph/graph-state.ts` | Sua | Them continuation fields |
| `supabase/functions/_shared/graph/graph-engine.ts` | Sua | Continuation logic + tracing injection |
| `supabase/functions/_shared/ai-provider.ts` | Sua | Trace headers |
| `supabase/functions/_shared/logger.ts` | Sua | spanId trong metrics |
| `supabase/functions/_shared/graph/nodes/image-node.ts` | Sua | Blackboard v2 integration |
| `supabase/functions/_shared/graph/blackboard-retriever.ts` | Sua | Them image case |
| `src/hooks/useChatStreaming.ts` | Sua | Continuation + feedback handling |
| Migration SQL | Moi | Bang content_feedback |

## Uoc tinh
4-5 ngay development, thuc hien song song 4 tasks.

