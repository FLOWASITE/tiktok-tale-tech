

# Kế hoạch chi tiết: Autonomous Content Agents — Phase MVP

## Tổng quan

Xây dựng hệ thống Autonomous Content Agents cho Flowa, tận dụng tối đa hạ tầng hiện có (Graph Engine, Agents, Channel Publisher, Content Schedules). Phase MVP tập trung vào: **Orchestrator + Creator + Optimizer**, cho phép user đặt goal → AI tự tạo content blog tối ưu SEO+GEO → user approve → publish.

## Hạ tầng hiện có (tái sử dụng ~70%)

```text
✅ Graph Engine (DAG executor, checkpoint, continuation)
✅ Orchestrator (intent detection, plan compilation)
✅ Agent nodes: research, strategy, content, reviewer, governor, compliance, image
✅ Blackboard (vector memory, cross-session retrieval)
✅ Channel Publisher (8 platforms)
✅ Content Schedules + Calendar
✅ Brand Context (Brand DNA, Industry Packs, Personas)
✅ GEO Engine (scoring, schema, prompts)
✅ AI Gateway + cost tracking (ai_metrics)
```

## Phần cần xây mới

### Phase 1: Database Schema (Migration)

4 bảng mới:

**`agent_goals`** — Campaign/goal definitions
- id, organization_id, name, description
- target_topics (text[]), target_channels (text[])
- frequency (jsonb: {"blog": "3/week", "facebook": "daily"})
- autonomy_level: 'human_in_loop' | 'human_on_loop' | 'full_auto'
- brand_template_id (FK)
- is_active, is_paused
- created_by (FK profiles), created_at, updated_at

**`agent_pipelines`** — Per-content pipeline instances
- id, organization_id, goal_id (FK)
- content_title, content_topic
- current_stage: 'research' | 'creation' | 'optimization' | 'expansion' | 'compliance' | 'approval' | 'scheduled' | 'published' | 'analyzing'
- pipeline_state (jsonb — full stage outputs)
- priority: 'low' | 'normal' | 'high' | 'urgent'
- autonomy_level (inherited from goal, overridable)
- is_flagged, flag_reason
- content_id (FK multichannel_contents — linked after creation)
- estimated_completion (timestamptz)
- completed_at, created_at, updated_at

**`agent_logs`** — Execution audit trail
- id, pipeline_id (FK), agent_name, action
- input_summary, output_summary
- tokens_used, cost_usd, duration_ms
- error_message, created_at

**`agent_approvals`** — Human approval queue
- id, pipeline_id (FK), organization_id
- content_preview, channel_versions (jsonb)
- scores (jsonb: {seo, geo, compliance})
- status: 'pending' | 'approved' | 'rejected' | 'edited'
- reviewer_id, reviewer_notes, decided_at, created_at

RLS: Tất cả bảng filter theo `organization_id` qua `is_org_member()`.
Realtime: Enable cho `agent_pipelines` và `agent_approvals`.

### Phase 2: Backend — Pipeline Orchestrator Edge Function

**`supabase/functions/agent-pipeline/index.ts`** — Main pipeline executor
- Nhận trigger từ: Goal creation, cron schedule, hoặc manual
- Cho mỗi content piece trong goal:
  1. Tạo `agent_pipelines` record (stage: 'research')
  2. Gọi `runOrchestrator()` với template `full_pipeline` — tái sử dụng toàn bộ Graph Engine hiện có
  3. Sau khi graph complete → extract outputs → update pipeline_state
  4. Nếu autonomy = human_in_loop → tạo `agent_approvals` record, pause
  5. Nếu human_on_loop → auto-advance, tạo approval để review sau
  6. Nếu full_auto → advance thẳng đến publish

**`supabase/functions/agent-approve/index.ts`** — Handle approval actions
- Approve: resume pipeline → trigger expansion + scheduling
- Reject: update pipeline status, log feedback
- Edit: open content in editor, re-submit

**Cron job** (pg_cron):
- Mỗi giờ: scan `agent_goals` active → check frequency → trigger pipeline cho content mới nếu đến hạn

