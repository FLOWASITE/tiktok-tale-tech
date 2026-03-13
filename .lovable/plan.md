

## Vấn đề gốc

Code truyền `contentGoal` đúng từ UI → hook → edge function. Tuy nhiên **prompt không đủ mạnh** để ép AI theo mục tiêu:

1. **Base prompt** liệt kê angles: "Practical, Controversial, Educational, Storytelling" — không có "Sales/Conversion"
2. **Content goal section** chỉ là 1 đoạn nhỏ giữa nhiều section khác → AI dễ bỏ qua
3. **Output format** yêu cầu angle là "practical, controversial, educational, storytelling, solution, data" — không có "conversion/sales"

## Giải pháp: Tăng cường prompt enforcement

### File: `supabase/functions/topic-ai/index.ts` — `handleRefine()`

**1. Cập nhật base prompt angles** để bao gồm sales/conversion:
```
Fresh angles: Practical, Controversial, Educational, Storytelling, Sales, Solution
```

**2. Di chuyển content goal lên ĐẦU prompt** (trước RAW TOPIC) và tăng cường ngôn ngữ:
```
## MANDATORY CONTENT GOAL: "${contentGoal}"
${goalGuidance[contentGoal]}
⚠️ This is the PRIMARY constraint. Every refined topic MUST serve this goal.
Topics that don't align with "${contentGoal}" will be REJECTED.
```

**3. Cập nhật output format** — thêm goal-aligned angle options:
```
"angle": "Approach angle (practical, controversial, educational, storytelling, solution, sales, data)"
```

**4. Thêm reminder cuối prompt** (recency bias — AI chú ý đầu và cuối prompt nhất):
```
REMINDER: Content goal is "${contentGoal}". ALL 3 topics must serve this goal. Do NOT mix goals.
```

### Tóm tắt thay đổi
- Chỉ sửa 1 file: `supabase/functions/topic-ai/index.ts`
- Restructure prompt order: goal → topic → brand → output
- Thêm enforcement language mạnh hơn ở đầu và cuối prompt

