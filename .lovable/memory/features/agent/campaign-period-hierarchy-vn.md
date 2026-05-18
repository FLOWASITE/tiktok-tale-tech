---
name: Campaign Period & Hierarchy
description: agent_goals có period_type (month/quarter/year/custom) + period_label + parent_goal_id; GoalWizard PeriodScopePicker auto-fill startDate/duration; CampaignDashboard hiển thị badge period + "thuộc: parent"
type: feature
---

## Schema
- `agent_goals.period_type` text DEFAULT 'custom' CHECK IN (month,quarter,year,custom)
- `agent_goals.period_label` text (vd "Tháng 11/2026", "Q4 2026")
- `agent_goals.parent_goal_id` uuid FK → agent_goals(id) ON DELETE SET NULL
- Trigger `validate_agent_goal_parent`: parent cùng org, không self-ref
- Index `idx_agent_goals_parent`, `idx_agent_goals_period`

## Frontend
- `src/lib/campaignPeriod.ts` — `computePeriodRange(type)` → startDate + durationDays + label
- `src/components/agents/PeriodScopePicker.tsx` — 4 nút Tháng/Quý/Năm/Tự chọn + Select parent
- `GoalWizard.tsx` Step "Khung thời gian": chọn period ≠ custom → auto set + disable date/duration inputs
- `CampaignDashboard.tsx` campaign card: badge `period_label` + "↳" prefix + badge "thuộc: {parent.name}"

## Behavior
- Backward compat: goal cũ mặc định `custom`, không đổi UI
- Khi periodType ≠ 'custom': khoá date input + duration grid, hint "tự động"
- Parent options chỉ list goals có period_type ≠ 'custom' (chỉ Tháng/Quý/Năm mới làm parent)
- V1 chỉ 1 cấp, không roll-up KPI
