

## Nang cap UI/UX Chat sau Multi-Agent

### Danh gia hien trang

Nhieu thanh phan da duoc xay dung san:
- **ChatThinkingIndicator**: Da co pipeline ngang (desktop) va doc (mobile) voi progressSteps
- **AgentAttributionBar**: Da co badges agent trong message bubbles
- **ReviewScoreCard**: Da co 4 thanh diem + grade
- **ContextQualityMeter**: Da co stacked bar trong ContextBadges
- **DiscoveryTab**: Da co tab Kham pha voi trending, suggestions, events

### Cac nang cap can lam (4 phan)

---

### A. Agent Pipeline Visualizer — Nang cap thanh Persistent Header Bar

**Hien tai**: Pipeline chi hien khi AI dang "thinking" (trong ChatThinkingIndicator), mat khi xong.

**Nang cap**: Tao thanh pipeline **co dinh ngay duoi header** (68px), luon hien thi trang thai cua lan chay gan nhat.

**File moi**: `src/components/topic/chatbot/AgentPipelineBar.tsx`
- 5 pill ngang gradient tim-hong: Research → Strategy → Content → Visual → Reviewer
- 3 trang thai: pending (xam nhat), active (pulse ring tim + "Dang phan tich..."), complete (checkmark xanh + thoi gian)
- Hover pill hien tooltip chi tiet
- Thu gon thanh 1 dong tren mobile (chi hien icon + progress bar)
- Chi hien khi supervisorEnabled = true

**File sua**: `src/components/topic/TopicAIChatbot.tsx`
- Import va dat AgentPipelineBar ngay sau ChatHeader, truoc message list
- Truyen progressSteps va supervisorEnabled tu streamingHook/uiHook
- Them state `lastCompletedSteps` de giu lai ket qua pipeline sau khi hoan thanh

**File sua**: `src/hooks/useChatUI.ts`
- Them state `lastPipelineSteps` luu tru progressSteps cua lan chay gan nhat

---

### B. Chat Message Bubble — Live Status khi dang tao

**Hien tai**: Message bubble chi hien skeleton hoac noi dung cuoi cung. Khong co "Content Agent dang viet..." inline.

**Nang cap**: Khi streaming, hien dong status nho phia tren noi dung dang duoc viet.

**File sua**: `src/components/topic/chatbot/ChatMessageBubble.tsx`
- Them prop `streamingAgentName?: string` 
- Khi message dang streaming (content dang tang dan) va co agentName → hien badge nho "Content Agent dang viet..." voi animation typing dots
- Dat ngay tren phan ReactMarkdown content

**File sua**: `src/components/topic/chatbot/SimpleMessageList.tsx`
- Truyen streamingAgentName xuong ChatMessageBubble cho message cuoi cung khi isLoading

---

### C. Input Box — @ Mention Agent + Nut "Giao cho Doi ngu"

**Nang cap 1: @ Mention**

**File moi**: `src/components/topic/chatbot/AgentMentionPopover.tsx`
- Popover hien khi go "@" trong textarea
- Danh sach 5 agent (Research, Strategy, Content, Visual, Reviewer) voi icon + mo ta ngan
- Chon agent → chen "@Research " vao input
- Filter theo text sau "@"

**Nang cap 2: Nut "Giao cho Doi ngu"**

**File sua**: `src/components/topic/chatbot/ChatInputArea.tsx`
- Doi nut Send thanh 2 che do:
  - Khi supervisorEnabled = true: Hien nut "Giao cho Doi ngu" (icon Users + Sparkles gradient) thay vi nut Send don thuan
  - Khi supervisorEnabled = false: Giu nut Send nhu cu
- Nut van goi onSubmit nhu binh thuong, chi doi visual + label

**Nang cap 3: Goi y nhanh dong phia tren input**

**File moi**: `src/components/topic/chatbot/SmartInputSuggestions.tsx`
- Dong goi y nho (pill chips) phia tren input, dua tren output gan nhat cua agent
- Lay tu `suggestedFollowUps` cua message cuoi cung
- Click chip → dien vao input
- Auto-hide khi user bat dau go

