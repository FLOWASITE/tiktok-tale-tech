---
name: Campaign Topic AI Integration
description: GoalWizard pre-fetch topic-ai pool → inject vào generate-campaign-strategy prompt → strategy AI bắt buộc pick title từ pool + pool_index; auto-save planned pieces vào topic_history
type: feature
---

# Campaign Topic AI Integration

## Flow
```
GoalWizard.triggerSchedulePreview
  → fetchTopicPool() invokes `topic-ai` (action: 'suggest', contentGoal map từ primary_objective, categoryHint = campaign title)
  → pool [{title, hook, key_message, pillar, scores}]
  → previewSchedule.run({ ..., topic_pool })
  → generate-campaign-strategy builds TOPIC POOL block in system prompt với rule "MUST pick from pool, set pool_index"
  → tool schema có pool_index?: number
  → AI trả plan có pool_index trỏ về pool gốc
GoalWizard.finalSubmit
  → sau khi onGenerateStrategy thành công, batch insert vào topic_history
    (usage_status='planned', category=pillar||angle, scores từ pool[pool_index-1])
```

## Fallback
- Pool rỗng (timeout, brand chưa setup) → strategy AI tự sinh title như cũ, badge "AI tự sinh" hiển thị thay vì "🧠 Topic AI".
- topic_history insert lỗi → fail-silent, không block campaign creation.

## UI cues
- Loading 2-phase: `topicPoolPhase = 'topics'` → "🧠 Topic AI đang chọn chủ đề…" sau đó `'schedule'` → "📅 Đang sắp N bài (từ pool X chủ đề)…"
- Badge cạnh "Lịch nội dung chi tiết": **🧠 Topic AI** (pool>0) hoặc **AI tự sinh** (pool=0).

## Files
- `src/components/agents/GoalWizard.tsx` — fetchTopicPool, mapObjectiveToContentGoal, topic_history auto-save
- `src/hooks/agents/usePreviewSchedule.ts` — PreviewRequest.topic_pool
- `supabase/functions/generate-campaign-strategy/index.ts` — buildStrategyPrompt.topicPool, tool schema pool_index, normalization clamp 60

## Không làm
- KHÔNG upgrade `PieceTopicSuggestPopover` (vẫn dùng `suggest-piece-topics` — scope khác).
- KHÔNG đổi schema `topic_history`.
