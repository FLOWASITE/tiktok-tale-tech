---
name: Telegram /generate Parity P1
description: telegram-webhook /generate 2-step picker (approval_mode) + topic-AI pool + audience/persona vào clarification_context; agent-pipeline forward topic_pool sang generate-campaign-strategy
type: feature
---

## Flow
```
/generate <prompt> [--auto|--plan]
  → P0: extract objectives + suggest-channels + target_post_count
  → P1: parallel { topic-ai pool (12s timeout), primary persona, suggest-channels }
  → enrich brand: target_audience, brand_positioning, tone_of_voice
  → if --auto/--plan flag → commitGenerateDraft luôn
  → else → in-memory draft Map (TTL 10p) + inline keyboard "Review plan first / Auto-approve / Hủy"
  → callback gen:mode:auto|plan:<id> → commitGenerateDraft
```

## clarification_context shape (Telegram /generate goal)
```json
{
  "telegram_ai_extracted": {...},
  "objectives": [...], "primary_objective": "awareness", "secondary_objectives": [...],
  "target_post_count": 6, "channel_frequencies": [{id, frequency}],
  "suggest_channels": { "reasoning", "ai_powered" },
  "target_audience": "...", "brand_positioning": "...", "tone_of_voice": "...",
  "primary_persona": { "name", "occupation", "pain_points", "desires", "communication_style" },
  "topic_pool": [{ "title", "hook", "key_message", "pillar", "category", "scores" }]
}
```

## Files
- `supabase/functions/telegram-webhook/index.ts`:
  - `generateDrafts: Map<id, GenerateDraft>` (TTL 10p) + `pruneGenerateDrafts`
  - `parseApprovalModeFlag()` parse `--auto` / `--plan`
  - `mapObjectiveToContentGoal()` mirror GoalWizard
  - `fetchTopicPoolForTelegram()` invoke `topic-ai` action=suggest, race 12s timeout
  - `fetchPrimaryPersona()` query `customer_personas` ưu tiên `is_primary`
  - `getBrandContextById` SELECT thêm `target_audience, brand_positioning`
  - `handleGenerate` chia 2 step: prep + mode picker
  - `commitGenerateDraft` insert goal + trigger pipeline
  - `handleGenerateModeCallback` xử lý `gen:mode:*` / `gen:cancel`
- `supabase/functions/agent-pipeline/index.ts`:
  - `trigger_from_goal` (sync + async): forward `clarification_context.topic_pool` → strategy body `topic_pool`

## Edge cases
- topic-ai timeout/empty → pool=[], strategy tự sinh title.
- Persona thiếu → bỏ field.
- Draft hết TTL → callback trả "Phiên đã hết hạn".
- Callback từ user khác draft owner → từ chối.
- Picker message edit fail → gửi tin mới.

## Không làm
- Không sửa `topic-ai`, `generate-campaign-strategy`, `_shared/`.
- Không tạo DB table cho draft (in-memory đủ).
- Không persona picker UI (chỉ auto-pick primary).
