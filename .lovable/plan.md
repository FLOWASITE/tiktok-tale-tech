

# Ke hoach nang cap UI/UX Multi-Agent (5 module)

## Tong quan

Nang cap UI/UX de phan anh day du he thong multi-agent, tap trung vao 5 yeu cau chinh: Agent Team Overview, Context Quality visual breakdown, Mobile responsive, Emotion/Delight, va cac tinh nang nang cao (Co-Pilot sidebar, Review Score Card, Supervisor toggle).

---

## Module 1: Review Score Card + Confetti Delight

**Muc tieu**: Hien thi diem cua Reviewer Agent va tao "wow moment" khi approved.

**Thay doi**:

- **Tao file moi** `src/components/topic/chatbot/ReviewScoreCard.tsx`
  - Component hien thi 4 thanh progress nho: Relevance, Creativity, Brand Alignment, Platform Fit
  - Overall score badge voi 3 muc: Xuat sac (>90, mau xanh), Tot (>70, mau vang), Can cai thien (<70, mau do)
  - Nut "Yeu cau AI cai thien" khi diem < 70
  - Khi `approved === true` va `overall >= 85`: trigger confetti effect su dung `useConfetti` hook da co san

- **Cap nhat** `src/components/topic/chatbot/types.ts`
  - Them `ReviewScores` interface va `agentContributions` vao `ChatMessage`
  ```text
  interface ReviewScores {
    relevance: number;
    creativity: number;
    brandAlignment: number;
    platformFit: number;
    overall: number;
    approved: boolean;
    feedback?: string;
  }
  interface AgentContribution {
    agentName: string;
    phase: string;
    duration?: number;
    summary?: string;
  }
  // Them vao ChatMessage:
  reviewScores?: ReviewScores;
  agentContributions?: AgentContribution[];
  suggestedFollowUps?: string[];
  ```

- **Cap nhat** `src/hooks/useChatStreaming.ts`
  - Parse SSE event `review_scores` va `agent_complete`
  - Luu `reviewScores` va `agentContributions` vao ChatMessage

- **Cap nhat** `src/components/topic/chatbot/ChatMessageBubble.tsx`
  - Render `ReviewScoreCard` phia duoi noi dung khi `message.reviewScores` ton tai
  - Render `AgentAttributionBar` (badges nho: Research, Strategy, Content, Reviewed) phia tren noi dung khi co `agentContributions`

---

## Module 2: Context Quality Visual Breakdown

**Muc tieu**: Thay the hien thi `%` don gian bang stacked bar chart cho thay nguon context.

**Thay doi**:

- **Cap nhat** `src/components/topic/chatbot/ContextBadges.tsx`
  - Them component `ContextQualityMeter`
  - Stacked horizontal bar (khong can thu vien chart) voi mau sac theo nguon: Brand Memory (tim), Web Search (xanh duong), Conversation History (xanh la), Industry Pack (cam)
  - Tooltip khi hover hien thi breakdown chi tiet
  - Khi context richness < 30%: hien thi goi y nho "Them brand template de AI hieu ban hon"

- **Cap nhat** `src/components/topic/chatbot/ChatMessageBubble.tsx`
  - Thay the hien thi `{message.contextRichness}% context` bang `ContextQualityMeter`

- **Cap nhat** `src/components/topic/chatbot/types.ts`
  - Them `contextSources` vao `ChatMessage`:
  ```text
  contextSources?: {
    brandMemory: number;    // 0-100
    webSearch: number;
    conversationHistory: number;
    industryPack: number;
  };
  ```

- **Cap nhat** `src/hooks/useChatStreaming.ts`
  - Parse `context_sources` tu SSE event `context_metadata`

---

## Module 3: Mobile Responsive + Pipeline Ngang

**Muc tieu**: Dam bao pipeline visualizer va badges khong bi tran tren mobile.

**Thay doi**:

- **Cap nhat** `src/components/topic/chatbot/ChatThinkingIndicator.tsx`
  - Khi man hinh >= md (768px): hien thi pipeline ngang (horizontal stepper) voi icon + ten agent
  - Khi man hinh < md: giu layout doc (vertical) hien tai nhung compact hon (chi hien thi icon + abbreviated label)
  - Su dung Tailwind responsive classes: `hidden md:flex` va `flex md:hidden`
  - Agent icons: Search (Research), ClipboardList (Strategy), Pen (Content), Shield (Reviewer)

