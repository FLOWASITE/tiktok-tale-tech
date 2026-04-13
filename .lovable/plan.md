

# Chat Agent → Dùng trực tiếp 5 Agent Pipeline

## Vấn đề
`AgentPipelineBar.tsx` và `AgentAttributionBar.tsx` vẫn dùng hệ thống 9 agent cũ (orchestrator, research, brand_memory, compliance, strategy, content, visual, reviewer, governor). Cần thay thế hoàn toàn bằng 5 agent của Pipeline: **Strategy, Creator, Quality, Approval, Publisher**.

## Thay đổi

### 1. `AgentPipelineBar.tsx` — Thay AGENT_CONFIG

Xóa 9 agent cũ, thay bằng 5 agent Pipeline với icon + naming thống nhất từ `AgentDirectoryPage`:

```text
Strategy  (Lightbulb)  → matchIds: orchestrator, research, brand_memory, strategy
Creator   (PenTool)    → matchIds: content, image, visual
Quality   (ShieldCheck)→ matchIds: compliance, reviewer, governor, quality
Approval  (CheckCircle2)→ matchIds: approval
Publisher (Send)       → matchIds: publisher, publish
```

Logic `getStepForAgent` giữ nguyên — backend vẫn gửi node IDs cũ, nhưng UI gom nhóm hiển thị 5 pill thay vì 9. Khi agent active, sub-label hiển thị node con đang chạy.

### 2. `AgentAttributionBar.tsx` — Thay AGENT_CONFIG

Thay 6 agent config cũ (research-agent, strategy-agent, content-agent, reviewer-agent, image-agent, brand-memory-agent) bằng 5 agent Pipeline với icon/color matching.

### 3. `AgentSessionSummary.tsx` — Không cần sửa

Component này render generic từ `steps[]`, không hardcode agent names.

### Files

| File | Thay đổi |
|------|----------|
| `src/components/topic/chatbot/AgentPipelineBar.tsx` | Thay AGENT_CONFIG 9→5, cập nhật imports |
| `src/components/topic/chatbot/AgentAttributionBar.tsx` | Thay AGENT_CONFIG 6→5, cập nhật imports |

