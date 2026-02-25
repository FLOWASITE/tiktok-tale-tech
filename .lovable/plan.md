
# Rà soát toàn diện Agentic OS (Phase 3-5)

## Phat hien

Sau khi review tat ca code da implement qua Phase 3, 4, 5, phat hien **5 van de** can xu ly:

---

## 1. Frontend khong gui `enableGraphEngine: true` (CRITICAL)

**Van de**: Graph Engine da duoc tich hop hoan chinh o backend (`chat-topics/index.ts` line 701), nhung frontend (`useChatStreaming.ts` line 154-164) **khong bao gio gui** `enableGraphEngine` trong request body. Do do Graph Engine se khong bao gio duoc kich hoat.

**Fix**: Them `enableGraphEngine: true` vao request body trong `useChatStreaming.ts`, tuong tu cach `enableSupervisor` dang duoc gui. Can them tham so moi hoac hardcode `true` de bat mac dinh.

**File**: `src/hooks/useChatStreaming.ts` (line ~154-164)

---

## 2. `content_chunk` tu Graph Engine khong duoc render dung (MEDIUM)

**Van de**: Graph Engine gui `content_chunk` events (line 776 chat-topics/index.ts), nhung frontend handler cho `content_chunk` (line 508 useChatStreaming.ts) co logic `hasStepResults` skip — khi Graph Engine chay xong, `hasStepResults` co the la `true` tu cac `node_complete` events, khien `content_chunk` bi bo qua va message cuoi cung **rong**.

**Fix**: Them dieu kien phan biet Graph Engine mode: khi nhan `graph_plan` event, set mot flag de `content_chunk` handler biet day la graph mode va luon render content.

**File**: `src/hooks/useChatStreaming.ts`

---

## 3. Tool messages thieu `tool_call_id` (MEDIUM)

**Van de**: Trong cac node (research, strategy, content, reviewer, image), khi gui follow-up messages voi tool results, cac tool messages thieu `tool_call_id` field. OpenAI-compatible APIs yeu cau moi tool message phai co `tool_call_id` tuong ung.

Ví dụ trong `research-node.ts` (line 67-78):
```text
followUpMessages.push({
  role: 'tool',
  content: JSON.stringify(toolResults[i]?.result || ...),
  // Thieu: tool_call_id: toolCalls[i].id
});
```

**Fix**: Them `tool_call_id` cho moi tool message trong tat ca 5 node files (research, strategy, content, reviewer, image). Dong thoi them tool_calls vao assistant message.

**Files**: 
- `supabase/functions/_shared/graph/nodes/research-node.ts`
- `supabase/functions/_shared/graph/nodes/strategy-node.ts`
- `supabase/functions/_shared/graph/nodes/content-node.ts`
- `supabase/functions/_shared/graph/nodes/reviewer-node.ts`
- `supabase/functions/_shared/graph/nodes/image-node.ts`

---

## 4. `supervisorEnabled` flag can kiem tra de quyet dinh Graph vs Supervisor (LOW)

**Van de**: Hien tai `useChatStreaming.ts` gui `enableSupervisor: supervisorEnabled` nhung khong gui `enableGraphEngine`. Can co logic ro rang: khi nao dung Graph Engine, khi nao dung Supervisor.

**Fix**: Them prop/config `useGraphEngine` vao streaming hook. Mac dinh bat Graph Engine (`enableGraphEngine: true`) va tat Supervisor (`enableSupervisor: false`) — hoac su dung mot toggle duy nhat.

**File**: `src/hooks/useChatStreaming.ts`

---

## 5. Cap nhat plan.md voi trang thai hoan chinh

**File**: `.lovable/plan.md`

---

## Ke hoach thuc hien

### Buoc 1: Fix tool_call_id cho 5 node files
Them `tool_call_id` va `tool_calls` vao follow-up messages trong moi node:
```text
// Assistant message phai co tool_calls
{ role: 'assistant', content: message?.content || '', tool_calls: toolCalls }

// Tool messages phai co tool_call_id  
{ role: 'tool', content: '...', tool_call_id: toolCalls[i].id }
```

### Buoc 2: Frontend gui enableGraphEngine
Trong `useChatStreaming.ts`, them `enableGraphEngine: true` vao request body. Bo `enableSupervisor` (hoac dat `false`) de chuyen mac dinh sang Graph Engine.

### Buoc 3: Fix content_chunk rendering cho Graph Engine
Them flag `isGraphEngineMode` khi nhan `graph_plan` event. Trong `content_chunk` handler, bypass `hasStepResults` check khi o graph mode.

### Buoc 4: Cap nhat plan.md

---

## Files thay doi tong hop

| File | Thay doi |
|------|----------|
| `supabase/functions/_shared/graph/nodes/research-node.ts` | Them tool_call_id + tool_calls |
| `supabase/functions/_shared/graph/nodes/strategy-node.ts` | Them tool_call_id + tool_calls |
| `supabase/functions/_shared/graph/nodes/content-node.ts` | Them tool_call_id + tool_calls |
| `supabase/functions/_shared/graph/nodes/reviewer-node.ts` | Them tool_call_id + tool_calls |
| `supabase/functions/_shared/graph/nodes/image-node.ts` | Them tool_call_id + tool_calls |
| `src/hooks/useChatStreaming.ts` | Gui enableGraphEngine, fix content_chunk rendering |
| `.lovable/plan.md` | Cap nhat trang thai |
