

# Redesign Bước "Mục tiêu" — GoalWizard

## Phân tích

Hiện tại Step 0 chỉ có 2 fields (tên + textarea). User muốn redesign toàn diện với 7 nhóm tính năng mới. Nhiều tính năng đã tồn tại ở steps sau (Content Pillars ở step 1, Duration ở step 3, Autonomy ở step 4) — cần tổ chức lại wizard để tránh trùng lặp.

## Kế hoạch tổ chức lại Wizard

Thay vì nhồi tất cả vào 1 step, tổ chức lại thành **5 bước rõ ràng hơn** (giảm từ 7 → 5):

| Bước | Tên | Nội dung |
|------|-----|----------|
| 0 | **Mục tiêu** | Tên campaign + 6 Objective Cards (Awareness/Engagement/Traffic/Leads/Revenue/Retention) với KPI targets tự động + Textarea mục tiêu bổ sung |
| 1 | **Chiến lược** | Budget input + phân bổ Content/Ads/KOL sliders (mới) + Content Pillars sliders (từ step 1 cũ) + Key Messages + CTA (từ step 1 cũ) + Duration quick-select (từ step 3 cũ) |
| 2 | **Kênh** | Giữ nguyên: chọn kênh + tần suất |
| 3 | **Tự động** | Autonomy level + Approval mode (gộp từ step 3+4 cũ) + Smart Auto-Approve + Advanced settings (brand voice threshold, learning speed) |
| 4 | **Xác nhận** | Review tổng hợp + AI Preview panel (dự kiến số bài, phân bổ kênh, timeline) + Liên kết brand/campaign (từ step 5 cũ) |

## Chi tiết kỹ thuật

### Step 0 — Mục tiêu (Redesign hoàn toàn)

**6 Objective Cards** dạng grid 2x3, mỗi card có icon + label + description:
- 🎯 Tăng nhận biết (Awareness) → KPI: Reach, Impressions
- 💬 Tăng tương tác (Engagement) → KPI: Likes, Comments, Shares
- 🔗 Tăng traffic (Traffic) → KPI: Clicks, CTR
- 📋 Thu thập leads (Lead Gen) → KPI: Form fills, Signups
- 💰 Tăng doanh thu (Revenue) → KPI: Conversions, ROAS
- 🔄 Giữ chân KH (Retention) → KPI: Repeat rate, NPS

Khi chọn objective → hiện KPI target inputs tương ứng (1-2 fields). State mới: `selectedObjective`, `kpiTargets`.

### Step 1 — Chiến lược (Gộp + Bổ sung)

**Budget section (MỚI)**:
- Input ngân sách tổng (VNĐ)
- 3 sliders phân bổ: Content / Ads / KOL (tổng = 100%, auto-balance giống pillar logic)

**Content Pillars + Key Messages + CTA**: Di chuyển từ step 1 cũ, giữ nguyên UI.

**Duration**: Di chuyển quick-select cards từ step 3 cũ.

### Step 3 — Tự động (Gộp)

Gộp Approval Mode (từ step 3 cũ) + Autonomy Level + Smart Auto-Approve (từ step 4 cũ) + thêm:
- Brand voice threshold slider (mới)
- Learning speed selector (mới): Conservative / Balanced / Aggressive

### Step 4 — Xác nhận (Cải tiến)

**AI Preview Panel**: Card hiển thị dự kiến dựa trên inputs:
- Số bài dự kiến (tính từ duration × frequency)
- Phân bổ theo kênh (pie-like badges)
- Timeline preview (start → end)
- Objective + KPI summary

Gộp Brand template + Campaign selector vào đây (từ step 5 cũ).

## State mới cần thêm

```typescript
// Objective
selectedObjective: string | null  // 'awareness' | 'engagement' | ...
kpiTargets: Record<string, number>  // { reach: 10000, impressions: 50000 }

// Budget
totalBudget: number  // VNĐ
budgetAllocation: { content: number; ads: number; kol: number }  // % tổng = 100

// Advanced
brandVoiceThreshold: number  // 1-100
learningSpeed: 'conservative' | 'balanced' | 'aggressive'
```

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/agents/GoalWizard.tsx` | Tổ chức lại toàn bộ wizard: 5 steps, redesign step 0, gộp steps, thêm budget/objective/KPI/AI preview |

Không cần migration — tất cả data mới lưu vào `clarification_context` JSONB (đã có).

