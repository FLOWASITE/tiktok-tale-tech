

# Nang cap Multi-Agent Architecture: 7 Module Uu Tien

## Tong quan

Dua tren phan tich chi tiet codebase hien tai, ke hoach nay tap trung vao 7 nang cap theo 3 muc uu tien. He thong hien tai co: FSM 8 trang thai, 4 agent (Research/Strategy/Content/Reviewer), Blackboard in-memory + DB, TokenBudgetController don gian, va Learning Agent co ban.

---

## Muc 1: Lam ngay (1-2 tuan)

### Module 1: Nang cap Reviewer Agent - Them 3 Tool

**Van de**: Reviewer hien tai khong co tool nao (`tools: []` trong agent-registry), chi dung reasoning thuan. Khong the kiem tra brand voice hay compliance thuc te.

**Giai phap**: Them 3 tool moi va ket noi voi du lieu thuc trong DB.

**File thay doi**:

- `supabase/functions/_shared/tool-definitions.ts`
  - Them 3 tool definitions:
    - `brand_voice_check`: Nhan content, tra ve diem brand alignment dua tren `brand_templates` (tone_of_voice, forbidden_words, preferred_words)
    - `legal_compliance_check`: Nhan content + industry, tra ve violations dua tren `industry_jurisdiction_profiles.resolved_rules`
    - `platform_best_practices`: Nhan content + platform, tra ve danh gia format/length/hashtag theo best practices

- `supabase/functions/_shared/tool-executor.ts`
  - Them handler cho 3 tool moi
  - `brand_voice_check`: Query `brand_templates` -> kiem tra forbidden_words, tone match, preferred_words usage
  - `legal_compliance_check`: Query `industry_jurisdiction_profiles` -> kiem tra forbidden_terms, claim_restrictions tu resolved_rules
  - `platform_best_practices`: Tra ve static best practices theo platform (TikTok/Facebook/Instagram/LinkedIn)

- `supabase/functions/_shared/supervisor/agent-registry.ts`
  - Cap nhat Reviewer Agent config:
    ```text
    tools: ['brand_voice_check', 'legal_compliance_check', 'platform_best_practices']
    maxTurns: 2  (tang tu 1 len 2 de co 1 turn goi tool + 1 turn ket luan)
    timeoutMs: 15000  (tang tu 10000)
    ```

- `supabase/functions/_shared/agents/reviewer-agent.ts`
  - Cap nhat system prompt: yeu cau Reviewer goi tools truoc khi cho diem
  - Output format giu nguyen JSON nhung them `tool_evidence` field

---

### Module 2: Global Session Budget & Dynamic Re-allocation

**Van de**: `TokenBudgetController` trong supervisor-loop chi co tong budget co dinh (16384) va khong re-allocate khi agent dung it.

**Giai phap**: Nang cap thanh Session Budget Manager voi dynamic allocation.

**File thay doi**:

- `supabase/functions/_shared/supervisor/supervisor-loop.ts`
  - Thay `TokenBudgetController` class bang `SessionBudgetManager`:
    ```text
    class SessionBudgetManager {
      totalBudget: number = 16384
      perAgentUsage: Record<string, number>
      agentOrder: string[]  // Thu tu agent se chay

      // Khi agent A dung it hon budget,
      // phan du duoc chuyen cho agent tiep theo
      getRemainingBudgetForAgent(agentName: string): number {
        const usedSoFar = sum of all previous agents usage
        return totalBudget - usedSoFar
      }

      // Tinh budget kha dung thuc te cho agent
      getEffectiveBudget(agentName: string): number {
        const config = getAgent(agentName)
        const remaining = getRemainingBudgetForAgent(agentName)
        // Cho phep dung toi da 150% budget goc neu co du
        return Math.min(remaining, config.tokenBudget * 1.5)
      }
    }
    ```
  - Emit SSE event `budget_update` sau moi agent hoan thanh de frontend hien thi token usage
  - Them `cost_estimate_usd` vao SSE `final_response` event (dung `cost-estimator.ts` da co)

