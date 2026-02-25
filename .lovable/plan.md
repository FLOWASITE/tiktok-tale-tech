

# Phase 3: Agent Nodes - Chuyen 6 agents thanh tool-only node functions

## Tong quan

Tao 6 node functions trong `supabase/functions/_shared/graph/nodes/` tuong ung voi 6 agents hien tai. Moi node la mot async function nhan `GraphState` va tra ve `Partial<GraphState>`, thay the mini ReAct loop bang mot lan goi LLM duy nhat voi `toolChoice: "required"` (khi can tool) hoac `toolChoice: "auto"`.

Orchestrator se dieu khien retry/re-route thay vi agent tu loop.

## Thiet ke

Moi node function:
1. Doc context tu `GraphState` (thay vi Blackboard)
2. Goi `callAI()` voi system prompt + tools + `toolChoice`
3. Parse tool_calls, goi `executeToolCall()` cho moi tool
4. Feed tool results lai cho LLM de lay final response
5. Tra ve `Partial<GraphState>` voi du lieu output

Quan trong: Giu lai `agent-base.ts` va cac agent prompts cu (`research-agent.ts`, `content-agent.ts`, ...) de supervisor-loop cu van hoat dong khi feature flag tat. Cac node moi **reuse system prompts** tu cac agent cu.

## Files thay doi

| File | Thay doi |
|------|----------|
| `supabase/functions/_shared/graph/nodes/research-node.ts` | **MOI** - Research node: web search + topic discovery |
| `supabase/functions/_shared/graph/nodes/strategy-node.ts` | **MOI** - Strategy node: content planning |
| `supabase/functions/_shared/graph/nodes/content-node.ts` | **MOI** - Content node: generate multichannel/script/carousel |
| `supabase/functions/_shared/graph/nodes/reviewer-node.ts` | **MOI** - Reviewer node: compliance + quality check |
| `supabase/functions/_shared/graph/nodes/brand-memory-node.ts` | **MOI** - Brand memory node: load brand context |
| `supabase/functions/_shared/graph/nodes/image-node.ts` | **MOI** - Image generation node |
| `supabase/functions/_shared/graph/nodes/index.ts` | **MOI** - Re-exports + `createNodeRegistry()` factory |
| `supabase/functions/_shared/graph/graph-engine.ts` | Them import va re-export `createNodeRegistry` |
| `.lovable/plan.md` | Cap nhat Phase 3 = DONE |

## Chi tiet ky thuat

### Cau truc chung cua moi node

```text
export async function xxxNode(state: GraphState): Promise<Partial<GraphState>> {
  // 1. Build system prompt (reuse tu agent prompts cu)
  // 2. Build context tu state (dung buildStateContext)
  // 3. Goi callAI voi tools + toolChoice
  // 4. Parse tool_calls, execute tools
  // 5. Feed results lai cho LLM neu can (max 1 round-trip)
  // 6. Return partial state update
}
```

### Node-specific logic

**research-node**: Reuse `buildResearchSystemPrompt()`. Tools: `web_search`, `search_topics`, `discover_topics`. Force tool use. Output: `researchData`, `bestTopic`, `suggestedTopics`. Giu safety net: neu khong co `discover_topics` result, auto fallback.

**strategy-node**: Reuse `buildStrategySystemPrompt()`. Tools: `start_planning_session`, `generate_plan_draft`, `refine_plan`, `finalize_plan`. Output: `contentPlan`.

**content-node**: Reuse `buildContentSystemPrompt()`. Tools: `generate_script`, `generate_carousel`, `generate_multichannel`, `save_topic`. Force tool use. Output: `generatedContent`. Critical node (failure stops graph).

**reviewer-node**: Reuse `buildReviewerSystemPrompt()`. Tools: `brand_voice_check`, `legal_compliance_check`, `platform_best_practices`. Output: `reviewResult`.

**brand-memory-node**: Lightweight node, goi truc tiep `searchBrandMemory()` (khong can LLM). Output: `brandMemoryContext`. Luon chay parallel voi research.

**image-node**: Reuse image prompt logic. Tools: `generate_image`, `edit_image`. Output: `generatedImage`.

### createNodeRegistry() factory

```text
function createNodeRegistry(context: NodeExecutionContext): Map<string, NodeConfig>
```

Nhan execution context (supabase, userId, orgId, brandTemplateId, etc.) va tra ve Map cua 6 NodeConfig san sang cho graph engine. Moi node function duoc bind voi context thong qua closure.

### Shared NodeExecutionContext

```text
interface NodeExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  userAccessToken?: string;
  complianceRules?: string[];
}
```

## Khong thay doi

- `agent-base.ts` - Giu nguyen cho supervisor-loop cu
- `research-agent.ts`, `content-agent.ts`, etc. - Giu nguyen, chi reuse system prompt builders
- `tool-executor.ts` - Giu nguyen, nodes goi `executeToolCall()` truc tiep
- `ai-provider.ts` - Giu nguyen

## Rui ro

| Rui ro | Giai phap |
|--------|-----------|
| Node khong co ReAct loop nen khong tu retry tool | Orchestrator se re-plan neu node fail; tool errors duoc log vao nodeResults |
| Content node can nhieu tool calls lien tiep | Cho phep 1 round-trip (LLM -> tools -> LLM) trong content node |
| Brand memory node khong can LLM | Goi DB truc tiep, tra ve context string |

