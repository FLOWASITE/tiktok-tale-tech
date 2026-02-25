

# Nhan xet & Ke hoach thuc thi: Blackboard v2

## Danh gia ban thiet ke

### Diem manh
- Huong di dung: chuyen tu in-memory JSONB sang vector-first retrieval
- Hybrid search (vector + graph traversal) la kien truc toi uu cho multi-agent memory
- Tach biet semantic search vs hierarchical relationships

### 5 Van de nghiem trong can dieu chinh

#### 1. Memgraph la over-engineering cho giai doan hien tai (CRITICAL)
- He thong chay tren **Supabase Edge Functions (Deno)** — moi request la stateless, cold-start 200-500ms
- Them Memgraph = them 1 external service ($49-99/thang), them network hop (20-50ms moi query), them infra management
- **Postgres recursive CTEs + JSONB** da du kha nang cho hierarchical queries hien tai (session -> steps -> outputs)
- Chi can Memgraph khi co >100k relationships va can real-time graph algorithms (PageRank, community detection) — chua can thiet

**De xuat**: Dung **Postgres-only** voi pgvector + recursive CTEs. Khi dat >50k entries va co nhu cau graph algorithm thuc su, migrate sang Memgraph sau (schema tuong thich)

#### 2. Embedding dimension conflict (CRITICAL)
- Ban thiet ke ghi `VECTOR(1536)` voi `text-embedding-3-large`
- He thong hien tai dung **gte-small 384-dim** (Supabase.ai.Session) — mien phi, khong can API key
- `content_embeddings` table da co voi 384-dim, `brand_memory` table cung 384-dim
- Chuyen sang 1536-dim = can API key (OpenAI/Gemini), ton tien, va phai re-embed toan bo data

**De xuat**: Giu **384-dim gte-small** de nhat quan. Upgrade len 1536 la mot quyet dinh rieng, khong nen ghep vao Blackboard v2

#### 3. `blackboard_entries` table trung lap voi `content_embeddings` + `brand_memory`
- Da co `content_embeddings` (topic, script embeddings) va `brand_memory` (brand-specific memories)
- Tao them `blackboard_entries` = 3 tables lam cung 1 viec

**De xuat**: Mo rong `content_embeddings` them `node_type` values moi ('research_output', 'plan', 'review') va them `session_id` column. Khong tao table moi

#### 4. LangGraph.js references khong phu hop
- He thong dung **Mini Graph Engine** tu viet (graph-engine.ts), khong phai LangGraph.js
- `SupabaseVectorStore` tu `@langchain/community` khong chay trong Deno Edge Functions

**De xuat**: Viet `BlackboardRetriever` class thuan Deno, dung truc tiep Supabase client + RPC functions

#### 5. `buildStateContext()` la bottleneck thuc su
- Hien tai chi lay latest state fields, khong co semantic relevance
- Moi node nhan **toan bo** context du chi can 1 phan — lang phi token

**De xuat**: Thay `buildStateContext()` bang `retrieveRelevantContext(query, nodeType)` — vector search chi lay context lien quan

---

## Ke hoach thuc thi thuc te (Pragmatic Blackboard v2)

### Buoc 1: Mo rong schema (Migration)

Them `session_id` va cac `node_type` values moi vao `content_embeddings`:

```text
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS node_name TEXT;
CREATE INDEX idx_ce_session ON content_embeddings(session_id);
CREATE INDEX idx_ce_node ON content_embeddings(node_name);
```

Tao RPC function `match_blackboard_context`:

```text
CREATE FUNCTION match_blackboard_context(
  query_embedding vector(384),
  match_session_id UUID DEFAULT NULL,
  match_brand_id UUID DEFAULT NULL,
  match_node_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 8
) RETURNS TABLE (...)
-- Uu tien: same session > same brand > global
-- Tra ve: content_text, similarity, node_name, session_id
```

### Buoc 2: BlackboardRetriever class

File moi: `supabase/functions/_shared/graph/blackboard-retriever.ts`

```text
class BlackboardRetriever:
  - constructor(supabase, ctx: { sessionId, brandId, orgId })
  
  - async store(nodeOutput, nodeName, state):
      Generate embedding via gte-small
      Insert vao content_embeddings voi session_id + node_name
  
  - async retrieve(query, nodeType, limit=5):
      Generate query embedding
      Call match_blackboard_context RPC
      Return ranked results
  
  - async retrieveHierarchical(sessionId):
      SELECT * FROM content_embeddings 
      WHERE session_id = $1 
      ORDER BY created_at
      (Thay the Memgraph traversal bang simple query)
  
  - async retrieveCrossSession(brandId, query, limit=3):
      Vector search across all sessions for this brand
      (Long-term memory)
```

### Buoc 3: Thay the buildStateContext()

Cap nhat moi node (research, strategy, content, reviewer) de dung retriever:

```text
// Truoc (cu):
const stateContext = buildStateContext(state);

// Sau (moi):
const relevantContext = await retriever.retrieve(
  state.userMessage, 
  'research',  // current node type
  5            // top 5 relevant pieces
);
const stateContext = formatRetrievedContext(relevantContext);
```

### Buoc 4: Auto-store node outputs

Cap nhat `graph-engine.ts`: sau moi node hoan thanh, tu dong store output vao embeddings:

```text
// Trong executeGraph(), sau khi node complete:
if (update.researchData || update.generatedContent || ...) {
  await retriever.store(outputText, nodeName, state);
}
```

### Buoc 5: Cross-session memory

Them logic vao Orchestrator: truoc khi lap ke hoach, query cross-session memory:

```text
const pastContext = await retriever.retrieveCrossSession(
  brandId, 
  userMessage, 
  3  // top 3 relevant past sessions
);
// Inject vao orchestrator prompt
```

---

## Files thay doi

| File | Loai | Mo ta |
|------|------|-------|
| Migration SQL | Moi | Them session_id, node_name columns + RPC function |
| `graph/blackboard-retriever.ts` | Moi | Unified retriever class (vector + hierarchical) |
| `graph/graph-engine.ts` | Cap nhat | Auto-store node outputs sau execution |
| `graph/nodes/research-node.ts` | Cap nhat | Dung retriever thay buildStateContext |
| `graph/nodes/strategy-node.ts` | Cap nhat | Dung retriever thay buildStateContext |
| `graph/nodes/content-node.ts` | Cap nhat | Dung retriever thay buildStateContext |
| `graph/nodes/reviewer-node.ts` | Cap nhat | Dung retriever thay buildStateContext |
| `graph/nodes/index.ts` | Cap nhat | Truyen retriever vao node context |
| `graph/orchestrator.ts` | Cap nhat | Cross-session memory lookup |
| `graph/graph-state.ts` | Cap nhat | Giu buildStateContext lam fallback |
| `.lovable/plan.md` | Cap nhat | Trang thai Phase 2 |

## Thu tu thuc hien
1. Migration (schema + RPC)
2. BlackboardRetriever class
3. Auto-store trong graph-engine
4. Cap nhat nodes dung retriever
5. Cross-session memory trong orchestrator

## Loi ich so voi ban goc
- **Khong them external service** (Memgraph) — giam complexity va chi phi
- **Nhat quan 384-dim** — khong can API key moi
- **Khong table moi** — dung lai content_embeddings da co
- **Tuong thich nguoc** — buildStateContext van la fallback
- **Migration path**: khi can Memgraph sau, data da san sang (co embeddings, co relationships qua session_id + node_name)