**File sua**: `src/components/topic/chatbot/ChatInputArea.tsx`
- Them prop `smartSuggestions?: string[]`
- Render SmartInputSuggestions phia tren form

**File sua**: `src/components/topic/TopicAIChatbot.tsx`
- Tinh toan smartSuggestions tu message cuoi cung co suggestedFollowUps
- Truyen xuong ChatInputArea

---

### D. Right Sidebar — Doi Discovery thanh Agent Insights

**Hien tai**: Tab "Discovery" hien trending, suggestions, events.

**Nang cap**: Doi ten thanh "Agent Insights" + them 3 section moi, giu lai Discovery nhu 1 sub-section.

**File moi**: `src/components/topic/chatbot/AgentInsightsTab.tsx`
- Layout doc voi 4 section:

1. **Context Quality Meter** (da co component, chi can import)
   - Hien stacked bar voi breakdown: Brand Memory, Web Search, Conversation, Industry

2. **Active Agents Status**
   - Danh sach 5 agent voi trang thai: Online (xanh), Busy (vang pulse), Idle (xam)
   - Map tu progressSteps hien tai: agent dang active = Busy, da complete = Online, chua chay = Idle
   - Hien thoi gian thuc thi gan nhat

3. **Smart Suggestions**
   - Lay suggestedFollowUps tu message cuoi
   - Hien dang card nho voi nut "Gui"

4. **Token Usage**
   - Hien thanh progress don gian: da dung / budget session
   - Du lieu lay tu agentTurnInfo hoac uoc tinh tu so message

**File sua**: `src/components/topic/chatbot/ChatHeader.tsx`
- Doi label tab "Discovery" thanh "Insights" voi icon Brain thay vi Compass
- Giu logic activeView nhu cu

**File sua**: `src/components/topic/TopicAIChatbot.tsx`
- Khi activeView === 'discovery': render AgentInsightsTab thay vi DiscoveryTab
- Truyen cac props moi: progressSteps, lastPipelineSteps, messages (de lay suggestions), contextSources

**File sua**: `src/hooks/useChatUI.ts`
- Doi ten activeView type tu `'discovery'` thanh `'insights'` (hoac giu `'discovery'` de tranh breaking change)

---

### Tong hop file can tao/sua

| File | Hanh dong |
|------|-----------|
| `src/components/topic/chatbot/AgentPipelineBar.tsx` | Tao moi |
| `src/components/topic/chatbot/AgentMentionPopover.tsx` | Tao moi |
| `src/components/topic/chatbot/SmartInputSuggestions.tsx` | Tao moi |
| `src/components/topic/chatbot/AgentInsightsTab.tsx` | Tao moi |
| `src/components/topic/TopicAIChatbot.tsx` | Sua |
| `src/components/topic/chatbot/ChatInputArea.tsx` | Sua |
| `src/components/topic/chatbot/ChatMessageBubble.tsx` | Sua |
| `src/components/topic/chatbot/SimpleMessageList.tsx` | Sua |
| `src/components/topic/chatbot/ChatHeader.tsx` | Sua |
| `src/hooks/useChatUI.ts` | Sua |
| `src/components/topic/chatbot/index.ts` | Sua (export moi) |

### Thu tu implement

1. **AgentPipelineBar** (diem nhan lon nhat, doc lap)
2. **AgentInsightsTab** + ChatHeader tab rename
3. **ChatInputArea upgrades** (@ mention + nut Doi ngu + smart suggestions)
4. **ChatMessageBubble** live status
5. **TopicAIChatbot** + useChatUI tich hop tat ca

### Luu y
- Khong pha vo UI cu: tat ca nang cap la bo sung, khong xoa component hien tai
- Responsive: Mobile uu tien compact, desktop hien day du
- Giu gradient tim-hong, card bo tron, font hien dai nhu thiet ke hien tai
- AgentPipelineBar chi hien khi AI Pro Mode bat (supervisorEnabled)

