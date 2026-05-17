## Mục tiêu P1

Đưa Telegram `/generate` lên ngang hàng GoalWizard ở 3 chiều còn thiếu sau P0:

1. **Topic AI pool** — gọi `topic-ai` curate chủ đề trước khi trigger pipeline, inject vào strategy (giống flow GoalWizard).
2. **Audience + persona context** — merge `target_audience` (brand) + persona signals vào `clarification_context` để strategy & quality agent dùng.
3. **User-select `approval_mode`** — cho phép user chọn `auto` vs `approve_plan` thay vì hard-code.

## Vấn đề hiện tại

- `handleGenerate` (telegram-webhook) tạo goal → trigger `agent-pipeline trigger_from_goal` ngay → bỏ qua bước topic-ai (GoalWizard có `fetchTopicPool` → inject vào `previewSchedule`).
- `agent-pipeline trigger_from_goal` gọi `generate-campaign-strategy` mà không truyền `topic_pool` (strategy đã hỗ trợ field này — line 237).
- `clarification_context` chỉ có `telegram_ai_extracted` + objectives/post_count (sau P0); chưa có `target_audience`, `brand_positioning`, `tone_of_voice`, persona hint.
- `approval_mode` hard-code `"approve_plan"` ở line 1331; user không có cách đổi qua Telegram.

## Kiến trúc mới

```text
/generate <prompt>
  ↓ P0 (đã có): extract objectives + suggest-channels
  ↓ P1.1: fetch topic-ai pool (best-effort, 12s timeout)
  ↓ P1.2: enrich brand → merge audience/persona vào clarification_context
  ↓ P1.3: hiển thị inline keyboard "Approval mode" (default: Review plan)
  ↓ User tap mode → insert goal với approval_mode + topic_pool trong clarification_context
  ↓ triggerPipeline → agent-pipeline forward clarification_context.topic_pool → strategy
```

## Thay đổi chi tiết

### P1.1 — Topic AI pool trong telegram-webhook

`supabase/functions/telegram-webhook/index.ts`:

- Thêm helper `fetchTopicPoolForTelegram(supabase, { brandTemplateId, organizationId, primaryObjective, categoryHint })`:
  - Reuse logic của `GoalWizard.fetchTopicPool` (map objective → contentGoal: awareness/engagement/lead-gen/sales/community/education).
  - Invoke `supabase.functions.invoke('topic-ai', { action: 'suggest', brandTemplateId, organizationId, contentGoal, industry, format: 'all', categoryHint, forceRefresh: false })`.
  - Race với timeout 12s; fail-silent → `[]`.
  - Normalize giống GoalWizard: `{ title, hook, key_message, pillar, category, scores }`.
- Gọi sau khi đã có `extracted` + `activeBrandGen`, trước khi insert goal.

### P1.2 — Audience + persona vào clarification_context

`supabase/functions/telegram-webhook/index.ts`:

- Mở rộng `getBrandContextById` SELECT thêm: `target_audience`, `brand_positioning`, `unique_value_proposition` (đã có), `industry` (đã có).
- Query thêm 1 persona "primary" từ `customer_personas` theo `brand_template_id` (limit 1, order `created_at`).
- Mở rộng `clarification_context` payload trong `handleGenerate`:
  ```ts
  clarification_context: {
    telegram_ai_extracted: extracted,
    objectives, primary_objective, secondary_objectives,
    target_post_count, channel_frequencies, suggest_channels,
    // NEW
    target_audience: brand.target_audience || undefined,
    brand_positioning: brand.brand_positioning || undefined,
    tone_of_voice: brand.tone_of_voice || undefined,
    primary_persona: persona ? {
      name: persona.name,
      occupation: persona.occupation,
      pain_points: persona.pain_points,
      desires: persona.desires,
    } : undefined,
    topic_pool: pool.length > 0 ? pool : undefined, // ← P1.1 output
  }
  ```

### P1.3 — User-select approval_mode

UX: thay vì insert goal + trigger pipeline ngay, đổi `/generate` thành 2-step:

