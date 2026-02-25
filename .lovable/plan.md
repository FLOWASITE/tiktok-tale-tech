

# Kiem tra End-to-End: Agent Backend va Frontend

## Tong quan lien ket

He thong Multi-Agent hoat dong theo chuoi sau:

```text
Frontend (Chat UI)
  |
  | POST /chat-topics (SSE stream)
  v
Edge Function: chat-topics/index.ts
  |
  | executeSupervisorLoop()
  v
Supervisor Loop (supervisor-loop.ts)
  |
  |-- Intent Classifier --> phan loai intent (chat/research/plan/generate/image_generate/multi_step)
  |-- State Machine --> chuyen trang thai (idle -> classifying -> image_generating -> completed)
  |-- Agent Registry --> lay config agent tuong ung
  |-- Agent Base --> executeAgent() voi ReAct loop
  |-- Tool Executor --> goi tool (generate_image, edit_image, web_search, ...)
  |-- Blackboard --> ghi/doc data chia se giua agents
  |-- SSE Events --> gui ve frontend qua onEvent callback
  |
  v
Frontend (useChatStreaming.ts)
  |
  |-- Nhan SSE events: classification, tool_executing, tool_result, content_chunk, final_response
  |-- Cap nhat UI: ChatThinkingIndicator (progress steps), ChatMessageBubble, ToolResultCard
  |-- AgentAttributionBar hien thi agents da tham gia
  |-- ReviewScoreCard hien thi diem cua Reviewer
```

---

## Cac van de phat hien

### Van de 1: Frontend thieu label cho Image Agent trong progress steps

**File**: `src/hooks/useChatStreaming.ts` (dong 412-417)

Map `agentLabels` chi co 4 agent, **thieu `image-agent`**:

```text
const agentLabels = {
  'research-agent': '...',
  'strategy-agent': '...',
  'content-agent': '...',
  'reviewer-agent': '...',
  // THIEU: 'image-agent': '...'
  // THIEU: 'brand-memory-agent': '...'
};
```

**Hau qua**: Khi supervisor phan loai intent la `image_generate` va gui `suggestedAgents: ['image-agent']`, frontend se hien thi raw name `image-agent` thay vi label tieng Viet.

**Fix**: Them `'image-agent': '🎨 Tao hinh anh'` va `'brand-memory-agent': '🧠 Cap nhat thuong hieu'` vao map.

---

### Van de 2: Agent Contributions khong tracking Image Agent

**File**: `src/hooks/useChatStreaming.ts`

Khi nhan SSE `tool_result` voi `parsed.data.agent === 'image-agent'`, data duoc push vao `receivedToolResults` nhung khong duoc map sang `pendingAgentContributions`. Can kiem tra xem logic tao `agentContributions` co bao phu Image Agent khong.

**Fix**: Dam bao SSE event `tool_result` tu supervisor co truong `agent_name` de `AgentAttributionBar` hien thi dung. Backend da gui truong nay (dong 281 supervisor-loop.ts), chi can frontend doc dung.

---

### Van de 3: ToolResultCard cho Image Agent - thieu fallback khi khong co image_url

**File**: `src/components/topic/chatbot/ToolResultCard.tsx` (dong 481-532)

Component `GenerateImageResult` gia dinh `result.image_url` luon ton tai. Neu edge function `generate-brand-image` tra ve loi hoac format khac, UI se trong.

**Fix**: Them fallback message khi `image_url` la null/undefined.

---

### Van de 4: Tool definitions khong duoc register trong agentic-loop

Backend Image Agent su dung `generate_image` va `edit_image` tools. Can xac nhan cac tool nay da duoc khai bao trong `tool-definitions.ts` va Image Agent config trong `agent-registry.ts` reference dung ten tool.

**Ket qua kiem tra**: Da dung. `agent-registry.ts` khai bao `tools: ['generate_image', 'edit_image']` va `tool-definitions.ts` + `tool-executor.ts` da co handler cho ca 2 tool.

---

### Van de 5: AbortController timeout cho edit_image

**File**: `supabase/functions/_shared/tool-executor.ts` (dong 1420-1476)

Ham `executeEditImage` **khong co timeout** (khac voi `executeGenerateImage` co 110s timeout). Neu edge function `edit-image-background` bi treo, agent se doi vo han.

**Fix**: Them AbortController voi timeout 60s cho `executeEditImage`.

---

## Ke hoach sua loi

### Buoc 1: Cap nhat agentLabels trong useChatStreaming.ts
- Them `'image-agent'` va `'brand-memory-agent'` vao map agentLabels
- Dam bao progress steps hien thi dung label khi supervisor gui classification event

### Buoc 2: Them timeout cho executeEditImage
- Them AbortController 60s tuong tu executeGenerateImage

### Buoc 3: Them fallback UI cho GenerateImageResult
- Khi `image_url` khong co, hien thi message "Anh dang duoc xu ly..." hoac thong bao loi

### Buoc 4: Dam bao Agent Attribution tracking Image Agent
- Kiem tra va bo sung logic de `agentContributions` bao gom Image Agent khi no chay trong workflow

---

## Tong ket trang thai hien tai

| Lop | Trang thai | Ghi chu |
|-----|-----------|---------|
| State Machine | OK | Da co `image_generating` state va transitions |
| Intent Classifier | OK | Da co `image_generate` intent voi regex + LLM |
| Agent Registry | OK | `image-agent` da dang ky dung |
| Tool Definitions | OK | `generate_image` + `edit_image` da khai bao |
| Tool Executor | Can fix | `executeEditImage` thieu timeout |
| Supervisor Loop | OK | Routing, blackboard, SSE events day du |
| Frontend SSE | Can fix | Thieu label cho `image-agent` trong progress steps |
| ToolResultCard | Can fix | Thieu fallback khi khong co image_url |
| AgentAttributionBar | Can fix | Can dam bao tracking Image Agent |

