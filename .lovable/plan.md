

# Agentic Operating System — Migration Progress

## Phase 1: Graph Engine Core ✅ DONE
- `graph-engine.ts`: DAG executor with parallel fan-out/fan-in, conditional edges, dynamic compilation
- `graph-state.ts`: Typed GraphState replacing Blackboard
- `checkpoint.ts`: Persistence layer with workflow_checkpoints table
- DB migration: workflow_checkpoints table with RLS + cleanup function

## Phase 2: Orchestrator Node ✅ DONE
- `orchestrator.ts`: Central brain with 2-tier logic:
  - Fast-path heuristic: reuses intent patterns → TEMPLATE_PLANS (0 LLM cost)
  - LLM planning: Gemini 2.5 Flash with tool calling → structured GraphPlan
- `graph-engine.ts`: Added `runOrchestrator()` — high-level entry point (orchestrate → compile → execute)
- `graph-state.ts`: Added `orchestratorReasoning` field for tracking
- Backward compatible: intent-classifier.ts and state-machine.ts untouched

## Phase 3: Agent Nodes (TODO)
- Convert 6 agents from mini ReAct loop → tool-only node functions
- Create `supabase/functions/_shared/graph/nodes/` directory
- Each node: simple async function returning Partial<GraphState>

## Phase 4: Checkpoint & Persistence (TODO)
- Integrate checkpoint.ts into graph execution flow
- Frontend resume logic with checkpoint_id

## Phase 5: Parallel Execution & Human-in-the-Loop (TODO)
- InterruptPayload handling in graph executor
- SSE event `human_input_required`
- Frontend interrupt UI

## Phase 6: Streaming & UI (TODO)
- New SSE event types: graph_plan, node_start, node_complete
- AgentPipelineBar graph topology visualization

## Phase 7: A/B Test & Cutover (TODO)
- Feature flag `useGraphEngine`
- Dual-path routing in supervisor-loop.ts
