

# Bao cao Ky thuat Chi tiet v2.2 — Final Edition

Tai lieu nay la nguon su that duy nhat ve kien truc he thong Multi-Agent Flowa. Cap nhat sau Sprint 5 (Dead Code Cleanup + Type Hygiene).

---

## 1. Tong quan Kien truc

Flowa su dung kien truc **Agentic Operating System** dua tren Graph Engine — mot DAG execution engine chay tren Deno Edge Functions. He thong da loai bo hoan toan Legacy Supervisor va Single-Turn mode (Sprint 4-5).

```text
 User Message
      |
      v
 +-----------------+
 |  chat-topics    |  (Edge Function — diem vao duy nhat)
 |  index.ts       |
 +--------+--------+
          |
          v
 +--------+--------+
 |  Orchestrator    |  (Fast-path heuristic + LLM fallback)
 |  orchestrator.ts |
 +--------+--------+
          |
          v
 +--------+--------+
 |  Graph Engine    |  (DAG compiler + executor)
 |  graph-engine.ts |
 +--------+--------+
          |
    +-----+------+------+------+------+------+------+------+
    |     |      |      |      |      |      |      |      |
    v     v      v      v      v      v      v      v      v
  research brand  compliance strategy content reviewer governor image
           memory
```

**Luong thuc thi:**
1. `chat-topics/index.ts` nhan request, fetch context song song (brand, persona, product, RAG, web search)
2. Orchestrator phan loai intent bang heuristic regex (0 LLM cost). Neu confidence < 0.7, goi LLM (gemini-2.5-flash) de lap ke hoach
3. Graph Engine compile plan thanh DAG, thuc thi song song cac node doc lap qua `Promise.allSettled`
4. Ket qua duoc stream ve client qua SSE

---

## 2. Cac Thanh phan Chinh

### 2.1 Graph Engine (`graph-engine.ts` — 719 dong)

| Thanh phan | Vai tro |
|---|---|
| `GraphBuilder` | API khai bao node, edge, conditional edge |
| `compileGraphFromPlan()` | Bien GraphPlan thanh GraphDefinition |
| `executeGraph()` | BFS-style executor, ho tro song song, timeout, checkpoint |
| `runOrchestrator()` | Entry point cao nhat: orchestrate → compile → execute |
| `TEMPLATE_PLANS` | 6 template co san (chat, research_only, generate_simple, generate_with_research, full_pipeline, image_generate) |

**Tinh nang nang cao:**
- **Continuation Pattern:** Khi elapsed > `continuationThresholdMs`, luu checkpoint va tra ve partial result. Cho phep resume sau timeout Edge Function (55s)
- **Token Budget:** Moi node co `estimatedTokens`, engine skip node khi budget can kiet
- **Conditional Edges:** Governor → Reviewer loop (revision cycle)
- **Distributed Tracing:** W3C Trace Context compatible, moi node co span rieng

### 2.2 Orchestrator (`orchestrator.ts` — 388 dong)

**3 buoc quyet dinh:**
1. `forceTemplate` — bat buoc dung template chi dinh
2. `tryFastPath()` — regex-based intent matching (research, plan, generate, complex_workflow, multi_step, image_generate). Confidence >= 0.7 thi dung template
3. `planWithLLM()` — Goi gemini-2.5-flash voi tool calling `create_graph_plan`. Co Blackboard v2 cross-session context

**Intent → Template mapping:**

| Intent | Template | Mo ta |
|---|---|---|
| chat (default) | `chat` | Chi chay content node |
| research | `research_only` | Chi chay research node |
| plan | `generate_with_research` | research → strategy → content → reviewer → governor |
| generate (co topic) | `generate_simple` | content → reviewer → governor |
| generate (khong topic) | `generate_with_research` | research song song brand_memory + compliance |
| complex_workflow / multi_step | `full_pipeline` | Day du 5 buoc |
| image_generate | `image_generate` | Chi chay image node |

### 2.3 GraphState (`graph-state.ts` — 265 dong)

State trung tam truyen giua cac node. Cac field chinh:

