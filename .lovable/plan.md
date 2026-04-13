

# Đồng bộ Chat Agent với 5-Agent Pipeline — Fix tận gốc

## Vấn đề

Screenshot cho thấy chat vẫn hiển thị 6 agent riêng lẻ (Điều phối, Nghiên cứu, Chiến lược, Nội dung, Kiểm duyệt, Kiểm soát chất lượng) thay vì 5 agent Pipeline. Nguyên nhân: `AgentPipelineBar` và `AgentAttributionBar` đã được cập nhật nhưng dữ liệu đầu vào (progress steps) vẫn tạo ra từng node riêng lẻ.

### Điểm chưa nhất quán

| Vị trí | Vấn đề |
|--------|--------|
| `useChatStreaming.ts` dòng 343-353 | `nodeLabels` map vẫn tạo step riêng cho từng node cũ (orchestrator, research, brand_memory...) |
| `ChatThinkingIndicator.tsx` dòng 68-80 | `getAgentIcon` map icon theo agent ID cũ |
| `AgentTimeline.tsx` | Grouping parallel/sequential theo node cũ (research, brand_memory, compliance) |

## Kế hoạch sửa

### 1. `useChatStreaming.ts` — Gom plan steps thành 5 agent

Thay `nodeLabels` map 9 node → dùng mapping giống `AgentPipelineBar`:

```text
Backend gửi: orchestrator, research, brand_memory, strategy, content, image, reviewer, governor, compliance
→ UI gom thành: Strategy, Creator, Quality, Approval, Publisher
```

Logic: khi nhận `graph_plan`, duyệt qua các step, xác định thuộc nhóm nào, chỉ tạo 1 `ProgressStep` cho mỗi nhóm (nếu chưa có). Khi nhận `node_start`/`node_end`, cập nhật step của nhóm tương ứng và set `subLabel` là tên node con đang chạy.

### 2. `ChatThinkingIndicator.tsx` — Cập nhật `getAgentIcon`

Thay icon map cũ bằng 5 icon Pipeline: Lightbulb (Strategy), PenTool (Creator), ShieldCheck (Quality), CheckCircle2 (Approval), Send (Publisher).

### 3. `AgentTimeline.tsx` — Cập nhật grouping

Thay `PARALLEL_AGENTS` và `PHASE_ZERO_AGENTS` bằng logic nhóm 5 agent. Timeline hiển thị 5 hàng thay vì 6-9 hàng riêng lẻ.

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useChatStreaming.ts` | Gom `nodeLabels` + plan step creation thành 5 nhóm; cập nhật `node_start`/`node_end` handlers |
| `src/components/topic/chatbot/ChatThinkingIndicator.tsx` | Cập nhật `getAgentIcon` map |
| `src/components/topic/chatbot/AgentTimeline.tsx` | Cập nhật grouping logic |

