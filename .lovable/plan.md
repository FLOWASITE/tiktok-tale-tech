

## Vấn đề

Prompt refine hiện tại yêu cầu AI "Improve a raw topic into 3 better versions" nhưng **không ép AI phải giữ nguyên chủ đề gốc**. AI có thể drift sang chủ đề khác hoàn toàn, đặc biệt khi `contentGoal` kéo AI theo hướng khác.

Ví dụ: User nhập "dịch vụ kế toán" + goal "conversion" → AI có thể đề xuất topic về "bán hàng online" hoặc "marketing" thay vì giữ đúng chủ đề kế toán.

**Nguyên nhân gốc**: Prompt thiếu ràng buộc "MUST stay on the same topic/subject" và content goal guidance quá generic (không liên kết với raw topic).

## Giải pháp

### File: `supabase/functions/topic-ai/index.ts` — hàm `handleRefine()`

**1. Thêm TOPIC ANCHORING rule** ngay sau base prompt:

```
## ⚠️ CRITICAL: TOPIC ANCHORING
The refined topics MUST be about the SAME subject/industry as the raw topic.
- Raw topic mentions "${rawTopic}" → ALL 3 refined topics MUST be about this exact subject
- You are IMPROVING the angle/hook/specificity, NOT changing the subject
- VIOLATION: Raw topic is about "kế toán" but refined topic is about "marketing" → REJECTED
```

**2. Cải thiện content goal guidance** — liên kết goal với raw topic thay vì generic:

```
// Thay vì: "Focus on sales angles, pain points..."
// Thành: "Apply ${contentGoal} strategy TO the topic '${rawTopic}'. Focus on..."
```

Cụ thể, mỗi goal guidance sẽ bắt đầu bằng: `"Apply ${contentGoal} angles specifically to '${rawTopic}'."` để AI hiểu phải áp dụng goal lên chủ đề gốc, không phải tạo chủ đề mới.

**3. Thêm NEGATIVE EXAMPLES** trong prompt để tăng enforcement:

```
## WRONG vs RIGHT EXAMPLES
❌ WRONG: Raw="dịch vụ kế toán" → Refined="Cách bán hàng online hiệu quả" (đổi chủ đề)
✅ RIGHT: Raw="dịch vụ kế toán" → Refined="5 lý do doanh nghiệp mất tiền vì không thuê kế toán chuyên nghiệp" (cùng chủ đề, góc conversion)
```

**4. Strengthen REMINDER cuối prompt:**

```
REMINDER: 
1. Content goal is "${contentGoal}" — apply this goal TO the topic "${rawTopic}"
2. ALL 3 refined topics MUST be about "${rawTopic}" — do NOT change the subject
3. You are refining the ANGLE, not the TOPIC
```

### Tóm tắt
- Chỉ sửa 1 file: `supabase/functions/topic-ai/index.ts`
- Thêm Topic Anchoring constraint + negative examples
- Liên kết content goal với raw topic thay vì để generic
- Strengthen reminder cuối prompt

