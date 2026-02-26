## Tối ưu toàn diện Pipeline Multi-Agent

### Phân tích hiện tại

Pipeline `generate_with_research` hiện chạy **5 bước tuần tự**:

```text
Research (~15s) → Strategy (~12s) → Content (~20s) → Reviewer (~10s) → Governor (~2s)
                                                                        Tổng: ~59s
```

Content Node đã được tối ưu (bỏ 2 LLM call), nhưng **Strategy Node** và **Reviewer Node** vẫn gọi 2 lần LLM mỗi node, và pipeline vẫn chạy tuần tự không cần thiết.

---

### Tối ưu 1: Bỏ Strategy Node khỏi generate_with_research

**Vấn đề:** Strategy Node chạy 2 LLM calls (~12s) chỉ để tạo `contentPlan`. Nhưng Content Node fast-path chỉ cần `bestTopic` (đã có từ Research). `contentPlan` gần như không được sử dụng hiệu quả.

**Giải pháp:** Chuyển template `generate_with_research` từ Research → Strategy → Content thành Research → Content (bỏ Strategy). Giữ Strategy cho template `full_pipeline` khi cần lập kế hoạch chi tiết.

**File:** `supabase/functions/_shared/graph/graph-engine.ts` (dòng 501-512)

```text
TRƯỚC: Research → Strategy → Content → Reviewer → Governor (~59s)
SAU:   Research → Content → Reviewer → Governor (~47s)
Tiết kiệm: ~12s
```

---

&nbsp;

```text


```

---

### Tối ưư 2  Reviewer Node -- bỏ follow-up LLM call

**Vấn đề:** Reviewer Node chạy 2 LLM calls: call #1 (review + tool calls) và call #2 (follow-up tổng hợp). Giống pattern đã sửa ở Content Node.

**Giải pháp:** Khi LLM call #1 không gọi tool (trường hợp phổ biến), dùng trực tiếp kết quả. Khi có tool calls, vẫn giữ follow-up nhưng dùng model nhẹ hơn hoặc giảm context.

**File:** `supabase/functions/_shared/graph/nodes/reviewer-node.ts`

```text
Tiết kiệm: ~4-6s (khi không cần tool calls)
```

---

### Tối ưu 3: Cache key generation -- dùng sync hash

**Vấn đề nhỏ:** `generateCacheKey` dùng `crypto.subtle.digest` (async) cho mỗi node. Với 4-5 nodes, tổng cộng thêm vài ms không cần thiết.

**Giải pháp:** Không thay đổi (ảnh hưởng quá nhỏ, giữ nguyên vì SHA-256 bảo mật hơn).

---

### Kết quả kỳ vọng tổng thể

```text
TRƯỚC: ~59s (Research → Strategy → Content → Reviewer → Governor)
SAU:   ~40s (Research → Content → Reviewer → Governor)
       - Bỏ Strategy: -12s
       - Bỏ refineTopic: -3s
       - Reviewer 1 LLM call: -4s
```

### Chi tiết kỹ thuật -- Trình tự triển khai

1. **Sửa `graph-engine.ts**`: Cập nhật template `generate_with_research` bỏ Strategy step, Content `dependsOn: ['research']`
2. **Sửa `reviewer-node.ts**`: Khi LLM không gọi tool, trả kết quả trực tiếp thay vì follow-up LLM call thứ 2