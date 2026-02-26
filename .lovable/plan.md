

# Blackboard v2 — Implementation Status

## ✅ COMPLETED — Phase 2: Pragmatic Blackboard v2

### Buoc 1: Migration (schema + RPC) ✅
- Added `session_id` (UUID) and `node_name` (TEXT) columns to `content_embeddings`
- Created indexes: `idx_ce_session`, `idx_ce_node_name`
- Created RPC function `match_blackboard_context` with hybrid priority scoring:
  - Same session: +0.15 priority boost
  - Same brand: +0.05 priority boost
  - Supports filtering by node_types, threshold, count

### Buoc 2: BlackboardRetriever class ✅
- New file: `supabase/functions/_shared/graph/blackboard-retriever.ts`
- Methods: `store()`, `retrieve()`, `retrieveHierarchical()`, `retrieveCrossSession()`
- Uses gte-small 384-dim embeddings (free, no API key)
- Helper functions: `formatRetrievedContext()`, `extractStorableContent()`

### Buoc 3: Auto-store in graph-engine ✅
- `onNodeComplete` callback now auto-stores node outputs via `extractStorableContent()`
- Fire-and-forget pattern — doesn't block graph execution
- Stores: research_output, plan, generated_content, review, compliance_check

### Buoc 4: Update nodes to use retriever ✅
- All 4 LLM nodes (research, strategy, content, reviewer) updated
- Each node uses `retriever.retrieve()` for semantic context when available
- Falls back to `buildStateContext()` when retriever is not provided
- `NodeExecutionContext` interface extended with optional `retriever` field

### Buoc 5: Cross-session memory in orchestrator ✅
- Orchestrator queries `retrieveCrossSession()` before LLM planning
- Past session context injected into orchestrator prompt
- Graceful fallback on error

## Architecture Summary

```
User Message → Orchestrator (+ cross-session memory)
                    │
                    ▼
              Graph Engine
                    │
        ┌───────────┼───────────┐
        │           │           │
   Research    Strategy    Content    ...
        │           │           │
        └───────────┼───────────┘
                    │
              Auto-store (fire-and-forget)
                    │
                    ▼
          content_embeddings (pgvector 384-dim)
                    │
              match_blackboard_context RPC
                    │
        ┌───────────┼───────────┐
        │           │           │
   Same Session  Same Brand   Global
   (+0.15 boost) (+0.05 boost) (base)
```

## Backward Compatibility
- `buildStateContext()` preserved as fallback
- Retriever is optional — nodes work without it
- No new tables — extended existing `content_embeddings`
- Consistent 384-dim gte-small embeddings throughout

## Next Steps (Future)
- Connect retriever in Edge Function entry points (chat handler)
- Monitor embedding storage growth
- Consider Memgraph when >50k entries need graph algorithms
