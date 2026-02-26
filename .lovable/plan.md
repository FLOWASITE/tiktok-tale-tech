
# Sprint 3: Triển khai 5 tính năng Q2/2026 — ✅ COMPLETED

## Tổng quan
Đã triển khai 5 task: Cache Key Improvements, Cross-session Memory Recency Decay, Topic Detection LLM Fallback, Frontend Error Recovery Matrix, và Multichannel Prioritization.

---

## Task 9: Cache Key Improvements ✅

- Thêm `promptVersion` parameter vào `generateCacheKey()` trong `redis-cache.ts`
- Cập nhật tất cả 3 nodes (research, strategy, content) truyền `PROMPT_VERSION = 'v2'`
- Payload hash bao gồm `_pv` field để tránh cache stale khi prompt thay đổi

## Task 10: Cross-session Memory Recency Decay ✅

- Migration cập nhật RPC `match_blackboard_context` với recency decay:
  - Entries > 90 ngày: trừ 0.25 priority
  - Entries > 30 ngày: trừ 0.1 priority
- Thêm `primary_channels TEXT[]` vào `brand_templates` + validation trigger (max 3)

## Task 11: Topic Detection LLM Fallback ✅

- Thêm `extracted_topic` vào `CREATE_GRAPH_PLAN_TOOL` schema trong orchestrator
- Thêm `extractedTopic?: string` vào `GraphPlan` interface
- `runOrchestrator()` gán `plan.extractedTopic` vào `state.bestTopic` (zero-cost fallback)

## Task 12: Frontend Error Recovery Matrix ✅

- SSE Connection Drop: exponential backoff (1s, 2s, 4s), max 3 retries
- Critical Node Error: hiển thị message cụ thể + retry flag cho content/reviewer nodes
- Timeout với Partial Result: phát hiện stream kết thúc thiếu final_response/[DONE], hiển thị banner cảnh báo

## Task 13: Multichannel Prioritization ✅

- Đọc `primary_channels` từ brand template
- Sắp xếp channels: primary trước, secondary sau
- Khi elapsed > 40s: skip secondary channels
- Return metadata `{ primaryCompleted, secondarySkipped, primaryChannels }`

---

## Files đã thay đổi

| File | Loại | Mô tả |
|------|------|--------|
| `redis-cache.ts` | Sửa | Thêm `promptVersion` parameter |
| `content-node.ts` | Sửa | Truyền PROMPT_VERSION |
| `research-node.ts` | Sửa | Truyền PROMPT_VERSION |
| `strategy-node.ts` | Sửa | Truyền PROMPT_VERSION |
| `graph-state.ts` | Sửa | Thêm `extractedTopic` vào GraphPlan |
| `orchestrator.ts` | Sửa | extracted_topic trong tool schema + validatePlan |
| `graph-engine.ts` | Sửa | Gán extractedTopic vào state.bestTopic |
| `useChatStreaming.ts` | Sửa | Error Recovery Matrix |
| `generate-multichannel/index.ts` | Sửa | Primary channels prioritization |
| Migration SQL | Mới | Recency decay + primary_channels + trigger |
