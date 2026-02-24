

# Nang cap Hierarchical Supervisor Architecture cho Flowa

## Tong quan

Nang cap he thong agentic hien tai tu "Single Agent + ReAct Loop" len "Hierarchical Supervisor" voi 4 specialized agents, shared blackboard, error resilience giua cac agent, va self-learning loop.

## Hien trang (What We Have)

```text
chat-topics (Entry Point)
      |
      v
agentic-loop.ts (ReAct: Reason -> Act -> Observe -> Repeat)
      |
      +-- tool-executor.ts (11 tools: web_search, save_topic, generate_*, plan_*)
      +-- parallel-tool-executor.ts (Parallel independent tools)
      +-- tool-chain-executor.ts (Sequential chains with context injection)
      +-- error-utils.ts (Retry + Circuit Breaker + Fallback)
      +-- session-memory.ts (Cross-session learnings)
      +-- learning-context.ts (Topic performance history)
      +-- smart-context.ts (RAG + Brand + Learning)
      +-- ai-config.ts (Runtime model switching per function)
      +-- token-manager.ts (Context window management)
```

## Kien truc moi

```text
                    chat-topics (Entry Point)
                          |
                          v
              ┌─── Supervisor Agent ───┐
              │  (State Machine +      │
              │   Intent Classifier +  │
              │   Token Budget Ctrl)   │
              └────────┬───────────────┘
                       │
         ┌─────────────┼──────────────┬──────────────┐
         v             v              v              v
   Research Agent  Strategy Agent  Content Agent  Reviewer Agent
   (web_search,   (plan_*,        (generate_*,   (compliance,
    search_topics, gap_analysis)   save_topic)    quality_gate)
    trend_scan)
         │             │              │              │
         └─────────────┴──────┬───────┴──────────────┘
                              v
                    Shared Blackboard (DB Table)
                    + Brand Memory Store (Vectors)
```

## Implementation - 5 Phases

---

### Phase 1: Supervisor Agent + State Machine (Core)

**Files to create:**
- `supabase/functions/_shared/supervisor/state-machine.ts`
- `supabase/functions/_shared/supervisor/intent-classifier.ts`
- `supabase/functions/_shared/supervisor/agent-registry.ts`
- `supabase/functions/_shared/supervisor/supervisor-loop.ts`

**Files to modify:**
- `supabase/functions/chat-topics/index.ts` -- replace direct `executeAgenticLoop` with `supervisorLoop`

**State Machine** quản lý workflow trang thai dai han:

```text
States: idle -> classifying -> researching -> planning -> generating -> reviewing -> completed / failed
Transitions:
  idle + user_message -> classifying
  classifying + simple_query -> generating (skip research)
  classifying + complex_query -> researching
  researching + data_ready -> planning
  planning + plan_ready -> generating
  generating + content_ready -> reviewing
  reviewing + approved -> completed
  reviewing + needs_revision -> generating (loop back)
  any + error -> error_recovery -> retry or graceful_fail
```

**Intent Classifier** (dung gemini-2.5-flash-lite, nhanh + re):
- Phan loai user message thanh: `research`, `plan`, `generate`, `chat`, `complex_workflow`
- Voi `complex_workflow` (VD: "Tao noi dung 30 ngay"), Supervisor se dieu phoi qua nhieu agent theo state machine

**Agent Registry**: Khai bao cac agent voi metadata:
- `name`, `description`, `tools` (subset of CHAT_TOOLS), `model`, `system_prompt_key`
- Cho phep runtime registration va dynamic model assignment

---

### Phase 2: Specialized Agents

**Files to create:**
- `supabase/functions/_shared/agents/research-agent.ts`
- `supabase/functions/_shared/agents/strategy-agent.ts`
- `supabase/functions/_shared/agents/content-agent.ts`
- `supabase/functions/_shared/agents/reviewer-agent.ts`
- `supabase/functions/_shared/agents/agent-base.ts` (abstract base class)

Moi agent la mot "mini agentic loop" voi:
- Focused system prompt (nho hon, chinh xac hon)
- Subset cua tools (chi nhung tools can thiet)
- Model rieng (VD: Research dung flash, Content dung pro)
- Max turns rieng (Research: 2 turns, Content: 1 turn)

**Agent Base Class** cung cap:
- `execute(task, blackboard)` -> `AgentResult`
- Auto-read/write vao Blackboard
- Error reporting chuan hoa
- Token budget awareness

**Tool Assignment:**

| Agent | Tools | Default Model |
|-------|-------|--------------|
| Research | web_search, search_topics | gemini-2.5-flash |
| Strategy | start_planning_session, generate_plan_draft, refine_plan, finalize_plan, get_active_session | gemini-2.5-flash |
| Content | generate_script, generate_carousel, generate_multichannel, save_topic | gemini-2.5-pro |
| Reviewer | (new) check_compliance, quality_score | gemini-2.5-flash-lite |

---

### Phase 3: Shared Blackboard + Brand Memory

**Database migration:**

