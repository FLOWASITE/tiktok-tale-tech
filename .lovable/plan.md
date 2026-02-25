
# Phase 1 - Quick Wins cho Agentic OS

## Tong quan

3 Quick Wins tren nen tang Graph Engine hien tai (Mini Graph Engine trong `graph-engine.ts`), khong can LangGraph.js dependency ben ngoai vi engine hien tai da co san parallel execution (Promise.allSettled), conditional edges, va DAG topology.

---

## Quick Win 1: Agent Parallelization + Compliance Node

### Hien trang
- Graph Engine da co parallel execution (line 254, `Promise.allSettled` cho ready nodes)
- DAG builder da ho tro fan-out/fan-in tu `compileGraphFromPlan()`
- Template plans da co `parallelWith` (vd: `generate_with_research` co `research` parallel voi `brand_memory`)
- **THIEU**: Compliance Node chua ton tai trong `nodes/`

### Thay doi

**File moi**: `supabase/functions/_shared/graph/nodes/compliance-node.ts`
- Tao `createComplianceNode(ctx)` — goi `preCheckComplianceV2()` tu `compliance-precheck-v2.ts`
- Khong can LLM call (rule-based), `estimatedTokens: 0`
- Return `complianceResult` vao GraphState

**Cap nhat**: `supabase/functions/_shared/graph/graph-state.ts`
- Them `complianceResult?: any` vao `GraphState` interface

**Cap nhat**: `supabase/functions/_shared/graph/nodes/index.ts`
- Them `compliance` node vao registry, `estimatedTokens: 0`, `critical: false`

**Cap nhat**: `supabase/functions/_shared/graph/graph-engine.ts` (TEMPLATE_PLANS)
- Cap nhat `generate_with_research` va `full_pipeline`:
```text
steps: [
  { node: 'research', parallelWith: ['brand_memory', 'compliance'] },  // 3-way fan-out
  { node: 'strategy', dependsOn: ['research'] },
  ...
]
```

**Cap nhat**: `supabase/functions/_shared/graph/orchestrator.ts`
- Them `compliance` vao `VALID_NODES`, `NODE_DESCRIPTIONS`, va `CREATE_GRAPH_PLAN_TOOL` enum

**Cap nhat**: `src/components/topic/chatbot/AgentPipelineBar.tsx`
- Them icon + label cho `compliance` node (Shield icon)

### Ket qua
- 3 nodes (research, brand_memory, compliance) chay dong thoi thay vi tuan tu
- Tiet kiem 4-8 giay moi workflow

---

## Quick Win 2: Smart Cache Layer (Upstash Redis)

### Thay doi

**File moi**: `supabase/functions/_shared/cache/redis-cache.ts`
- Redis client wrapper dung `@upstash/redis` (Deno import)
- `withCache<T>(key, fn, ttlSeconds)` decorator
- `generateCacheKey(brandId, nodeType, state)` — SHA-256 hash cua relevant state subset
- `invalidateByPrefix(prefix)` cho brand update events
- Fallback: neu Redis khong available, bypass cache va goi fn() truc tiep

**Cap nhat**: Node files (research, strategy, content, reviewer)
- Wrap LLM calls trong `withCache()` decorator
- Research: TTL 4h (xu huong thay doi)
- Strategy: TTL 2h 
- Content: TTL 1h (brand-specific)
- Reviewer: khong cache (moi lan can review moi)

**Yeu cau secrets**: 
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Cap nhat**: `supabase/functions/_shared/graph/nodes/index.ts`
- Truyen redis client vao context

### Ket qua
- Cache hit: ~50ms thay vi 3-8s LLM call
- Giam token usage 25-35% cho cac request tuong tu

---

## Quick Win 3: Token & Cost Governor + Early Exit

### Thay doi

**File moi**: `supabase/functions/_shared/graph/nodes/governor-node.ts`
- `createGovernorNode()` — rule-based, khong can LLM
- Logic:
  - Neu reviewer `score >= 90` va `confidence >= 0.85`: early exit, set `status: 'completed'`
  - Neu `tokensUsed > 80% budget`: early exit voi warning
  - Neu score thap: set `exitReason: 'needs_revision'` (cho future revision loop)
- Return `{ status, exitReason, finalResponse }`

**Cap nhat**: `supabase/functions/_shared/graph/graph-state.ts`
- Them `reviewScore?: number`, `reviewConfidence?: number`, `finalResponse?: string` vao GraphState

**Cap nhat**: `supabase/functions/_shared/graph/nodes/reviewer-node.ts`
- Parse review output de extract `score` va `confidence` vao state

**Cap nhat**: `supabase/functions/_shared/graph/nodes/index.ts`
- Them `governor` node, `estimatedTokens: 0`, `critical: false`

**Cap nhat**: `supabase/functions/_shared/graph/graph-engine.ts` (TEMPLATE_PLANS)
- Them `governor` vao cuoi pipeline:
```text
{ node: 'reviewer', dependsOn: ['content'] },
{ node: 'governor', dependsOn: ['reviewer'] },  // NEW
```

**Cap nhat**: `supabase/functions/_shared/graph/orchestrator.ts`
- Them `governor` vao `VALID_NODES`, `NODE_DESCRIPTIONS`

**Cap nhat**: `src/components/topic/chatbot/AgentPipelineBar.tsx`
- Them icon cho `governor` node (Gauge icon)

---

## Tong hop files thay doi

| File | Loai | Quick Win |
|------|------|-----------|
| `graph/nodes/compliance-node.ts` | Moi | #1 |
| `graph/nodes/governor-node.ts` | Moi | #3 |
| `cache/redis-cache.ts` | Moi | #2 |
| `graph/graph-state.ts` | Cap nhat | #1, #3 |
| `graph/nodes/index.ts` | Cap nhat | #1, #2, #3 |
| `graph/graph-engine.ts` | Cap nhat | #1, #3 |
| `graph/orchestrator.ts` | Cap nhat | #1, #3 |
| `graph/nodes/reviewer-node.ts` | Cap nhat | #3 |
| `graph/nodes/research-node.ts` | Cap nhat | #2 |
| `graph/nodes/strategy-node.ts` | Cap nhat | #2 |
| `graph/nodes/content-node.ts` | Cap nhat | #2 |
| `AgentPipelineBar.tsx` | Cap nhat | #1, #3 |
| `.lovable/plan.md` | Cap nhat | All |

## Thu tu thuc hien
1. Quick Win #1 (Parallelization + Compliance Node) — khong can external dependency
2. Quick Win #3 (Governor + Early Exit) — khong can external dependency  
3. Quick Win #2 (Redis Cache) — can Upstash secrets truoc

## Luu y
- Khong can LangGraph.js — Mini Graph Engine hien tai da du kha nang (parallel via Promise.allSettled, DAG topology, conditional edges)
- Redis cache co fallback graceful — neu secrets chua config, system van chay binh thuong
- Governor la rule-based thuan tuy, khong ton token