- **Cap nhat** `src/components/topic/chatbot/ContextBadges.tsx`
  - Tren mobile: hien thi toi da 3 badges, phan con lai gom vao `+N more` badge voi tooltip
  - `ContextQualityMeter` chuyen sang full-width tren mobile

- **Cap nhat** `src/components/topic/chatbot/ChatMessageBubble.tsx`
  - Follow-up suggestions: scroll ngang tren mobile thay vi wrap xuong dong
  - `ReviewScoreCard`: layout 2x2 grid tren mobile thay vi 4 cot

---

## Module 4: Supervisor Mode Toggle + Sound Effects

**Muc tieu**: Cho phep nguoi dung bat/tat multi-agent pipeline va them sound delight.

**Thay doi**:

- **Cap nhat** `src/hooks/useChatUI.ts`
  - Them state `supervisorEnabled` (default: true), luu vao localStorage
  - Them state cho sound notification preference

- **Cap nhat** `src/components/topic/chatbot/ChatHeader.tsx`
  - Them toggle "AI Pro Mode" (icon Brain) ben canh cac nut hien tai
  - Tooltip giai thich: "Bat de AI su dung nhieu chuyen gia phan tich truoc khi tra loi"
  - Visual: khi bat, icon Brain co glow effect

- **Cap nhat** `src/hooks/useChatStreaming.ts`
  - Nhan `supervisorEnabled` tu options va truyen vao API body `enableSupervisor`

- **Sound effects**:
  - Tao file `src/hooks/useAgentSound.ts`
  - Play sound nhe khi: agent hoan thanh (soft chime), reviewer approve (success tone), review score cao (confetti + chime)
  - Su dung Web Audio API (oscillator don gian, khong can file audio)
  - Respect `soundEnabled` setting tu `useChatUI`

---

## Module 5: Agent Attribution Bar + Dynamic Follow-ups

**Muc tieu**: Hien thi agents da tham gia va goi y follow-up thong minh.

**Thay doi**:

- **Tao file moi** `src/components/topic/chatbot/AgentAttributionBar.tsx`
  - Horizontal bar voi badges nho cho moi agent da tham gia
  - Moi badge co icon + ten agent + duration (VD: "Research 2.1s")
  - Badge "Reviewed" mau xanh la khi approved, mau vang khi co revision
  - Click vao badge mo collapsible panel (su dung Radix Collapsible da co) hien thi summary output cua agent do

- **Cap nhat** `src/components/topic/chatbot/ChatMessageBubble.tsx`
  - Render `AgentAttributionBar` phia tren context badges khi co `message.agentContributions`
  - Thay the follow-up buttons cung ("Them", "Format") bang `message.suggestedFollowUps` khi co
  - Fallback ve buttons cung khi khong co suggested follow-ups

- **Cap nhat** `src/hooks/useChatStreaming.ts`
  - Parse `suggested_followups` tu SSE `final_response` event
  - Parse `agent_complete` events de build `agentContributions` array

---

## Thu tu implement

1. Module 1: Types + ReviewScoreCard + Confetti (foundation cho cac module khac)
2. Module 2: Context Quality Meter (doc lap, it dependency)
3. Module 3: Mobile responsive (ap dung len cac component da update)
4. Module 4: Supervisor toggle + Sound
5. Module 5: Agent Attribution + Dynamic follow-ups

## Tong file thay doi

| File | Thay doi |
|------|----------|
| `types.ts` | Them ReviewScores, AgentContribution, contextSources, suggestedFollowUps |
| `ReviewScoreCard.tsx` | Tao moi |
| `AgentAttributionBar.tsx` | Tao moi |
| `useAgentSound.ts` | Tao moi |
| `ContextBadges.tsx` | Them ContextQualityMeter, mobile truncation |
| `ChatThinkingIndicator.tsx` | Horizontal pipeline desktop, compact mobile |
| `ChatMessageBubble.tsx` | Tich hop ReviewScore, Attribution, dynamic follow-ups, mobile scroll |
| `ChatHeader.tsx` | Them AI Pro Mode toggle |
| `useChatUI.ts` | Them supervisorEnabled state |
| `useChatStreaming.ts` | Parse review_scores, agent_complete, context_sources, suggested_followups, truyen supervisorEnabled |
| `index.ts` | Export cac component moi |