- `messages`, `userMessage` — hoi thoai
- `userIntent`, `confidence`, `orchestratorPlan` — phan loai
- `researchData`, `contentPlan`, `generatedContent`, `reviewResult`, `complianceResult`, `generatedImage`, `brandMemoryContext` — output cac node
- `reviewScore`, `reviewConfidence`, `finalResponse` — governor/reviewer
- `nodeResults[]` — lich su thuc thi moi node
- `tokenBudget` — ngan sach token (total, used, perNode)
- `interruptPayload` — human-in-the-loop
- `continuationToken` — anti-timeout

**Merge strategy:** `mergeStateUpdate()` — arrays (nodeResults, messages) duoc append, objects (metadata, tokenBudget) duoc shallow-merge.

---

## 3. He thong 8 Nodes

### 3.1 Research Node (`research-node.ts`)
- Goi `enhancedWebSearch()` de tim xu huong, doi thu
- Ho tro tool: `web_search`, `competitor_analysis`
- Output: `researchData`, `bestTopic`, `suggestedTopics`

### 3.2 Brand Memory Node (`brand-memory-node.ts`)
- **Khong goi LLM** — chi fetch du lieu tu DB
- Load brand context, industry memory, glossary
- Output: `brandMemoryContext` (string)
- Token cost: 0

### 3.3 Compliance Node (`compliance-node.ts`)
- **Khong goi LLM** — rule-based precheck
- Dung `preCheckComplianceV2()` voi resolved_rules tu `industry_jurisdiction_profiles`
- Output: `complianceResult` (riskLevel, riskScore, issues[])
- Token cost: 0

### 3.4 Strategy Node (`strategy-node.ts`)
- Lap ke hoach noi dung dua tren research data
- Output: `contentPlan`
- Token cost: ~2,500

### 3.5 Content Node (`content-node.ts`) — **Critical**
- Goi LLM 2 lan: (1) tool calling de generate content, (2) follow-up de tong hop
- Tools: `generate_multichannel`, `generate_script`, `generate_carousel`, `save_topic`
- Co Blackboard v2 semantic context retrieval va Redis cache (1h TTL)
- Output: `generatedContent`
- Token cost: ~4,000

### 3.6 Reviewer Node (`reviewer-node.ts`)
- Cham diem noi dung theo tieu chi brand voice, compliance, chat luong
- Output: `reviewResult`, `reviewScore`, `reviewConfidence`
- Token cost: ~2,000

### 3.7 Governor Node (`governor-node.ts`)
- **Khong goi LLM truc tiep** — rule-based quality gate
- 5 quy tac:
  1. Score >= 90 + confidence >= 0.85 → early exit
  2. Budget > 80% → early exit voi warning
  3. Revision rounds >= 2 (MAX) → human escalation (interrupt)
  4. Score < 70 → full revision (goi Revision Controller)
  5. Score 70-89 → soft revision
- Revision Controller (`revision-controller.ts`) goi LLM de sua noi dung
- Conditional edge: sau revision, quay lai Reviewer de re-score

### 3.8 Image Node (`image-node.ts`)
- Tao hinh anh AI
- Output: `generatedImage`
- Token cost: ~1,500

---

## 4. He thong Ho tro

### 4.1 Blackboard v2 (`blackboard-retriever.ts`)

Vector-based context retrieval thay the `buildStateContext()`:
- **Store:** Sau moi node, tu dong luu output vao `content_embeddings` voi embedding gte-small (384-dim)
- **Retrieve:** Semantic search qua RPC `match_blackboard_context`
- **Cross-session:** Tim context tu phien lam viec truoc cua cung brand
- **Hierarchical:** Xem toan bo output cua 1 session theo thu tu thoi gian

### 4.2 Checkpoint (`checkpoint.ts`)

Persistence cho anti-timeout pattern:
- `saveCheckpoint()` — luu GraphState sau moi node vao `workflow_checkpoints`
- `loadCheckpoint()` — tai checkpoint moi nhat cho session
- Serialization: Truncate generatedContent (10K), researchData (5K), nodeResults (chi metadata), messages (10 tin cuoi)

### 4.3 Distributed Tracing (`tracing.ts`)

W3C Trace Context compatible:
- Moi `runOrchestrator()` tao 1 Trace voi root span
- Moi node co child span voi duration tracking
- Export `getTraceHeaders()` cho external API calls

### 4.4 SSE Writer (`sse-writer.ts`)

Utility stream events ve client:
- Event types: `turn_start`, `tool_executing`, `tool_result`, `turn_complete`, `content_chunk`, `final_response`, `error`, `agent_step_result`
- Duoc extract tu legacy `agentic-loop.ts` (Sprint 5)

