
# Nang cap len Agentic Operating System (LangGraph.js trên Deno)

## Danh gia hien trang

Hệ thống hiện tại gồm:
- **State Machine** (`state-machine.ts`): 13 trạng thái, 20+ transitions cứng
- **Supervisor Loop** (`supervisor-loop.ts`, 903 dòng): Điều phối tuần tự/multi-step, token budget, graceful degradation
- **Agent Base** (`agent-base.ts`): Mini ReAct loop (maxTurns 1-3) cho mỗi agent
- **Blackboard** (`blackboard.ts`): In-memory + DB, versioning, pruning
- **Intent Classifier** (`intent-classifier.ts`): Heuristic + LLM fallback
- **Agentic Loop** (`agentic-loop.ts`, 519 dòng): ReAct pattern với parallel tool execution
- **AI Provider** (`ai-provider.ts`, 1221 dòng): Multi-provider routing, circuit breaker
- **16+ tools** trong `tool-definitions.ts` + `tool-executor.ts`
- **6 agents**: Research, Strategy, Content, Reviewer, Brand Memory, Image

## Van de cot loi can giai quyet

1. **State machine cứng** - Không thể tạo workflow động tại runtime
2. **Agent loop nội bộ trùng lặp** - Cả `agentic-loop.ts` và `agent-base.ts` đều có ReAct loop riêng
3. **Không có checkpoint** - Workflow dài bị mất nếu Edge Function timeout
4. **Không có parallel execution giữa agents** - Chỉ có parallel tools trong 1 agent
5. **Không có human-in-the-loop** - User không thể can thiệp giữa chừng workflow

## Phuong an: Incremental Migration (KHÔNG dùng LangGraph.js)

> **Lý do không dùng LangGraph.js**: LangGraph.js yêu cầu Node.js runtime với `@langchain/core`, `@langchain/langgraph` - các package này KHÔNG tương thích với Deno Deploy (Edge Functions). Việc import toàn bộ LangChain ecosystem vào Edge Function sẽ gây cold-start chậm (>5s) và vượt size limit. Thay vào đó, chúng ta sẽ xây dựng một **mini graph engine** nhẹ, tối ưu cho Deno.

### Phase 1: Graph Engine Core (Tuần 1-2)

Xây dựng `graph-engine.ts` thay thế `state-machine.ts`:

```text
GraphDefinition {
  nodes: Map<string, NodeConfig>    // agent nodes + conditional nodes
  edges: Edge[]                      // static edges
  conditionalEdges: ConditionalEdge[] // dynamic routing
  entryPoint: string
  endPoints: string[]
}

GraphState (thay Blackboard) {
  messages: Message[]
  user_intent: string
  research_data: any
  content_plan: any
  generated_content: any
  review_result: any
  checkpoint_id: string
  metadata: Record<string, any>
}
```

Tính năng:
- **Dynamic graph compilation**: Orchestrator LLM trả về JSON graph plan, engine compile và chạy
- **Conditional edges**: Route dựa trên state (thay vì transition table cứng)
- **Parallel fan-out/fan-in**: Research + Brand Memory chạy đồng thời

### Phase 2: Orchestrator Node (Tuần 2-3)

Thay thế Intent Classifier + State Machine bằng một **Orchestrator Node** dùng model mạnh (Gemini 2.5 Pro):

```text
Input: user message + current GraphState
Output: {
  graph_plan: [
    { node: "research", parallel_with: ["brand_memory"] },
    { node: "strategy", depends_on: ["research"] },
    { node: "content", depends_on: ["strategy"] },
  ],
  skip_nodes: ["reviewer"],  // nếu không cần
  reasoning: "..."
}
```

- Orchestrator quyết định TOÀN BỘ workflow một lần (không cần state machine)
- Hỗ trợ re-plan nếu agent thất bại
- Giữ lại heuristic fast-path cho các intent đơn giản (chat, image)

### Phase 3: Agent Nodes đơn giản hóa (Tuần 3-4)

Chuyển 6 agents từ "mini ReAct loop" sang "tool-only nodes":

```text
// Trước (agent-base.ts): 
for (turn = 0; turn < maxTurns; turn++) {
  callAI → parse tool_calls → execute → feed back → repeat
}

// Sau (node function):
async function researchNode(state: GraphState): Partial<GraphState> {
  const result = await callAI({
    system: RESEARCH_PROMPT,
    tools: [web_search, discover_topics],
    input: state.messages,
    toolChoice: "required"  // Force tool use
  });
  // Execute tools, return state update
  return { research_data: result };
}
```

