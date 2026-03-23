

# Sửa lỗi Pipeline không chạy

## Nguyên nhân gốc

Khi tạo Goal, `target_topics` luôn là mảng rỗng `[]` (vì đã bỏ nhập topic thủ công ở GoalWizard). Trong `agent-pipeline` edge function, dòng 55:

```
for (const topic of (goal.target_topics || []))
```

Mảng rỗng → vòng lặp không chạy → **0 pipeline được tạo**.

## Giải pháp

Sửa `agent-pipeline/index.ts` — khi `target_topics` rỗng, tự tạo 1 pipeline dùng **tên goal + mô tả** làm topic seed, để Research Agent tự nghiên cứu và chọn topic.

### Thay đổi cụ thể

**`supabase/functions/agent-pipeline/index.ts`** — action `trigger_from_goal`:
- Nếu `target_topics` rỗng → dùng `[goal.name]` làm fallback topics
- Pipeline sẽ được tạo với `content_topic = goal.name`, `content_title = goal.name`
- Research Agent sẽ dùng tên + description của goal để tìm topic phù hợp

**Tương tự cho `check_scheduled_goals`** (dòng 228-229):
- Cùng logic fallback khi `topics.length === 0`

### Files

| File | Loại |
|------|------|
| `supabase/functions/agent-pipeline/index.ts` | Sửa — fallback khi target_topics rỗng |

