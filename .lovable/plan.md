

# Cac diem can hoan thien cho Hierarchical Supervisor Architecture

## Tong quan

Sau khi review toan bo code da implement, he thong multi-agent da co foundation tot nhung con **7 diem quan trong** can hoan thien de san sang cho production.

---

## 1. Agents chua doc Blackboard context tu agent truoc

**Van de**: Moi agent nhan `additionalContext` tu `buildAgentTask()` nhung chi gom `systemPrompt + brandMemoryContext`. Agents **khong** doc ket qua cua agent truoc tu blackboard.

**Vi du**: Content Agent can doc `research_data` va `content_plan` tu blackboard de tao content dua tren research + strategy. Hien tai no khong lam dieu nay.

**Giai phap**: Trong `supervisor-loop.ts`, tai `buildAgentTask()`, doc blackboard entries va inject vao `additionalContext` cho tung agent.

---

## 2. Agents khong goi tools that su

**Van de**: `executeAgent()` trong `agent-base.ts` goi `callAI()` voi tools nhung **khong** parse tool calls tu response va **khong** goi `executeToolCall()`. Ket qua la agents chi tra loi text, khong bao gio thuc su goi `web_search`, `generate_script`, etc.

**Giai phap**: Them logic parse tool calls tu AI response, goi `executeToolCall()`, va feed ket qua tro lai AI (mini ReAct loop) trong `agent-base.ts`.

---

## 3. Reviewer Agent khong su dung ket qua review de quyet dinh

**Van de**: `getTransitionEvent()` luon tra ve `review_approved` khi reviewer thanh cong, nhung khong parse JSON output cua Reviewer de check `approved: true/false`. Content co the bi reviewer danh gia thap nhung van duoc approved.

**Giai phap**: Parse JSON output tu Reviewer Agent. Neu `approved === false`, tra ve event `review_needs_revision` de state machine loop lai Content Agent.

---

## 4. Frontend khong hien thi tien trinh multi-agent

**Van de**: Frontend `useChatStreaming.ts` nhan SSE events tu supervisor (`turn_start`, `tool_executing`, `tool_result`) nhung khong hien thi agent name, phase name, hay progress bar cho multi-agent workflow.

**Giai phap**: 
- Emit SSE events co them `agent_name` va `phase` (VD: "Dang nghien cuu xu huong...", "Dang lap ke hoach...", "Dang tao noi dung...")
- Update `ChatThinkingIndicator` hien thi multi-agent pipeline progress

---

## 5. Session ID chua truyen vao agent execution logs

**Van de**: Trong `agent-base.ts`, `logAgentExecution()` dung hardcoded string `'agent-session'` va `'session'` thay vi session ID that tu supervisor.

**Giai phap**: Truyen `sessionId` vao `AgentExecutionContext` va su dung trong `logAgentExecution()`.

---

## 6. Blackboard entries khong duoc inject vao Reviewer

**Van de**: `createReviewerTask()` nhan `contentToReview = userMessage` thay vi noi dung da generate boi Content Agent. Reviewer nen review content tu blackboard key `generated_content`, khong phai user message.

**Giai phap**: Trong `buildAgentTask()`, khi agent la `reviewer-agent`, doc `generated_content` tu blackboard va pass lam content de review.

---

## 7. `buildFinalContent()` chi lay content cuoi cung

**Van de**: Ham `buildFinalContent()` dung `.pop()` de lay ket qua agent cuoi cung. Neu workflow la `research -> strategy -> content -> review`, no chi lay review result (la JSON scores) thay vi generated content.

**Giai phap**: Uu tien lay content tu `content-agent`, fallback sang agent khac.

---

## Chi tiet ky thuat

### File 1: `supabase/functions/_shared/agents/agent-base.ts`
- Them `sessionId` vao `AgentExecutionContext`
- Them mini tool-calling loop: parse tool_calls tu AI response, goi `executeToolCall()`, append observation, goi AI lai (max `agentConfig.maxTurns` lan)
- Truyen sessionId that vao `logAgentExecution()`

### File 2: `supabase/functions/_shared/supervisor/supervisor-loop.ts`
- `buildAgentTask()`: Doc blackboard entries va inject vao additionalContext cho tung agent
- `buildAgentTask()` cho reviewer: Doc `generated_content` tu blackboard thay vi dung userMessage
- `getTransitionEvent()` cho reviewer: Parse JSON output, return `review_needs_revision` neu `approved === false`
- `buildFinalContent()`: Uu tien content tu `content-agent`
- Truyen `sessionId` vao `execContext`
- Them `agent_name` va `phase` vao SSE events

### File 3: `src/hooks/useChatStreaming.ts`
- Parse `agent_name` va `phase` tu SSE events
- Update `agentTurnInfo` voi thong tin multi-agent (ten agent dang chay, phase hien tai)

### File 4: `src/components/topic/chatbot/ChatThinkingIndicator.tsx`
- Hien thi ten agent dang thuc thi (VD: "Research Agent dang tim xu huong...")
- Hien thi pipeline steps voi trang thai (pending/active/complete)

---

## Thu tu thuc hien

1. Fix `agent-base.ts` -- tool calling loop + sessionId (quan trong nhat, khong co thi agents chi tra text)
2. Fix `supervisor-loop.ts` -- blackboard injection, reviewer logic, buildFinalContent
3. Update frontend -- multi-agent progress display