---

### Module 3: Blackboard Context Pruning & Auto-Summary

**Van de**: Blackboard `memoryStore` tich tu vo han trong 1 session. Sau nhieu agent, context bi dai va ton token.

**Giai phap**: Them versioning va auto-summary.

**File thay doi**:

- `supabase/functions/_shared/supervisor/blackboard.ts`
  - Them version tracking cho moi key:
    ```text
    // Thay Map<string, BlackboardEntry> bang:
    Map<string, BlackboardEntry[]>  // Array of versions per key

    write(): Them entry moi vao array, giu toi da 3 versions
    read(): Tra ve version moi nhat
    readHistory(key, limit): Tra ve N versions gan nhat
    ```
  - Them `prune()` method: Khi tong token cua blackboard > 3000, tu dong:
    1. Giu nguyen latest version cua moi key
    2. Summarize older versions thanh 1 dong
  - Cap nhat `buildBlackboardContext()`: Chi inject latest version, them 1 dong "Previous: [summary]" neu co

- `supabase/functions/_shared/supervisor/supervisor-loop.ts`
  - Goi `blackboard.prune()` truoc moi lan `buildAgentTask()` (truoc khi inject context cho agent tiep theo)

---

## Muc 2: Lam trong thang

### Module 4: Hierarchical Supervisor voi Conditional Branching

**Van de**: FSM hien tai co 8 trang thai co dinh. Khong the xu ly yeu cau phuc tap nhu "nghien cuu doi thu + tao content 30 ngay + toi uu ads" vi luong chay luon la tuyen tinh: Research -> Strategy -> Content -> Review.

**Giai phap**: Nang cap FSM thanh graph-based execution voi conditional branching. Khong can thu vien ngoai (LangGraph), tu build nhe dua tren FSM hien tai.

**File thay doi**:

- `supabase/functions/_shared/supervisor/state-machine.ts`
  - Them `WorkflowState` moi: `parallel_research`, `sub_workflow`
  - Them `WorkflowEvent` moi: `classified_multi_step`, `sub_complete`, `merge_results`
  - Them `ConditionalTransition` type:
    ```text
    interface ConditionalTransition extends WorkflowTransition {
      condition?: (context: WorkflowContext) => boolean;
      // VD: chi chuyen sang 'reviewing' khi stateData.contentLength > 500
    }
    ```
  - Them `subWorkflows` vao `WorkflowContext` de ho tro workflow long nhau
  - Giu backward compatible: FSM cu van hoat dong, chi them nhanh moi

- `supabase/functions/_shared/supervisor/intent-classifier.ts`
  - Them intent `multi_step`: Phat hien yeu cau nhieu buoc (VD: "nghien cuu roi tao content roi phan tich")
  - Classifier tra ve `steps: string[]` cho Supervisor biet thu tu agent
  - Them patterns moi trong `INTENT_PATTERNS`:
    ```text
    multi_step: [
      /nghiên cứu.*tạo.*phân tích|research.*create.*analyze/i,
      /bước 1.*bước 2|step 1.*step 2/i,
      /từ A đến Z|end-to-end|full pipeline/i,
    ]
    ```

- `supabase/functions/_shared/supervisor/supervisor-loop.ts`
  - Them logic xu ly `multi_step` intent: Doc `steps` tu classification, chay tung step
  - Them `mergeResults()` function: Gom ket qua tu nhieu sub-workflow thanh 1 response

---

### Module 5: Learning Agent Nang Cap - Feedback Loop

**Van de**: Learning Agent hien tai chi chay fire-and-forget sau workflow. Khong co co che feedback tu user (thumbs up/down) anh huong truc tiep den prompt tuning.

**Giai phap**: Them feedback collection, pattern analysis, va prompt adaptation.

**File thay doi**:

- `supabase/functions/_shared/agents/learning-agent.ts`
  - Them `analyzePatterns()`: Sau khi co >= 5 learnings cho 1 brand, goi LLM de tong hop thanh "brand style rules"
  - Them `adaptSystemPrompt()`: Inject learned rules vao system prompt cua Content Agent
  - Them support cho `performance_pattern` memory type: Luu ket qua tot (user thumbs up) de reinforcement

