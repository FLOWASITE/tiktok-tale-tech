

# Sprint 5: Deep Dead Code Cleanup + Type Hygiene

Sprint 4 da xoa Supervisor/Single-Turn blocks chinh. Sprint 5 tiep tuc lam sach nhung gi con sot lai.

---

## Task 19: Xoa Dead Imports trong `chat-topics/index.ts`

**Van de:** Sau khi xoa Supervisor/Agentic/Single-Turn blocks, nhieu import khong con duoc su dung:
- `CHAT_TOOLS`, `ToolCallResult` (dong 5) — tools do nodes tu quan ly
- `executeToolCall` (dong 6) — khong goi truc tiep
- `executeToolChain`, `detectToolChainDependencies`, `summarizeToolChain`, `ToolChainResult` (dong 7-12) — tool-chain executor khong duoc dung
- `createSSEWriter` tu `agentic-loop.ts` (dong 15) — chi dung `createSSEWriter`, co the extract ra file rieng hoac giu lai
- `enableTools` trong destructuring (dong 86) — khong duoc su dung sau do

**Thay doi:**
1. Xoa import `CHAT_TOOLS`, `ToolCallResult` (dong 5)
2. Xoa import `executeToolCall` (dong 6)
3. Xoa import `executeToolChain`, `detectToolChainDependencies`, `summarizeToolChain`, `ToolChainResult` (dong 7-12)
4. Xoa `enableTools` khoi destructuring (dong 86)
5. Giu `createSSEWriter` import tu `agentic-loop.ts` — van dang duoc su dung

**File:** `supabase/functions/chat-topics/index.ts`

---

## Task 20: Lam sach `ChatRequest` type — xoa legacy flags

**Van de:** `ChatRequest` interface van chua `enableAgenticLoop`, `enableSupervisor`, `enableGraphEngine`, `maxAgentTurns` — tat ca deu dead.

**Thay doi:**
1. Xoa 4 fields: `enableAgenticLoop`, `enableSupervisor`, `enableGraphEngine`, `maxAgentTurns`
2. Giu `enableTools` (van duoc frontend gui, du backend khong xu ly — co the xoa sau)

**File:** `supabase/functions/_shared/types/chat-types.ts`

---

## Task 21: Extract `createSSEWriter` ra file rieng

**Van de:** `chat-topics/index.ts` import `createSSEWriter` tu `agentic-loop.ts` (519 dong). Day la file legacy 100% — chi con 1 ham nho duoc su dung. Nen extract ra de co the xoa `agentic-loop.ts` trong tuong lai.

**Thay doi:**
1. Tao file moi `supabase/functions/_shared/sse-writer.ts` — copy `createSSEWriter` + `SSEWriter` + `AgentSSEEvent` interfaces
2. Doi import trong `chat-topics/index.ts` tu `agentic-loop.ts` sang `sse-writer.ts`
3. Xoa comment `// createSSEWriter imported above from agentic-loop.ts` (dong 20)

**Files:** `sse-writer.ts` (moi), `chat-topics/index.ts` (sua import)

---

## Task 22: Xoa `enableTools: true` tu frontend request

**Van de:** `useChatStreaming.ts` (dong 160) van gui `enableTools: true` nhung backend khong su dung no nua (Graph Engine nodes tu quyet dinh tools).

**Thay doi:**
1. Xoa `enableTools: true` khoi request body

**File:** `src/hooks/useChatStreaming.ts`

---

## Task 23: Cap nhat `.lovable/plan.md`

**Thay doi:** Ghi Sprint 5 = COMPLETED.

---

## Chi tiet ky thuat

| File | Loai | Mo ta |
|------|------|-------|
| `chat-topics/index.ts` | Sua | Xoa 5 dead imports, doi SSE writer import |
| `chat-types.ts` | Sua | Xoa 4 legacy flags |
| `sse-writer.ts` | Moi | Extract createSSEWriter (~30 dong) |
| `useChatStreaming.ts` | Sua | Xoa `enableTools: true` |
| `.lovable/plan.md` | Sua | Sprint 5 COMPLETED |

### Tac dong
- `chat-topics/index.ts` giam ~10 dong imports dead
- `ChatRequest` type sach, chi con cac fields thuc su duoc su dung
- `agentic-loop.ts` (519 dong) co the an toan xoa trong sprint sau khi khong con ai import
- Frontend request body gon hon

