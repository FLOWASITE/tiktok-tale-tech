

# Sprint 4: Dead Code Cleanup + Graph Engine Polish

## Tong quan

Sprint 4 tap trung vao 2 muc tieu chinh:
1. **Loai bo hoan toan Legacy Supervisor va Single-Turn mode** — dead code chiem ~600 dong trong `chat-topics/index.ts` va toan bo thu muc `supervisor/`
2. **Polish Graph Engine** — fix cac loi nho ve UI labels, metrics, va conversation context

---

## Task 14: Xoa Legacy Supervisor Code

**Van de:** `enableSupervisor` luon la `false`, nhung toan bo code van ton tai: ~140 dong trong `chat-topics/index.ts` (dong 865-1011) va 6 file trong `supabase/functions/_shared/supervisor/`.

**Thay doi:**

1. **`chat-topics/index.ts`**:
   - Xoa block `SUPERVISOR MULTI-AGENT MODE` (dong 865-1011)
   - Xoa import `executeSupervisorLoop` (dong 16)
   - Xoa request param `enableSupervisor` va bien `useSupervisor`

2. **Xoa toan bo thu muc** `supabase/functions/_shared/supervisor/`:
   - `supervisor-loop.ts`
   - `state-machine.ts`
   - `intent-classifier.ts`
   - `agent-registry.ts`
   - `blackboard.ts`
   - `brand-memory.ts`

3. **`useChatStreaming.ts`** (frontend):
   - Xoa `enableSupervisor: false` khoi request body (dong 163)
   - Xoa option `supervisorEnabled` khoi interface (dong 42)

---

## Task 15: Xoa Legacy Single-Turn Mode

**Van de:** Khi `useGraphEngine = true` (luon true), code fallback xuong Single-Turn mode (dong 1143-1515) khong bao gio duoc chay. ~370 dong dead code.

**Thay doi:**

1. **`chat-topics/index.ts`**:
   - Xoa toan bo block `LEGACY SINGLE-TURN MODE` (dong 1143-1515)
   - Xoa toan bo block `AGENTIC LOOP MODE` (dong 1013-1141) — cung bi bypass boi Graph Engine
   - Xoa import `executeAgenticLoop`, `buildReActPromptSection` (dong 15)
   - Xoa cac bien `useAgenticLoop`, `useSupervisor`, `useGraphEngine` — Graph Engine la mode duy nhat
   - Xoa logic `finalSystemPrompt` dieu kien (dong 628-630) — khong con can

---

## Task 16: Them Missing Node Labels cho Graph Engine UI

**Van de:** `useChatStreaming.ts` (dong 300-307) dinh nghia `nodeLabels` nhung thieu `governor` va `compliance`. Khi cac node nay chay, progress bar hien thi ten ky thuat thay vi label than thien.

**Thay doi:**

1. **`useChatStreaming.ts`** — Them vao `nodeLabels` map:
   ```
   'governor': '⚖️ Kiểm soát chất lượng',
   'compliance': '🛡️ Tuân thủ quy định',
   ```

---

## Task 17: Fix Graph Engine Metrics (outputTokensEstimated sai)

**Van de:** Dong 828 dung `contentGoal?.length` (vi du "education" = 9 chars) de uoc tinh output tokens. Ket qua: metrics luu output = 2-3 tokens thay vi so that.

**Thay doi:**

1. **`chat-topics/index.ts`** — Sua `outputTokensEstimated` trong Graph Engine mode:
   - Tinh tu `finalContent` thuc te: `Math.ceil(contentStr.length / 4)`
   - Can di chuyen khai bao `contentStr` len truoc block `finally` de truy cap duoc

---

## Task 18: Truyen Conversation History vao Graph Engine

**Van de:** Graph Engine chi nhan `processedMessages[last].content` lam `userMessage`. Cac tin nhan truoc do bi mat — AI khong co context hoi thoai.

**Thay doi:**

1. **`chat-topics/index.ts`** — Truyen conversation history vao `runOrchestrator`:
   - Them `conversationHistory` vao `RunOrchestratorOptions`
   - Trong `runOrchestrator()`, inject conversation history vao `state.messages`

2. **`graph-engine.ts`** — Them `conversationHistory` vao `RunOrchestratorOptions`:
   - Them field `conversationHistory?: Array<{ role: string; content: string }>`
   - Trong `runOrchestrator()`: merge vao `state.messages` truoc khi chay orchestrator

---

## Chi tiet ky thuat

### Files thay doi

| File | Loai | Mo ta |
|------|------|-------|
| `chat-topics/index.ts` | Sua | Xoa Supervisor block, Single-Turn block, Agentic block; fix metrics |
| `supervisor/` (6 files) | Xoa | Toan bo thu muc legacy |
| `useChatStreaming.ts` | Sua | Xoa supervisor option; them governor/compliance labels |
| `graph-engine.ts` | Sua | Them conversationHistory support |
| `.lovable/plan.md` | Sua | Cap nhat Sprint 4 = COMPLETED |

### Tac dong
- Giam ~600 dong dead code trong `chat-topics/index.ts`
- Xoa 6 file legacy (~900 dong)
- Metrics chinh xac hon
- UI hien thi dung ten tat ca 8 nodes
- Graph Engine co full conversation context