```sql
-- Shared Blackboard for inter-agent communication
CREATE TABLE agent_blackboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  data_key TEXT NOT NULL,
  data_value JSONB NOT NULL,
  ttl_seconds INT DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + (ttl_seconds || ' seconds')::INTERVAL) STORED
);

CREATE INDEX idx_blackboard_session ON agent_blackboard(session_id, data_key);

-- Brand Memory Store (long-term vector memory per brand)
CREATE TABLE brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  memory_type TEXT NOT NULL, -- 'style_preference', 'audience_insight', 'performance_pattern', 'correction'
  content TEXT NOT NULL,
  embedding vector(384),
  confidence FLOAT DEFAULT 0.5,
  source TEXT, -- 'user_feedback', 'performance_analysis', 'chat_correction'
  used_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_memory_brand ON brand_memory(brand_template_id, memory_type);
CREATE INDEX idx_brand_memory_embedding ON brand_memory USING ivfflat (embedding vector_cosine_ops);
```

**Files to create:**
- `supabase/functions/_shared/supervisor/blackboard.ts` -- read/write/subscribe blackboard
- `supabase/functions/_shared/supervisor/brand-memory.ts` -- vector search brand memory, auto-save learnings

**Blackboard Protocol:**
- Research Agent ghi: `{ key: "trending_data", value: {...} }`
- Strategy Agent doc trending_data, ghi: `{ key: "content_plan", value: {...} }`
- Content Agent doc content_plan, ghi: `{ key: "generated_content", value: {...} }`
- Reviewer Agent doc generated_content, ghi: `{ key: "review_result", value: {...} }`

---

### Phase 4: Error Handling + Retry giua cac Agent

**Files to modify:**
- `supabase/functions/_shared/supervisor/supervisor-loop.ts` -- them agent-level retry

**Strategy:**
1. **Agent-level retry**: Moi agent co `maxRetries: 2`, dung `withRetry` tu error-utils.ts
2. **Graceful degradation**: Neu Research Agent loi -> Supervisor skip, dung cached data hoac tiep tuc khong co research
3. **Partial success**: Neu 1 trong 3 channels loi -> tra ve 2 channels thanh cong + error message cho channel loi
4. **Circuit breaker per agent**: Dung `createCircuitBreaker` da co san cho moi agent
5. **Timeout per agent**: Research 15s, Strategy 10s, Content 30s, Reviewer 10s

```text
Supervisor Error Flow:
  Agent fails ->
    retry (max 2) ->
      still fails ->
        check circuit breaker ->
          if open: skip agent, use fallback
          if closed: mark failure, continue with partial result
        ->
          log to agent_execution_logs
          notify supervisor of degraded result
```

---

### Phase 5: Learning / Self-Improvement Agent

**Nang cap tu he thong hien tai** (session-memory.ts + learning-context.ts + content_learnings table):

**Files to create:**
- `supabase/functions/_shared/agents/learning-agent.ts`

**Files to modify:**
- `supabase/functions/_shared/supervisor/supervisor-loop.ts` -- goi learning agent sau moi workflow

**Learning Agent** chay **async (background)** sau moi workflow hoan tat:
1. **Thu thap**: Doc blackboard session data + user feedback + content edits
2. **Phan tich**: So sanh AI output vs user edit -> rut ra patterns (dung gemini-2.5-flash-lite)
3. **Luu**: Ghi vao `brand_memory` table voi embedding de search semantic
4. **Ap dung**: Lan sau, Supervisor tu dong inject relevant brand memories vao system prompt cua Content Agent

**Tu dong hoc tu:**
- User edit content -> `content_learnings` -> Learning Agent tong hop -> `brand_memory`
- User feedback (like/dislike) -> Learning Agent phan tich pattern -> `brand_memory`
- Performance data (engagement metrics) -> Learning Agent phan tich -> update confidence scores

---

## Token Budget Controller

**Tich hop vao Supervisor:**

```text
Total Budget: 16384 tokens (configurable)
  Supervisor overhead: 500 tokens
  Research Agent: 2000 tokens max
  Strategy Agent: 2000 tokens max
  Content Agent: 8000 tokens max (lion share)
  Reviewer Agent: 1500 tokens max
  Buffer: ~2000 tokens
```

- Supervisor theo doi token usage cua tung agent
- Neu agent dung qua nhieu -> Supervisor cat bot context cho agent sau
- Dung `dynamic-tokens.ts` da co san de tinh toan

---

## Dynamic Model Routing

**Nang cap `ai-config.ts`:**

Them logic chon model dua tren:
- Task complexity (simple chat -> flash-lite, content generation -> pro)
- Token budget remaining
- Agent type (da define trong Agent Registry)
- Time of day / load (future)

---

## Tac dong

| Metric | Truoc | Sau |
|--------|-------|-----|
| System prompt size | 1 prompt khong lo | 4 prompt nho, focused |
| Error isolation | 1 loi = tat ca loi | 1 agent loi, cac agent khac van chay |
| Brand memory | Session-only | Long-term vector memory |
| Model cost | 1 model cho moi viec | Model phu hop tung task |
| Complex workflows | Max 5 turns, 1 agent | State machine, multi-agent coordination |

## Thu tu trien khai

1. Phase 1 (Supervisor + State Machine) -- foundation
2. Phase 3 (Blackboard + Brand Memory) -- data layer
3. Phase 2 (Specialized Agents) -- agent implementation
4. Phase 4 (Error Handling) -- resilience
5. Phase 5 (Learning Agent) -- self-improvement

