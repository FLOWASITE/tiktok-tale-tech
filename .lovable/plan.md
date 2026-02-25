

# Phase 2: Orchestrator Node

Thay the Intent Classifier + State Machine bang mot **Orchestrator Node** thong minh, su dung LLM manh de tao dynamic graph plan.

## Tong quan

Orchestrator Node la "nao trung tam" cua Graph Engine. No nhan user message + current state, roi quyet dinh toan bo workflow (nodes nao chay, thu tu, parallel hay sequential) trong **mot lan goi LLM duy nhat**.

## Thiet ke

### 1. Orchestrator Node (`supabase/functions/_shared/graph/orchestrator.ts`)

**Input**: GraphState (chua userMessage, brandMemoryContext, metadata)
**Output**: GraphPlan (steps, skipNodes, reasoning)

Logic 2 tang:
- **Fast-path (heuristic)**: Dung lai intent-classifier patterns hien tai de map truc tiep sang TEMPLATE_PLANS. Khong can goi LLM. Ap dung cho: chat, image_generate, research_only, generate co topic ro rang.
- **LLM planning**: Cho cac intent phuc tap (complex_workflow, multi_step, ambiguous). Goi Gemini 2.5 Flash voi tool calling de tra ve structured GraphPlan.

```text
orchestrateWorkflow(state: GraphState, options)
  |
  +-- tryFastPath(userMessage)
  |     |-- match INTENT_PATTERNS (reuse tu intent-classifier)
  |     |-- return TEMPLATE_PLANS[matched] neu confidence >= 0.7
  |
  +-- (fallback) callLLM with tool "create_graph_plan"
        |-- System prompt mo ta available nodes + capabilities
        |-- Tool schema: { steps[], skipNodes[], reasoning }
        |-- Return parsed GraphPlan
```

Tool calling schema cho LLM:
```text
function: create_graph_plan
parameters:
  steps: array of { node: string, parallelWith?: string[], dependsOn?: string[] }
  skipNodes: string[]
  reasoning: string
```

Available nodes mo ta cho LLM:
- `research`: Web search, topic discovery, competitor analysis
- `brand_memory`: Load brand context (luon parallel voi research)
- `strategy`: Content planning, channel strategy
- `content`: Generate content (posts, scripts, carousels)
- `reviewer`: Quality check, compliance, brand voice
- `image`: AI image generation

### 2. Orchestrator Integration vao Graph Engine

Tao helper function `runOrchestrator()` de:
1. Tao GraphState tu user message
2. Goi orchestrator de lay GraphPlan
3. Compile plan thanh GraphDefinition (dung `compileGraphFromPlan`)
4. Execute graph

### 3. Giu tuong thich nguoc

- **Khong xoa** `intent-classifier.ts` - orchestrator reuse heuristic patterns cua no
- **Khong xoa** `state-machine.ts` - supervisor-loop van dung khi feature flag tat
- Orchestrator chi la **mot option moi** ben canh supervisor loop hien tai

## Files thay doi

| File | Thay doi |
|------|----------|
| `supabase/functions/_shared/graph/orchestrator.ts` | **MOI** - Orchestrator node: fast-path heuristic + LLM planning |
| `supabase/functions/_shared/graph/graph-engine.ts` | Them helper `runOrchestrator()` de ket noi orchestrator -> graph execution |
| `supabase/functions/_shared/graph/graph-state.ts` | Them field `orchestratorReasoning?: string` de luu ly do chon plan |
| `.lovable/plan.md` | Cap nhat Phase 2 = DONE |

## Chi tiet ky thuat

### orchestrator.ts

```text
// Exports:
export async function orchestrateWorkflow(
  state: GraphState,
  options: OrchestratorOptions
): Promise<GraphPlan>

export interface OrchestratorOptions {
  organizationId?: string;
  availableNodes?: string[];  // Override default node list
  forceTemplate?: string;     // Force a specific template plan
}

// Internal:
function tryFastPath(message: string): GraphPlan | null
  - Reuse INTENT_PATTERNS + hasExplicitTopic() logic tu intent-classifier
  - Map intent -> TEMPLATE_PLANS key
  - Return null neu khong confident

async function planWithLLM(state: GraphState, options): Promise<GraphPlan>
  - callAI with tool calling (create_graph_plan)
  - Model: google/gemini-2.5-flash (balance cost/quality)
  - Temperature: 0.1 (deterministic)
  - Parse tool_call result -> GraphPlan
  - Fallback: neu LLM fail, return TEMPLATE_PLANS.full_pipeline
```

### graph-engine.ts additions

```text
export async function runOrchestrator(
  userMessage: string,
  nodeRegistry: Map<string, NodeConfig>,
  options: {
    organizationId?: string;
    onEvent?: (event) => void;
    onCheckpoint?: (state, node) => Promise<void>;
    supabase?: any;
    brandMemoryContext?: string;
  }
): Promise<GraphExecutionResult>
```

This function:
1. Creates initial GraphState
2. Calls `orchestrateWorkflow()` to get the plan
3. Emits `graph_plan` SSE event
4. Calls `compileGraphFromPlan()` to build the graph
5. Calls `executeGraph()` to run it
6. Returns the result

### graph-state.ts additions

Them `orchestratorReasoning` field vao GraphState interface de tracking.

## Rui ro

| Rui ro | Giai phap |
|--------|-----------|
| LLM tra ve plan khong hop le | Validate steps against nodeRegistry, fallback to full_pipeline |
| Fast-path bo sot intent phuc tap | Fast-path chi apply khi confidence >= 0.7, con lai deu qua LLM |
| Cost tang do them 1 LLM call | Chi goi LLM cho complex intent; simple intent dung heuristic (0 cost) |

