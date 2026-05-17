
# Plan: Campaign Period & Hierarchy cho GoalWizard

Thêm cơ chế "Campaign theo khoảng thời gian" (Tháng/Quý/Năm/Tuỳ chỉnh) song song với "Campaign cụ thể user đặt tên", theo pattern Salesforce Parent-Child mà ta đã research.

## 1. Mục tiêu

- User chọn nhanh **scope thời gian** (tháng này / quý này / năm / tuỳ chỉnh) thay vì phải gõ số ngày.
- Cho phép gom nhiều campaign con dưới **1 parent campaign theo period** (vd: "Q1 2026 Brand Push" chứa "Tết Launch", "Valentine Push", "Spring Sale").
- Auto-fill `campaign_start_date` + `campaign_duration_days` từ period chọn.
- Hiển thị campaign con dưới parent ở Campaign Dashboard (roll-up đơn giản, không cần KPI roll-up ở v1).

## 2. Schema changes

Thêm 3 cột vào `agent_goals` (đây là bảng campaign chính của Agent system):

| Column | Type | Default | Mô tả |
|---|---|---|---|
| `period_type` | text | `'custom'` | enum: `'month' | 'quarter' | 'year' | 'custom'` |
| `period_label` | text | null | vd: `"Tháng 11/2026"`, `"Q4 2026"`, `"2026"` |
| `parent_goal_id` | uuid | null | FK → `agent_goals(id)`, ON DELETE SET NULL |

- CHECK constraint cho `period_type` (4 giá trị).
- Index `idx_agent_goals_parent` trên `(parent_goal_id)`.
- Self-FK: parent phải cùng `organization_id` (validate trigger, không CHECK vì cross-row).
- Không touch `industry_*` tables. RLS giữ nguyên (org-scoped).

## 3. GoalWizard UI changes

**Vị trí**: Step 2 (Khung thời gian) hiện tại, ngay phía trên block "Số ngày" và "Ngày bắt đầu".

Component mới: `<PeriodScopePicker />`

```
┌─ Phạm vi chiến dịch ─────────────────────────┐
│ ○ Tháng này (1/12 → 31/12)                   │
│ ○ Quý này   (Q4: 1/10 → 31/12)               │
│ ● Tự chọn (mặc định, giữ logic cũ)           │
└──────────────────────────────────────────────┘

[Nếu Tháng/Quý chọn]
  → auto set campaignStartDate = đầu kỳ
  → auto set campaignDurationDays = số ngày còn lại của kỳ
  → khoá 2 input dưới (disabled + hint "Tự động theo Tháng/Quý")

[Optional] Gắn vào campaign cha:
  <Select> Không có / [danh sách parent goals cùng period_type khác 'custom']
```

- Khi user click "Tháng này" → tính `startOfMonth(now)`, duration = `daysInMonth - dayOfMonth + 1`.
- Khi click "Quý này" → tính quarter hiện tại.
- "Tự chọn" giữ nguyên 100% logic hiện có (backward compat).
- `period_label` auto generate: `"Tháng 11/2026"` / `"Q4 2026"` / null khi custom.

## 4. Type & Hook changes

**`src/types/agent.ts`** — extend `AgentGoal`:
```ts
period_type: 'month' | 'quarter' | 'year' | 'custom';
period_label: string | null;
parent_goal_id: string | null;
```

**`src/hooks/useAgentGoals.ts`** — thêm 3 field vào `createGoal` mutation input + payload insert. Không đổi RLS query.

Thêm helper hook `useParentCampaignOptions()` → query `agent_goals` cùng org, `period_type IN ('month','quarter','year')`, sort `campaign_start_date DESC`.

## 5. Campaign Dashboard hiển thị hierarchy

`CampaignDashboard.tsx` (đã tồn tại):
- Nếu campaign có `parent_goal_id`, render indent + icon "↳" dưới parent.
- Parent row hiển thị badge `period_label` (vd "Q4 2026") + count `n campaign con`.
- Filter mới: "Theo Period" (group by `period_label`).

V1 không cần roll-up KPI — chỉ visual grouping. Roll-up budget/metrics để v2.

## 6. Edge function impact

Check `suggest-strategy`, `suggest-objectives`, `generate-campaign-strategy`:
- Pass thêm `period_type` + `period_label` vào prompt context → AI có thể tạo strategy phù hợp ("đây là campaign Quý → suggest mục tiêu dài hạn hơn vs Tháng → tactical").
- Không bắt buộc cho MVP; chỉ thêm field vào payload, prompt update là nice-to-have.

## 7. Migration order

1. Migration SQL (3 cột + index + CHECK).
2. Update `src/types/agent.ts` + `useAgentGoals.ts`.
3. Build `PeriodScopePicker` component.
4. Wire vào `GoalWizard.tsx` Step 2 (giữ "Tự chọn" mặc định = behavior cũ).
5. Update `CampaignDashboard.tsx` cho hierarchy display.
6. (Optional) Pass period vào edge functions.

## 8. Backward compatibility

- Toàn bộ goal cũ → `period_type = 'custom'`, `parent_goal_id = null` → UI render y hệt như trước.
- Không breaking changes ở edge functions (field mới đều optional/nullable).

## 9. Out of scope (v2)

- KPI roll-up từ child → parent.
- Auto-suggest parent dựa AI ("Campaign này có vẻ thuộc Q4 Brand Push?").
- Multi-level (parent của parent) — v1 chỉ 1 cấp.
- Cron auto-create "Tháng tới" parent campaign.

## Files sẽ chạm

- `supabase/migrations/<new>.sql` (mới)
- `src/types/agent.ts`
- `src/hooks/useAgentGoals.ts`
- `src/components/agents/PeriodScopePicker.tsx` (mới)
- `src/components/agents/GoalWizard.tsx` (Step 2 block)
- `src/components/agents/CampaignDashboard.tsx` (hierarchy render)
- (optional) `supabase/functions/suggest-strategy/index.ts`, `suggest-objectives/index.ts`

Bấm **Implement plan** để bắt đầu.