- Tao migration moi:
  - Them cot `feedback_score` vao bang `agent_execution_logs` (nullable, -1/0/1)
  - Them index: `idx_agent_exec_brand_feedback ON agent_execution_logs(session_id, agent_name)`

- `supabase/functions/_shared/supervisor/supervisor-loop.ts`
  - Truyen `reviewScores` vao `runLearningAgent()` de Learning Agent biet content nao duoc Reviewer danh gia cao/thap
  - Luu `sessionId` vao response de frontend co the gui feedback sau

---

### Module 6: Agent Performance Dashboard (Frontend)

**Muc tieu**: Cho user thay tong quan hieu suat cua tung agent.

**File thay doi**:

- Tao `src/components/topic/chatbot/AgentPerformanceDashboard.tsx`
  - Query `agent_execution_logs` group by agent_name
  - Hien thi:
    - Tong so lan chay moi agent
    - Thoi gian trung binh (avg duration_ms)
    - Ty le thanh cong (success rate)
    - Token su dung trung binh
  - Dung Recharts (da co) de ve bar chart so sanh agents
  - Accessible tu ChatHeader hoac Settings

- Tao `src/hooks/useAgentPerformance.ts`
  - Hook query `agent_execution_logs` voi filter theo organization_id va date range
  - Return aggregated stats per agent

---

## Muc 3: Tuong lai

### Module 7: Brand Memory Agent

**Muc tieu**: Agent chuyen biet quan ly Brand Profile, tu dong cap nhat dua tren interaction.

**File thay doi**:

- Tao `supabase/functions/_shared/agents/brand-memory-agent.ts`
  - System prompt: Chuyen gia brand management
  - Tools: `update_brand_voice`, `add_brand_term`, `query_brand_history`
  - Tu dong chay khi phat hien user thay doi brand-related content nhieu lan

- `supabase/functions/_shared/supervisor/agent-registry.ts`
  - Dang ky brand-memory-agent voi priority 0 (cao nhat), maxTurns 1, tokenBudget 1000

- `supabase/functions/_shared/supervisor/state-machine.ts`
  - Them trang thai `brand_learning` giua `completed` va terminal state
  - Agent nay chay async (khong block response)

---

## Thu tu implement

```text
Tuan 1:  Module 1 (Reviewer Tools) + Module 3 (Blackboard Pruning)
Tuan 2:  Module 2 (Session Budget) + Module 5 (Learning Feedback - DB migration)
Tuan 3:  Module 4 (Hierarchical Supervisor)
Tuan 4:  Module 6 (Performance Dashboard) + Module 5 (Learning Agent code)
Sau do:  Module 7 (Brand Memory Agent)
```

## Tong file thay doi

| File | Module | Thay doi |
|------|--------|----------|
| `tool-definitions.ts` | 1 | Them 3 tool definitions cho Reviewer |
| `tool-executor.ts` | 1 | Them handler cho 3 tool moi |
| `agent-registry.ts` | 1, 7 | Cap nhat Reviewer config, dang ky Brand Memory Agent |
| `reviewer-agent.ts` | 1 | Cap nhat system prompt yeu cau goi tools |
| `supervisor-loop.ts` | 2, 3, 4, 5 | SessionBudgetManager, prune, multi-step, learning feedback |
| `blackboard.ts` | 3 | Versioning, prune, auto-summary |
| `state-machine.ts` | 4, 7 | Conditional branching, brand_learning state |
| `intent-classifier.ts` | 4 | Them multi_step intent |
| `learning-agent.ts` | 5 | Pattern analysis, prompt adaptation |
| `brand-memory-agent.ts` | 7 | Tao moi |
| `AgentPerformanceDashboard.tsx` | 6 | Tao moi |
| `useAgentPerformance.ts` | 6 | Tao moi |
| DB migration | 5 | Them feedback_score vao agent_execution_logs |