**Step 1**: gửi message tóm tắt extracted + inline keyboard:
```text
🎯 Đã hiểu: "<suggested_name>"
📊 Mục tiêu: <objectives joined>
📅 <duration_days>d · <target_post_count> bài
📡 Kênh: <channels joined>

Chọn chế độ vận hành:
```
Buttons:
- `✅ Auto-approve & run` → `gen:mode:auto:<draft_id>`
- `📝 Review plan first` (default highlight) → `gen:mode:plan:<draft_id>`
- `❌ Hủy` → `gen:cancel:<draft_id>`

**Draft storage**: dùng in-memory `Map<draft_id, GenerateDraft>` (đã có pattern tương tự `pendingCampaignWizard` ở line 4054+). TTL 10 phút. Draft chứa toàn bộ extracted + topic_pool + brand context để Step 2 không cần fetch lại.

**Step 2** (callback handler `gen:mode:*`):
- Insert goal với `approval_mode` từ choice.
- Trigger pipeline như cũ.
- Edit message ban đầu thành `✅ Goal "<name>" đã nhận. Mode: <mode>. AI đang chạy...`.

**Lệnh tắt** (skip Step 1): `/generate --auto <prompt>` hoặc `/generate --plan <prompt>` → bỏ qua keyboard, dùng mode chỉ định.

### P1.4 — agent-pipeline forward topic_pool

`supabase/functions/agent-pipeline/index.ts` (action `trigger_from_goal`, 2 chỗ: sync line 544, async line 569):

```ts
const clarCtx = goal.clarification_context || {};
const topicPool = Array.isArray(clarCtx.topic_pool) ? clarCtx.topic_pool : undefined;

await callFunction(..., "generate-campaign-strategy", {
  goal_id: goal.id,
  // ... existing fields
  clarification_context: clarCtx,
  topic_pool: topicPool,                    // NEW
  organization_id: goal.organization_id,
});
```

Strategy đã handle `topic_pool` từ trước (line 237) → không cần đổi.

## Files sẽ chỉnh

```text
supabase/functions/telegram-webhook/index.ts
  - thêm fetchTopicPoolForTelegram()
  - mở rộng getBrandContextById SELECT
  - query customer_personas (1 persona)
  - tách handleGenerate thành showGenerateModePicker + commitGenerateDraft
  - callback handler gen:mode:auto|plan, gen:cancel
  - parse --auto / --plan flag trong prompt

supabase/functions/agent-pipeline/index.ts
  - trigger_from_goal: forward topic_pool từ clarification_context (sync + async branch)
```

## Edge cases

- **topic-ai timeout/empty** → pool=[], strategy tự sinh title như cũ (đã có fallback path).
- **Persona không có** → bỏ field, không block.
- **Draft TTL hết** → callback trả "❌ Draft đã hết hạn, gõ /generate lại."
- **User không tap mode trong 5 phút** → message vẫn hiển thị; tap sau vẫn work nếu draft còn TTL.
- **`--auto` cho user free tier** → check quota như cũ; nếu fail, dùng `approve_plan` + báo "Tier free không bật auto, đã chuyển sang Review."
- **Callback từ user khác** → verify `chatId` + `telegramUserId` khớp draft owner.
- **Pipeline trigger lỗi 402/429** → giữ messaging hiện có (đã handle ở P0).

## Không làm

- KHÔNG đổi `topic-ai` hay `generate-campaign-strategy`.
- KHÔNG thêm DB table cho draft (in-memory đủ — pattern giống `pendingCampaignWizard`).
- KHÔNG mở persona picker UI (chỉ auto-pick primary).
- KHÔNG đụng `handleGenerateSingle` (đã đơn giản, scope khác).
- KHÔNG thay đổi `_shared/`.

## Validation sau khi build

1. `/generate viết 3 bài về kem chống nắng cho spa` → thấy summary + 3 buttons.
2. Tap "Review plan first" → goal có `approval_mode='approve_plan'`, `clarification_context.topic_pool.length>0`, `clarification_context.target_audience` có giá trị.
3. Tap "Auto-approve & run" → goal có `approval_mode='auto'`.
4. `/generate --auto ...` → skip keyboard, chạy thẳng mode auto.
5. Check `agent_pipelines` rows → strategy đã pick title từ topic_pool (compare với `clarification_context.topic_pool[*].title`).
