
# Plan: Triển khai Góp ý Chuyên gia - Flowa Multi-Agent System

Dựa trên 19 đề xuất từ chuyên gia, chia thành 3 sprint theo mức độ ưu tiên.

---

## SPRINT 1: Ngay lập tức (Critical)

### 1. Governor Revision Controller (Vấn đề #1)

Tách logic revision ra khỏi Governor thành module riêng `revision-controller.ts`.

**Thay đổi:**
- Tạo file `supabase/functions/_shared/graph/nodes/revision-controller.ts`
  - Nhận `reviewResult` với danh sách issues cụ thể
  - Score < 70: Full revision - gọi lại Content Node với revision prompt kèm issue list
  - Score 70-89: Soft revision - chỉ patch các phần bị flag, không regenerate toàn bộ
  - Max 2 vòng revision, sau đó escalate kèm diff
  - Trả về `revisionResult` với diff (original vs revised)

- Sửa `governor-node.ts`:
  - Khi score < 70: gọi Revision Controller (full revision)
  - Khi score 70-89: gọi Revision Controller (soft revision)
  - Sau revision: gọi lại Reviewer, kiểm tra score mới
  - Sau 2 vòng vẫn dưới ngưỡng: set `interruptPayload` type `human_escalation` kèm diff

- Sửa `nodes/index.ts`: Đăng ký revision controller vào Node Registry

- Sửa `graph-engine.ts`: Thêm conditional edge từ Governor quay về Content/Reviewer khi `needs_revision`

### 2. Lightweight Prompt Injection Protection (#13)

**Thay đổi:**
- Tạo file `supabase/functions/_shared/prompt-guard.ts`
  - `sanitizeInput(message)`: Kiểm tra message length (cap 10,000 chars)
  - Strip các pattern nguy hiểm: "ignore all previous instructions", "system prompt:", "you are now", "ADMIN MODE", etc.
  - Log suspicious inputs vào bảng `security_events`
  - Return sanitized message + risk flags

- Sửa Edge Function entry point (chat-topics): Gọi `sanitizeInput()` trước khi tạo GraphState

- Migration: Tạo bảng `security_events` (id, user_id, event_type, original_input, sanitized_input, risk_level, created_at)

### 3. Circuit Breaker trên Redis (#5)

