

## Vấn đề

Khi user nhập "bán hàng dịch vụ kế toán" với goal **Conversion**, AI vẫn có thể trả về topic với angle "educational" vì:

1. **Base prompt** liệt kê "Educational" trong danh sách angles — AI thấy đó là lựa chọn hợp lệ
2. **Output format** cho phép `"angle": "educational"` — không filter theo goal
3. **Goal guidance** nói "Focus on sales angles..." nhưng không **CẤM** các angle khác → AI vẫn mix

## Giải pháp: Goal-Locked Angles

### File: `supabase/functions/topic-ai/index.ts` — hàm `handleRefine()`

**1. Map mỗi contentGoal → allowed angles** (thay vì cho phép tất cả):

```typescript
const goalAngles: Record<string, string[]> = {
  conversion: ['sales', 'solution', 'practical'],
  education: ['educational', 'practical', 'data'],
  awareness: ['storytelling', 'controversial', 'data'],
  engagement: ['controversial', 'storytelling', 'practical'],
  expertise: ['data', 'educational', 'solution'],
};
const allowedAngles = contentGoal ? goalAngles[contentGoal] || ['practical','sales','educational'] : ['practical','controversial','educational','storytelling','solution','sales','data'];
```

**2. Cập nhật base prompt** — dynamic angles list thay vì hardcoded:

```
Fresh angles: ${allowedAngles.join(', ')}
```

**3. Cập nhật output format** — chỉ cho phép angles phù hợp goal:

```
"angle": "MUST be one of: ${allowedAngles.join(', ')}"
```

**4. Thêm explicit prohibition** trong content goal section:

```
⚠️ FORBIDDEN ANGLES for "${contentGoal}": ${forbiddenAngles.join(', ')}
Do NOT use educational/informational angles when the goal is CONVERSION.
```

### Tóm tắt
- Sửa 1 file: `supabase/functions/topic-ai/index.ts`
- Lock angles theo goal → AI không thể chọn "educational" khi goal = "conversion"
- Thêm forbidden angles list để tăng enforcement