### 4.5 Token Manager (`token-manager.ts`)

Quan ly ngan sach token cho context window:
- `createTokenManager()` — khoi tao voi model config
- `summarizeConversationHistory()` — tom tat khi vuot 40% budget
- `TokenBudgetAllocator` — phan bo token cho cac segment context

### 4.6 AI Provider (`ai-provider.ts`)

Abstraction layer goi Lovable AI Gateway:
- `callAI()` — unified interface cho tat ca LLM calls tu nodes
- Ho tro tool calling, streaming, model selection

---

## 5. Pipeline Xu ly Request

```text
1. Rate Limiting + Quota Check
2. Fetch Context Song Song:
   - Brand template + personas + products + mappings
   - Industry Memory + Glossary
   - Learning Context (feedback history)
   - RAG (content + conversation)
   - User Preferences + Cross-Session Memory
   - Web Search Prefetch (neu phat hien trending intent)
3. Token Management:
   - Uoc tinh token conversation
   - Summarize history neu vuot 40% budget
4. Build System Prompt (system-prompt-builder.ts)
5. Prompt Guard: Sanitize user input (phat hien prompt injection)
6. Graph Engine Execution:
   a. Orchestrator → GraphPlan
   b. Compile → GraphDefinition
   c. Execute → Stream SSE events
7. Metrics + Usage Logging
```

---

## 6. Frontend Integration (`useChatStreaming.ts`)

### SSE Event Handling:
- `graph_plan` → Render progress steps voi labels
- `node_start` → Cap nhat step status = 'active'
- `node_complete` → Cap nhat step status = 'completed'
- `node_error` → Cap nhat step status = 'error'
- `content_chunk` → Append vao response text
- `context_metadata` → Hien thi badges (Industry Memory, RAG, etc.)

### Node Labels (8 nodes):

| Node | Label |
|---|---|
| research | Nghien cuu |
| brand_memory | Brand Memory |
| strategy | Chien luoc |
| content | Noi dung |
| reviewer | Kiem duyet |
| image | Hinh anh |
| governor | Kiem soat chat luong |
| compliance | Tuan thu quy dinh |

---

## 7. Legacy Code da Loai bo (Sprint 4-5)

| Component | Sprint | Ghi chu |
|---|---|---|
| `supervisor/` (6 files) | Sprint 4 | Toan bo thu muc da xoa |
| Supervisor block trong `index.ts` | Sprint 4 | ~140 dong |
| Agentic Loop block | Sprint 4 | ~130 dong |
| Single-Turn block | Sprint 4 | ~370 dong |
| `executeSupervisorLoop` import | Sprint 4 | |
| `executeAgenticLoop` import | Sprint 4 | |
| `CHAT_TOOLS`, `ToolCallResult` imports | Sprint 5 | Nodes tu import |
| `executeToolCall` import | Sprint 5 | |
| `tool-chain-executor` imports | Sprint 5 | |
| `enableTools` destructuring | Sprint 5 | |
| `ChatRequest` legacy flags (4 fields) | Sprint 5 | |
| `enableTools: true` frontend | Sprint 5 | |
| `createSSEWriter` tu agentic-loop.ts | Sprint 5 | Extract ra `sse-writer.ts` |

**Con lai co the xoa:** `agentic-loop.ts` (519 dong) — khong con ai import sau Sprint 5.

---

## 8. Bang Nang cap Ky thuat

### 8.1 Da Hoan thanh

