

## Tăng cường ảnh hưởng Mục tiêu nội dung lên Ý tưởng chủ đề

### Vấn đề
Khi user đổi Mục tiêu nội dung (education → conversion...), ý tưởng chủ đề AI tạo ra không phản ánh rõ ràng mục tiêu đã chọn. Nguyên nhân:

1. **Prompt yếu**: Trong `buildSuggestPrompts`, mục tiêu chỉ là 1 dòng nhỏ trong user prompt (`Mục tiêu: giáo dục`), không có ràng buộc bắt buộc như action `refine` (có `MANDATORY CONTENT GOAL`)
2. **SWR giữ data cũ**: Khi đổi goal, suggestions cũ vẫn hiển thị trong lúc fetch mới — user thấy kết quả không khớp goal
3. **Thiếu contentGoal prop**: `MultiChannelForm` không truyền `contentGoal` vào `TopicSuggestionPanel` (dù data đúng, nhưng thiếu context cho UI hiển thị)

### Thay đổi

**File 1: `supabase/functions/topic-ai/index.ts`** — Tăng cường prompt

Thêm ràng buộc bắt buộc trong `buildSuggestPrompts`:
- Thêm section `⚠️ MANDATORY CONTENT GOAL` vào system prompt (tương tự refine action)
- Map mỗi goal sang hướng dẫn cụ thể: conversion → ưu tiên BOFU/sales topics, education → TOFU/how-to, awareness → brand storytelling...
- Thêm constraint: "Topics không phù hợp mục tiêu sẽ bị REJECT"
- Điều chỉnh funnel balance theo goal (vd: conversion → 60% BOFU, education → 60% TOFU)

**File 2: `src/hooks/ai/useTopicAI.ts`** — Cải thiện UX khi đổi goal

- Khi `contentGoal` thay đổi: clear old suggestions ngay (không giữ stale data) và hiện loading
- Giúp user thấy rõ hệ thống đang tạo lại suggestions mới theo goal mới

**File 3: `src/components/MultiChannelForm.tsx`** — Truyền contentGoal

- Thêm `contentGoal={contentGoal}` vào `TopicSuggestionPanel` tại line 472

### Chi tiết kỹ thuật

**Prompt enhancement** (topic-ai/index.ts):
```
## ⚠️ MỤC TIÊU BẮT BUỘC: "${contentGoal}"
${goalConstraints[contentGoal]}
- TẤT CẢ topics PHẢI phục vụ mục tiêu "${contentGoal}"
- Topics không phù hợp mục tiêu sẽ bị LOẠI BỎ
```

Với `goalConstraints` map chi tiết cho từng goal (conversion → CTA/pricing/offer topics, education → how-to/guide/tips...).

**SWR fix** (useTopicAI.ts):
```tsx
if (paramsKey !== suggestPrevParamsRef.current) {
  suggestHasLoadedRef.current = false;
  setAllSuggestions([]); // Clear stale data on goal change
  setSuggestLoading(true);
}
```

### Không thay đổi
- Database, các file khác