- Loại bỏ `agentic-loop.ts` cho agent nodes (chỉ giữ cho standalone chat)
- Orchestrator điều khiển retry/re-route thay vì agent tự loop
- Giảm 50% code trong agent layer

### Phase 4: Checkpoint & Persistence (Tuần 4-5)

Thêm bảng `workflow_checkpoints` trong database:

```text
workflow_checkpoints:
  id: uuid
  session_id: text
  node_name: text
  graph_state: jsonb (serialized GraphState)
  created_at: timestamp
  status: 'active' | 'completed' | 'failed'
```

- Checkpoint sau mỗi node hoàn thành
- Resume từ checkpoint nếu Edge Function timeout (>60s)
- Frontend gọi lại API với `checkpoint_id` để tiếp tục

### Phase 5: Parallel Execution & Human-in-the-Loop (Tuần 5-6)

**Parallel agents**:
```text
Fan-out: [research, brand_memory, compliance_precheck] → chạy Promise.all
Fan-in: Merge results vào GraphState → tiếp tục strategy node
```

**Human-in-the-loop**:
```text
Graph: research → INTERRUPT("Chọn topic") → user responds → content
```
- Khi gặp INTERRUPT node, emit SSE event `human_input_required`
- Frontend hiển thị form/choice
- User response được gửi lại, graph resume từ checkpoint

### Phase 6: Streaming & UI (Tuần 6-7)

- Giữ nguyên SSE protocol hiện tại
- Thêm event type: `graph_plan`, `node_start`, `node_complete`, `human_input_required`
- AgentPipelineBar cập nhật để hiển thị graph topology (parallel nodes hiển thị cạnh nhau)
- Thêm "Graph Debug View" (optional) cho admin

### Phase 7: A/B Test & Cutover (Tuần 7-8)

- Feature flag `useGraphEngine: boolean` trong `ai_function_config`
- Chạy song song: flag=false → supervisor-loop.ts cũ, flag=true → graph-engine mới
- So sánh: latency, token cost, content quality score, error rate
- Cutover khi graph engine ổn định (>95% success rate)

## Files can thay doi

| File | Thay doi |
|------|----------|
| `supabase/functions/_shared/graph/graph-engine.ts` | **MỚI** - Core graph engine |
| `supabase/functions/_shared/graph/graph-state.ts` | **MỚI** - Typed GraphState schema |
| `supabase/functions/_shared/graph/orchestrator.ts` | **MỚI** - Orchestrator node (thay intent-classifier + state-machine) |
| `supabase/functions/_shared/graph/nodes/` | **MỚI** - 6 node functions (research, strategy, content, reviewer, brand-memory, image) |
| `supabase/functions/_shared/graph/checkpoint.ts` | **MỚI** - Checkpoint persistence |
| `supabase/functions/_shared/supervisor/supervisor-loop.ts` | Thêm feature flag để route sang graph engine |
| `supabase/functions/chat-topics/index.ts` | Thêm checkpoint resume logic |
| Database migration | Bảng `workflow_checkpoints` |

## Rui ro & Giai phap

| Rủi ro | Giải pháp |
|--------|-----------|
| Orchestrator LLM tốn chi phí (Gemini Pro) | Chỉ gọi 1 lần/workflow; giữ heuristic fast-path cho intent đơn giản |
| Edge Function timeout khi chạy parallel agents | Checkpoint + resume pattern; heartbeat SSE |
| Graph engine phức tạp hơn state machine | Viết unit tests cho mọi graph topology; giữ state machine cũ làm fallback |
| Breaking changes cho frontend | Giữ nguyên SSE event types hiện tại, chỉ thêm mới |

## Ket qua mong doi

- **Workflow linh hoạt**: Orchestrator tự tạo graph tối ưu cho mỗi request
- **Parallel execution**: Research + Brand Memory chạy đồng thời → giảm 30-40% latency
- **Resumable**: Workflow dài không bị mất khi timeout
- **Human-in-the-loop**: User chọn topic trước khi tạo content
- **Đơn giản hóa code**: Agents chỉ còn là hàm async, không có loop nội bộ
- **Backward compatible**: Feature flag cho phép rollback bất cứ lúc nào