| Phien ban | Tinh nang | Sprint | Trang thai |
|---|---|---|---|
| v2.0 | Graph Engine co ban (8 nodes, DAG executor) | Sprint 1 | Done |
| v2.0 | Orchestrator (fast-path + LLM planning) | Sprint 1 | Done |
| v2.0 | Blackboard v2 (vector-based context) | Sprint 1 | Done |
| v2.0 | Checkpoint/Continuation pattern | Sprint 1 | Done |
| v2.0 | Distributed Tracing (W3C compatible) | Sprint 1 | Done |
| v2.1 | Governor + Revision Controller loop | Sprint 2 | Done |
| v2.1 | Compliance Node (rule-based precheck) | Sprint 2 | Done |
| v2.1 | Redis cache cho Content Node | Sprint 2 | Done |
| v2.1 | Prompt Guard (injection detection) | Sprint 2 | Done |
| v2.2 | Frontend: BrandContextCard forwardRef fix | Sprint 3 | Done |
| v2.2 | Frontend: Unified Feedback UI (ContentFeedback only) | Sprint 3 | Done |
| v2.2 | Frontend: Type safety cleanup (as any removal) | Sprint 3 | Done |
| v2.2 | Xoa Legacy Supervisor (6 files + 140 dong) | Sprint 4 | Done |
| v2.2 | Xoa Legacy Single-Turn + Agentic Loop (~500 dong) | Sprint 4 | Done |
| v2.2 | Governor + Compliance node labels UI | Sprint 4 | Done |
| v2.2 | Output token metrics fix | Sprint 4 | Done |
| v2.2 | Conversation History injection vao Graph Engine | Sprint 4 | Done |
| v2.2 | Dead imports cleanup (7 imports) | Sprint 5 | Done |
| v2.2 | ChatRequest type hygiene (4 legacy flags) | Sprint 5 | Done |
| v2.2 | SSE Writer extraction | Sprint 5 | Done |
| v2.2 | Frontend enableTools removal | Sprint 5 | Done |

### 8.2 Lo trinh Phat trien (Roadmap)

| Uu tien | Tinh nang | Mo ta | Do phuc tap |
|---|---|---|---|
| P0 | Xoa `agentic-loop.ts` | 519 dong legacy, khong con import | Thap |
| P0 | Xoa `tool-chain-executor.ts` | Dead code tu Sprint 5 | Thap |
| P1 | Blackboard v2 production tuning | Index optimization, TTL policy, embedding batch | Trung binh |
| P1 | Checkpoint resume API | Edge Function endpoint de resume tu checkpoint | Trung binh |
| P1 | Governor human-in-the-loop UI | Frontend render `interruptPayload` cho approval flow | Cao |
| P2 | Multi-model routing | Orchestrator chon model toi uu cho tung node | Cao |
| P2 | Streaming per-node | Stream output tu tung node thay vi chi final content | Trung binh |
| P2 | Graph visualization | Frontend render DAG execution realtime | Cao |
| P3 | A/B testing pipeline | So sanh output giua cac plan/model variants | Cao |
| P3 | Custom node plugins | Cho phep user dinh nghia node tu tao | Rat cao |

---

## 9. Cau truc Thu muc Backend

```text
supabase/functions/
  chat-topics/
    index.ts                 # Entry point (858 dong)
  _shared/
    graph/
      graph-engine.ts        # DAG engine (719 dong)
      graph-state.ts         # State schema (265 dong)
      orchestrator.ts        # Intent → Plan (388 dong)
      checkpoint.ts          # Persistence (152 dong)
      blackboard-retriever.ts # Vector context (330 dong)
      nodes/
        index.ts             # Registry factory
        research-node.ts
        brand-memory-node.ts
        compliance-node.ts
        strategy-node.ts
        content-node.ts
        reviewer-node.ts
        governor-node.ts
        image-node.ts
        revision-controller.ts
    types/
      chat-types.ts          # Shared type definitions
    sse-writer.ts            # SSE streaming utility
    tracing.ts               # Distributed tracing
    ai-provider.ts           # LLM gateway abstraction
    token-manager.ts         # Token budget management
    system-prompt-builder.ts # System prompt assembly
    prompt-guard.ts          # Injection detection
    error-utils.ts           # Retry, fallback, timeout
    logger.ts                # Structured logging + metrics
    rate-limiter.ts          # Rate limiting + quota
    cost-estimator.ts        # LLM cost estimation
    cache/
      redis-cache.ts         # Upstash Redis caching
```

---

## 10. Chi so Hieu suat

| Metric | Gia tri |
|---|---|
| Max execution time | 55s (Edge Function safety margin) |
| Token budget default | 16,384 |
| Conversation history cap | 40% budget |
| Heartbeat interval | 15s |
| Content cache TTL | 1 hour |
| Checkpoint serialization | 10K content, 5K research, 10 messages |
| Max revision rounds | 2 |
| Governor quality threshold | Score >= 90, Confidence >= 0.85 |
| Budget exhaustion threshold | > 80% used |
| Orchestrator LLM confidence threshold | 0.7 |
| Embedding model | gte-small (384-dim) |
| Primary LLM | google/gemini-2.5-flash |
