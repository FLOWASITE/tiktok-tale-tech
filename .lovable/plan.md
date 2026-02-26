## Tối ưu toàn diện Pipeline Multi-Agent

### Phân tích hiện tại

Pipeline `generate_with_research` hiện chạy **5 bước tuần tự**:

```text
Research (~15s) → Strategy (~12s) → Content (~20s) → Reviewer (~10s) → Governor (~2s)
                                                                        Tổng: ~59s
```

Content Node đã được tối ưu (bỏ 2 LLM call), nhưng **Strategy Node** và **Reviewer Node** vẫn gọi 2 lần LLM mỗi node, và pipeline vẫn chạy tuần tự không cần thiết.

---

### ✅ Tối ưu 1: Bỏ Strategy Node khỏi generate_with_research — DONE

**File:** `supabase/functions/_shared/graph/graph-engine.ts`
- Template `generate_with_research`: Research → Content → Reviewer → Governor (bỏ Strategy)
- Content `dependsOn: ['research']` thay vì `dependsOn: ['strategy']`

---

### ✅ Tối ưu 2: Reviewer Node -- bỏ follow-up LLM call — DONE

**File:** `supabase/functions/_shared/graph/nodes/reviewer-node.ts`
- Khi LLM call #1 không gọi tool: trả kết quả trực tiếp kèm score/confidence/tokens
- Khi có tool calls: vẫn giữ follow-up LLM call

---

### Tối ưu 3: Cache key generation -- giữ nguyên

**Giải pháp:** Không thay đổi (ảnh hưởng quá nhỏ).

---

### Kết quả kỳ vọng tổng thể

```text
TRƯỚC: ~59s (Research → Strategy → Content → Reviewer → Governor)
SAU:   ~40s (Research → Content → Reviewer → Governor)
       - Bỏ Strategy: -12s
       - Bỏ refineTopic: -3s
       - Reviewer 1 LLM call: -4s
```