**Thay đổi:**
- Sửa `circuit-breaker.ts`:
  - Thêm `getRedisState(model)` / `setRedisState(model, state)` sử dụng Upstash Redis (import từ redis-cache.ts)
  - Key: `flowa:cb:{model}` với TTL = resetTimeoutMs (5 phút)
  - Fallback: Nếu Redis không available, dùng in-memory (giữ logic hiện tại)
  - Khi circuit trip: write record vào bảng `circuit_breaker_events` (#11)

- Migration: Tạo bảng `circuit_breaker_events` (id, provider, model, failure_count, failure_rate, tripped_at, instance_id, created_at)

### 4. Actual Token Tracking (#3)

**Thay đổi:**
- Sửa `graph-engine.ts` executeGraph():
  - Sau mỗi node complete, extract `usage.prompt_tokens` + `usage.completion_tokens` từ node result
  - Gọi `recordNodeTokens()` với actual tokens thay vì estimated
  - Governor dùng `tokenBudget.used` (actual) thay vì estimated để tính budget

- Sửa mỗi node (content-node, research-node, strategy-node, reviewer-node):
  - Return `actualTokensUsed` trong Partial<GraphState> metadata

- Sửa `graph-state.ts`:
  - Thêm field `actualTokensUsed` vào NodeResult

---

## SPRINT 2: Tháng tới

### 5. Continuation Pattern (#4)

**Thay đổi:**
- Sửa `graph-engine.ts` executeGraph():
  - Thêm configurable `continuationThresholdMs` (default 40000)
  - Khi elapsed > threshold: save checkpoint, set status `continuing`, return partial result kèm `continuationToken`

- Sửa `graph-state.ts`:
  - Thêm `continuationToken?: string` và `continuingFromNode?: string` vào GraphState

- Sửa `runOrchestrator()`:
  - Nếu nhận `continuationToken` trong options: load checkpoint, resume từ node dang dở

- Sửa frontend `useChatStreaming.ts`:
  - Xử lý SSE event `continuation_required`
  - Hiển thị "Đang hoàn thiện..." + auto-trigger continuation request

### 6. Distributed Tracing (#10)

**Thay đổi:**
- Tạo file `supabase/functions/_shared/tracing.ts`
  - `createTrace(requestId)`: Tạo trace_id + root span
  - `createSpan(traceId, parentSpanId, name)`: Tạo child span
  - Propagate trace_id qua tất cả layer (node logs, tool calls, external API headers)

- Sửa `graph-engine.ts`: Inject trace_id vào GraphState.metadata, truyền qua mỗi node
- Sửa `ai-provider.ts`: Include trace_id trong request headers
- Sửa `logger.ts`: Include trace_id trong mọi ai_metrics record

### 7. User Feedback Loop (#16)

**Thay đổi:**
- Migration: Tạo bảng `content_feedback` (id, user_id, content_id, trace_id, governor_score, feedback_type enum('thumbs_up','thumbs_down'), tags text[], comment, created_at)

- Tạo component `ContentFeedback.tsx`: Thumbs up/down + tag chips ("off-brand", "too long", "not relevant", "love it")
- Thêm vào chat message render sau content generation

### 8. Image Node Blackboard Integration (#7)

**Thay đổi:**
- Sửa `image-node.ts`:
  - Thêm `retriever` vào ImageNodeContext
  - Dùng `retriever.retrieve()` thay vì `buildStateContext()`
  - Store image metadata (prompt, aspect_ratio, style, channel) vào Blackboard sau generation

- Sửa `graph-engine.ts` `extractStorableContent()`:
  - Thêm case `image`: Extract prompt + metadata từ generatedImage

---

## SPRINT 3: Q2/2026

### 9. Cache Key Improvements (#6)

**Thay đổi:**
- Sửa `redis-cache.ts` `generateCacheKey()`:
  - Tăng hash từ 16 chars lên 32 chars
  - Thêm `promptVersion` parameter vào function signature
  - Cache key format: `flowa:cache:{brandId}:{nodeType}:{hash32}`

### 10. Cross-session Memory Recency Decay (#8)

**Thay đổi:**
- Sửa RPC `match_blackboard_context`:
  - Thêm recency decay: entries > 30 ngày trừ 0.1, > 90 ngày trừ 0.25
  - Thêm `is_stale` flag check khi brand template updated

### 11. Topic Detection LLM Fallback (#15)

**Thay đổi:**
- Sửa `orchestrator.ts`:
  - Thêm field `extracted_topic` vào `create_graph_plan` tool schema
  - Khi LLM planning, extract topic cùng lúc (zero additional cost)
  - Store extracted topic vào `state.bestTopic` nếu pattern matching miss

### 12. Frontend Error Recovery Matrix (#12)

**Thay đổi:**
- Sửa `useChatStreaming.ts`:
  - SSE drop: Auto-reconnect với exponential backoff (max 3 lần)
  - node_error cho critical node: Message cụ thể + retry button
  - Timeout + partial result: Hiển thị partial + "Tiếp tục?" button

### 13. Multichannel Prioritization (#17)

**Thay đổi:**
- Sửa brand template schema: Thêm `primary_channels` (max 3)
- Sửa `generate-multichannel` Edge Function: Generate primary channels trước, secondary sau
- Khi resource constrained: Skip secondary channels

---

## Chi tiết kỹ thuật

### Cấu trúc file mới
```text
supabase/functions/_shared/
  graph/nodes/revision-controller.ts  (MỚI)
  prompt-guard.ts                      (MỚI)
  tracing.ts                           (MỚI)
src/components/chat/ContentFeedback.tsx (MỚI)
```

### Database migrations
```text
1. Bảng security_events (Sprint 1)
2. Bảng circuit_breaker_events (Sprint 1)
3. Bảng content_feedback (Sprint 2)
4. Cập nhật RPC match_blackboard_context (Sprint 3)
```

### Files cần sửa (Sprint 1)
| File | Thay đổi |
|------|----------|
| `governor-node.ts` | Thêm revision logic, gọi Revision Controller |
| `circuit-breaker.ts` | Thêm Redis persistence, event logging |
| `redis-cache.ts` | Export getRedis() cho circuit-breaker |
| `graph-engine.ts` | Actual token tracking, conditional edges |
| `graph-state.ts` | Thêm actualTokensUsed, revisionRound fields |
| `nodes/index.ts` | Đăng ký revision controller |
| `content-node.ts` | Return usage tokens trong metadata |
| `research-node.ts` | Return usage tokens trong metadata |
| `chat-topics/index.ts` | Thêm prompt guard sanitization |

### Ước tính effort
- Sprint 1 (Critical): 3-4 ngày development
- Sprint 2 (Tháng tới): 4-5 ngày development
- Sprint 3 (Q2/2026): 3-4 ngày development
