

## Vấn đề

Khi refine topic, `contentGoal` không được truyền xuống backend → AI không biết mục tiêu là "Chuyển đổi" nên gợi ý topic theo góc nhìn ngẫu nhiên (giáo dục, nhận diện...) thay vì bán hàng.

**Chuỗi thiếu:**
1. `MultiChannelFormWizard` gọi `useTopicRefinement` nhưng không truyền `contentGoal`
2. `useTopicRefinement` không nhận `contentGoal` → không truyền cho `useTopicAI`
3. `useTopicAI.fetchRefinements()` gọi edge function `topic-ai` action=refine nhưng không gửi `contentGoal`
4. Backend `handleRefine()` không inject `contentGoal` vào prompt

## Giải pháp: Truyền contentGoal xuyên suốt chuỗi refine

### 1. `src/hooks/useTopicRefinement.ts`
- Thêm `contentGoal?: ContentGoal` vào options interface
- Truyền xuống `useTopicAI({ brandTemplateId, contentGoal, enabled })`

### 2. `src/hooks/ai/useTopicAI.ts` — `fetchRefinements()`
- Thêm `contentGoal` vào body request gọi `topic-ai`:
```ts
body: {
  action: 'refine',
  rawTopic: rawTopic.trim(),
  videoType,
  brandTemplateId,
  contentGoal,  // ← THÊM
}
```

### 3. `src/components/multichannel/MultiChannelFormWizard.tsx`
- Truyền `contentGoal: formData.contentGoal` vào `useTopicRefinement`

### 4. `supabase/functions/topic-ai/index.ts` — `handleRefine()`
- Inject `contentGoal` vào prompt:
```
## CONTENT GOAL
The user's content goal is: "${contentGoal}".
- conversion → Focus on sales angles, pain points, offers, urgency, CTA
- education → Focus on tips, how-to, knowledge sharing
- awareness → Focus on brand story, introduction, viral potential
- engagement → Focus on interaction, debate, community
- expertise → Focus on authority, data, insights
ALL refined topics MUST align with this goal.
```

### Files cần sửa
- `src/hooks/useTopicRefinement.ts`
- `src/hooks/ai/useTopicAI.ts`
- `src/components/multichannel/MultiChannelFormWizard.tsx`
- `supabase/functions/topic-ai/index.ts`

