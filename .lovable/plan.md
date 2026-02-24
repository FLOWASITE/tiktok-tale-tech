

# Nang cap Hierarchical Supervisor Architecture cho Flowa

## Status: ✅ COMPLETED

## Tong quan

Nang cap he thong agentic hien tai tu "Single Agent + ReAct Loop" len "Hierarchical Supervisor" voi 4 specialized agents, shared blackboard, error resilience giua cac agent, va self-learning loop.

## Implementation Status

### ✅ Phase 1: Supervisor Agent + State Machine (Core)
- `supabase/functions/_shared/supervisor/state-machine.ts` - State machine with transitions
- `supabase/functions/_shared/supervisor/intent-classifier.ts` - Hybrid heuristic + LLM classifier
- `supabase/functions/_shared/supervisor/agent-registry.ts` - Agent configs + tool assignment
- `supabase/functions/_shared/supervisor/supervisor-loop.ts` - Main orchestrator with Token Budget Controller + Graceful Degradation
- `supabase/functions/chat-topics/index.ts` - Integrated `enableSupervisor` mode

### ✅ Phase 2: Specialized Agents
- `supabase/functions/_shared/agents/agent-base.ts` - Base class with circuit breaker + retry
- `supabase/functions/_shared/agents/research-agent.ts` - Web search + topic discovery
- `supabase/functions/_shared/agents/strategy-agent.ts` - Planning + gap analysis
- `supabase/functions/_shared/agents/content-agent.ts` - Content generation
- `supabase/functions/_shared/agents/reviewer-agent.ts` - Compliance + quality gate

### ✅ Phase 3: Shared Blackboard + Brand Memory
- DB Migration: `agent_blackboard`, `brand_memory`, `agent_execution_logs` tables
- `supabase/functions/_shared/supervisor/blackboard.ts` - In-memory + DB persistence
- `supabase/functions/_shared/supervisor/brand-memory.ts` - Vector search + save with gte-small embeddings
- `search_brand_memory` RPC function for vector similarity

### ✅ Phase 4: Error Handling + Retry
- Agent-level retry with `withRetry` (maxRetries per agent config)
- Circuit breaker per agent via `createCircuitBreaker`
- Graceful degradation: non-critical agents (research, strategy, reviewer) can fail without blocking workflow
- Token budget controller prevents overspending
- Timeout per agent (Research 15s, Strategy 10s, Content 30s, Reviewer 10s)

### ✅ Phase 5: Learning / Self-Improvement Agent
- `supabase/functions/_shared/agents/learning-agent.ts` - Async fire-and-forget
- Analyzes user edits + feedback → extracts style preferences → saves to `brand_memory`
- LLM-powered pattern extraction with gemini-2.5-flash-lite

### ✅ Token Budget Controller
- Integrated into supervisor-loop.ts
- Tracks per-agent token usage
- Skips non-critical agents when budget exhausted
- Reports usage in SSE events and final result

### ✅ Frontend Integration
- `src/hooks/useChatStreaming.ts` sends `enableSupervisor: true`
- SSE events from supervisor are compatible with existing chat UI parsing
- `src/components/topic/chatbot/types.ts` - ChatRequest updated with `enableSupervisor` flag

## Architecture

```text
                    chat-topics (Entry Point)
                          |
                    enableSupervisor?
                    /              \
                  YES               NO
                   |                 |
        Supervisor Loop      Agentic Loop (legacy)
              |
    Intent Classifier
              |
    State Machine Dispatch
              |
   ┌──────┬──────┬──────┐
   v      v      v      v
Research Strategy Content Reviewer
 Agent    Agent   Agent   Agent
   |      |      |      |
   └──────┴──┬───┴──────┘
             v
   Shared Blackboard (DB)
   + Brand Memory (Vectors)
             |
   Learning Agent (async)
```
