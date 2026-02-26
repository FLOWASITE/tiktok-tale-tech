
# Sprint 11: Multi-Agent UI/UX Enhancement

Sau khi review toan bo 15+ component lien quan den Multi-Agent chat, day la cac van de UX chinh va giai phap de xuat.

---

## Phan tich Hien trang

### Da co (tot):
- AgentPipelineBar: thanh trang thai agent theo thoi gian thuc
- AgentAttributionBar: badge attribution tren moi tin nhan
- AgentInsightsTab: sidebar hien thi context quality + agent status
- ReviewScoreCard: diem chat luong voi confetti animation
- TopicSuggestionsCard: danh sach topic tu Research Agent
- @ Mentions: tag agent cu the
- Smart Suggestions: goi y follow-up tu dong

### Van de UX can cai thien:

| # | Van de | Muc do |
|---|--------|--------|
| 1 | Pipeline bar mat sau khi streaming xong, khong co "session summary" tong ket | P1 |
| 2 | AgentInsightsTab chi co 5 agent cung (thieu Governor, Compliance, Brand Memory) | P1 |
| 3 | Khong co Agent Timeline view — nguoi dung khong biet agent nao chay truoc/sau | P1 |
| 4 | Header qua nhieu icon nho, kho phan biet chuc nang tren mobile | P2 |
| 5 | Khong co "Workflow Preview" truoc khi gui — nguoi dung khong biet AI se lam gi | P2 |
| 6 | Review Score khong co so sanh voi lan truoc (no delta tracking) | P2 |

---

## De xuat 6 Cai tien

### Enhancement 1: Agent Session Summary Card (P1)

**Van de:** Sau khi tat ca agent hoan thanh, nguoi dung chi thay noi dung cuoi — khong co tong ket quy trinh.

**Giai phap:** Tao component `AgentSessionSummary` hien thi khi tat ca steps "complete":
- Tong thoi gian xu ly
- So agent da chay va thoi gian moi agent
- Context richness score
- Nut "Xem chi tiet" mo Insights tab

**Vi tri:** Hien thi ngay tren tin nhan assistant cuoi cung, duoi AgentPipelineBar.

**File moi:** `src/components/topic/chatbot/AgentSessionSummary.tsx`

```text
+------------------------------------------+
|  Hoan thanh trong 12.3s                  |
|  [Research 2.1s] [Strategy 1.8s]         |
|  [Content 5.2s] [Reviewer 2.4s]         |
|  Context: 78/100  |  Xem chi tiet >>    |
+------------------------------------------+
```

---

### Enhancement 2: Dong bo AgentInsightsTab voi AGENT_CONFIG day du (P1)

**Van de:** `AgentInsightsTab` chi hien thi 5 agent (Research, Strategy, Content, Visual, Reviewer), trong khi `AgentPipelineBar` ho tro 8 agent (them Governor, Compliance, Brand Memory).

**Giai phap:** Cap nhat `AGENTS` constant trong `AgentInsightsTab.tsx` de khop voi `AGENT_CONFIG` tu `AgentPipelineBar.tsx` — them Brain (Brand Memory), Shield (Compliance), Gauge (Governor).

**File sua:** `src/components/topic/chatbot/AgentInsightsTab.tsx`

---

### Enhancement 3: Agent Timeline View (P1)

**Van de:** Nguoi dung khong thay duoc thu tu thuc thi cua cac agent (parallel vs sequential).

**Giai phap:** Tao component `AgentTimeline` hien thi dang Gantt chart don gian:
- Moi agent la mot thanh ngang
- Chieu dai thanh = thoi gian thuc thi
- Vi tri X = thoi diem bat dau (tuong doi)
- Mau sac theo trang thai (active/complete/error)
- Hien thi trong Insights tab, thay the hoac bo sung cho danh sach agent hien tai

**File moi:** `src/components/topic/chatbot/AgentTimeline.tsx`

```text
Research   |======|
Brand Mem  |====|
Compliance |===|
Strategy          |=======|
Content                    |=============|
Reviewer                                  |====|
Governor                                        |==|
           0s    2s    4s    6s    8s   10s   12s
```

---

### Enhancement 4: Workflow Preview Tooltip (P2)

**Van de:** Khi nguoi dung nhan "Giao cho Doi ngu", khong biet se co nhung agent nao tham gia.

**Giai phap:** Truoc khi gui, hien thi mot tooltip/popover nho cho thay workflow se duoc thuc thi:
- Hien thi khi hover len nut "Giao cho Doi ngu"
- Noi dung: danh sach agent se chay dua tren noi dung input (regex matching giong Orchestrator)
- Kiem tra: co web search? co image? co compliance?

**File sua:** `src/components/topic/chatbot/ChatInputArea.tsx` — them WorkflowPreviewTooltip

---

### Enhancement 5: Responsive Header Redesign (P2)

**Van de:** Header hien tai co 7 icon buttons lien tiep, tren mobile rat kho bam va kho phan biet.

**Giai phap:**
- Mobile: gom cac nut phu (sound, help, search, artifacts) vao mot dropdown menu "..."
- Chi giu lai: AI Pro Mode toggle, History, va Reset
- Desktop: giu nguyen layout hien tai

**File sua:** `src/components/topic/chatbot/ChatHeader.tsx`

```text
Mobile layout:
[Bot icon] Flowa Mind [AI]    [Brain] [History] [...menu]

Desktop layout (giu nguyen):
[Bot icon] Flowa Mind [AI]    [Brain] [History] [Search] [Sound] [Help] [Artifacts] [Reset]
```

---

### Enhancement 6: Review Score Delta Tracking (P2)

**Van de:** Khi nguoi dung yeu cau "cai thien", khong co cach so sanh diem moi voi diem cu.

**Giai phap:** Trong `ReviewScoreCard`, them hien thi delta khi tin nhan truoc cung co review scores:
- Hien thi mui ten len/xuong voi so diem thay doi
- Mau xanh cho tang, do cho giam
- Luu previous scores qua message context

**File sua:** `src/components/topic/chatbot/ReviewScoreCard.tsx`, `src/components/topic/chatbot/SimpleMessageList.tsx` (truyen previous scores)

---

## Thu tu Thuc hien

| Buoc | Enhancement | Effort | Impact |
|------|-------------|--------|--------|
| 1 | #2 Dong bo InsightsTab agents | Thap | Fix data inconsistency |
| 2 | #1 Session Summary Card | Trung binh | Transparency + trust |
| 3 | #3 Agent Timeline | Trung binh | Power user visibility |
| 4 | #5 Responsive Header | Thap | Mobile UX |
| 5 | #4 Workflow Preview | Thap | Expectation setting |
| 6 | #6 Review Score Delta | Thap | Iteration feedback |

---

## Technical Notes

### Enhancement 1 - AgentSessionSummary
- Derive data tu `displayPipelineSteps` trong TopicAIChatbot.tsx
- Chi hien thi khi `steps.every(s => s.status === 'complete')` va `!isLoading`
- Component con, render giua AgentPipelineBar va SimpleMessageList

### Enhancement 3 - AgentTimeline
- Can them `startTime` vao `ProgressStep` type (hien chi co `duration`)
- Tinh tuong doi: agent dau tien startTime = 0, cac agent sau = sum of predecessors
- Hoac estimate tu thu tu complete events

### Enhancement 5 - Header Responsive
- Dung `DropdownMenu` tu radix cho mobile overflow menu
- Breakpoint: `sm:` (640px) — duoi do gom vao dropdown
- Khong thay doi desktop layout