### Phase 3: Frontend — 3 trang mới

**Trang `/agents` — Agent Dashboard**
- Pipeline Kanban view (reuse `TasksKanbanBoard` pattern):
  Research → Creating → Optimizing → Expanding → Compliance → Approval → Scheduled → Published
- Mỗi card: title, channels, current agent, ETA, status
- Agent status sidebar: trạng thái từng agent (active/waiting/flagged)
- Quick actions: New Campaign, Pause All, View Approvals
- Realtime updates via Supabase channel subscription

**Goal Setting Wizard (dialog/modal)**
- Step 1: Mục tiêu — name, volume (bài/tuần), topics
- Step 2: Kênh — chọn channels + frequency per channel
- Step 3: Autonomy — chọn level (3 cấp), có thể set per-channel
- Step 4: Brand — confirm brand template, voice, industry pack
- Step 5: Preview calendar tuần đầu → Launch

**Approval Queue (tab trong `/agents` hoặc standalone)**
- List content chờ approve với: preview, SEO/GEO scores, compliance status
- Actions: Approve / Edit / Reject (with feedback)
- Bulk approve support
- Badge count trong sidebar navigation

### Phase 4: Integration Points

**Kết nối với hệ thống hiện có:**
- Content tạo bởi agent → lưu vào `multichannel_contents` (cùng bảng với wizard)
- Schedule → dùng `content_schedules` hiện có
- Publish → dùng `channel-publisher` hiện có
- GEO scoring → gọi `geo-score-content` hiện có
- Brand context → `fetch_brand_context_batch()` (DB function đã có)
- Compliance → compliance-node đã có trong graph

### Phase 5: Sidebar Navigation

- Thêm menu item "AI Agents" với icon Bot
- Badge hiển thị số approval pending
- Sub-items: Dashboard, Campaigns (goals), Approvals

## Files cần tạo/sửa

| File | Loại | Mô tả |
|------|------|--------|
| Migration SQL | Tạo | 4 bảng + RLS + realtime |
| `supabase/functions/agent-pipeline/index.ts` | Tạo | Pipeline executor |
| `supabase/functions/agent-approve/index.ts` | Tạo | Approval handler |
| `src/pages/AgentDashboard.tsx` | Tạo | Main dashboard |
| `src/components/agents/GoalWizard.tsx` | Tạo | Goal setup wizard |
| `src/components/agents/PipelineKanban.tsx` | Tạo | Pipeline Kanban view |
| `src/components/agents/ApprovalQueue.tsx` | Tạo | Approval list |
| `src/components/agents/AgentStatusPanel.tsx` | Tạo | Agent status sidebar |
| `src/hooks/useAgentGoals.ts` | Tạo | CRUD goals |
| `src/hooks/useAgentPipelines.ts` | Tạo | Pipeline data + realtime |
| `src/hooks/useAgentApprovals.ts` | Tạo | Approval queue data |
| `src/types/agent.ts` | Tạo | TypeScript types |
| `src/components/AppSidebar.tsx` | Sửa | Thêm menu AI Agents |
| `src/App.tsx` | Sửa | Thêm route /agents |

## Thứ tự triển khai (ước tính 8-10 lượt)

1. **Database migration** — 4 bảng + RLS + realtime
2. **Types + hooks** — agent.ts, useAgentGoals, useAgentPipelines, useAgentApprovals
3. **Agent Dashboard page** — layout, routing, sidebar menu
4. **Pipeline Kanban** — hiển thị pipelines theo stage
5. **Goal Setting Wizard** — 5-step wizard
6. **Backend: agent-pipeline** — edge function kết nối Graph Engine
7. **Backend: agent-approve** — approval handler
8. **Approval Queue UI** — list + actions
9. **Cron job** — auto-trigger pipelines theo schedule
10. **Integration test** — end-to-end flow

## Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| Edge Function timeout (60s) | Đã có continuation pattern trong Graph Engine |
| Cost overrun | Token budget system đã có, thêm cost tracking per pipeline |
| Content quality inconsistent | Governor + Reviewer nodes đã có trong graph |

