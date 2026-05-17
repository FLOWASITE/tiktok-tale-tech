
# Multi-Objective Campaign (Phương án A)

Cho phép user chọn **tối đa 3 mục tiêu** trong Step 1 của GoalWizard, auto-pin **Primary** (cái đầu tiên chọn, có thể đổi), inject weight **Primary 70% / Secondary 30%** vào prompt AI campaign strategy. Chặn combo xung đột bằng `useStrategyValidation`.

## Scope

3 files: 1 frontend, 2 edge functions. Backward-compatible với data cũ (single `objective` string).

## 1. `src/components/agents/GoalWizard.tsx` — Frontend

### State refactor
Thay:
```ts
const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
```
Bằng:
```ts
const [objectives, setObjectives] = useState<string[]>([]); // max 3, [0] = primary
```
Helper:
- `primaryObjective = objectives[0] ?? null`
- `selectedObj = OBJECTIVES.find(o => o.id === primaryObjective)` (giữ tên cũ để tránh sửa các chỗ dùng `selectedObj.kpis`, `selectedObj.label`)
- Replace mọi `selectedObjective` → `primaryObjective` (cho industrySuggestions, ctaSuggestions, label hiển thị)

### Toggle handler
```ts
const toggleObjective = (id: string) => {
  setObjectives(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id);  // bỏ chọn
    if (prev.length >= 3) {
      toast.warning('Tối đa 3 mục tiêu / chiến dịch');
      return prev;
    }
    return [...prev, id];
  });
  setKpiTargets({}); // reset KPI khi đổi
};
const setPrimary = (id: string) => {
  setObjectives(prev => prev.includes(id) ? [id, ...prev.filter(x => x !== id)] : prev);
};
```

### UI (lines 774-825)
Card hiển thị:
- Click chưa chọn → thêm vào list (auto primary nếu là đầu tiên)
- Click đã chọn nhưng KHÔNG phải primary → set làm primary
- Click khi đã primary → bỏ chọn
- Badge "★ Chính" trên primary card (nền primary), badge "Phụ" trên secondary (muted)
- Hint dưới label: *"Chọn tối đa 3 mục tiêu. Mục tiêu chính nhận 70% trọng số nội dung."*

KPI section: chỉ render KPI của **primary objective** (giữ logic cũ với `selectedObj`).

### Validation
- `canNext (step 0)`: `name.trim() && objectives.length >= 1`
- Conflict guard (warning, không block): nếu chứa cả `awareness` + `revenue` → show alert *"Awareness + Revenue thường khó đạt cùng campaign. Cân nhắc tách 2 chiến dịch."*

### Payload
- `finalSubmit` (lines 496-512):
  ```ts
  if (objectives.length > 0) {
    briefContext.objectives = objectives;               // ['awareness','engagement']
    briefContext.primary_objective = objectives[0];     // 'awareness'
    briefContext.objective = objectives[0];             // backward-compat (single string)
    briefContext.objective_weights = { primary: 0.7, secondary: 0.3 };
  }
  ```
- `handleConfirmStep` (line 470): gửi `objectives` array + `primary_objective` thay vì `objective: selectedObj?.label` đơn lẻ. Smart-skip check: `hasObjective = objectives.length > 0`.

### Edit mode (line 338-353)
Khi `initialData.clarification_context.objectives` tồn tại → rehydrate; nếu chỉ có `objective` (legacy) → wrap thành `[objective]`.

## 2. `supabase/functions/clarify-campaign-intent/index.ts`

- Đọc thêm `objectives: string[]` + `primary_objective: string`. Giữ `objective` cũ làm fallback.
- Trong `strategicContext`: hiển thị `- Objectives: ${primary} (primary, 70%), ${secondaries.join(', ')} (secondary, 30%)`.
- Server fast-path completeness: dùng `objectives.length > 0 || objective` thay vì chỉ `objective`.
- Prompt nhắc AI: *"Campaign có 1 primary objective + tối đa 2 secondary. Không hỏi lại objective/audience."*

## 3. `supabase/functions/generate-campaign-strategy/index.ts` — Core AI weight injection

Trong `buildStrategyPrompt` (line 18-110):

### Extract trong `ctx` (line 39)
```ts
const objectives = Array.isArray(ctx.objectives) ? ctx.objectives as string[] : [];
const primaryObjective = typeof ctx.primary_objective === 'string'
  ? ctx.primary_objective
  : (objectives[0] || (typeof ctx.objective === 'string' ? ctx.objective : ''));
const secondaryObjectives = objectives.slice(1);
```

### Filter clarificationStr (line 33)
Thêm `objectives`, `primary_objective`, `objective_weights` vào filter list để không leak raw vào audience context.

### Thêm `objectivesSection` (sau briefSection ~line 59)
```ts
let objectivesSection = '';
if (primaryObjective) {
  objectivesSection = `\nCAMPAIGN OBJECTIVES (weighted):
- PRIMARY: ${primaryObjective} → drives 70% of pieces (tone, CTA strength, content_role distribution)
- SECONDARY: ${secondaryObjectives.length ? secondaryObjectives.join(', ') + ' → 30% as supporting angles' : '(none)'}

OBJECTIVE WEIGHTING RULES:
- ~70% of pieces must directly serve the PRIMARY objective in their hook + CTA.
- ~30% may serve secondary objectives as bridge content (awareness → engagement → conversion).
- If primary = awareness/engagement → tilt content_role toward seed/sprout.
- If primary = leads/revenue → tilt content_role toward harvest.
- NEVER let secondary objectives dilute the primary message.\n`;
}
```

Inject vào template body (sau `${briefSection}`).

### Update Rule 3 (line 83-87)
Adjust content_role distribution dynamically:
- primary in [awareness, engagement] → seed 50% / sprout 35% / harvest 15%
- primary in [traffic, leads] → seed 30% / sprout 35% / harvest 35%
- primary = revenue → seed 25% / sprout 30% / harvest 45%
- primary = retention → seed 20% / sprout 50% / harvest 30%

Encode as text rule in prompt (AI sẽ tuân theo).

## Out of scope

- Không đổi DB schema (data lưu trong `agent_goals.clarification_context` JSONB sẵn có)
- Không sửa `agent-creator-v2` mapping (line 425) — vẫn dùng `content_role` từ strategy output
- Không sửa `agent-pipeline` (clarification_context pass-through nguyên vẹn)
- Không animation mới — giữ Soft Luxury hiện tại

## Verification

Sau khi triển khai, em sẽ kiểm: (1) build TS pass, (2) chọn 1/2/3 objectives → UI badge đúng, (3) đổi primary bằng click lại → reorder, (4) submit + check `clarification_context` payload có đủ 4 field mới, (5) inspect prompt log `generate-campaign-strategy` thấy `OBJECTIVE WEIGHTING RULES` block.
