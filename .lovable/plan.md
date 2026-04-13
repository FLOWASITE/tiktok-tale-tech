

## Thêm bộ lọc Intent — Chỉ trả lời về Marketing/Content

### Vấn đề
Chatbot hiện trả lời mọi câu hỏi, kể cả "Tại sao" hay bất kỳ tin nhắn không liên quan. Khi `matchIntent` trả về `null`, request rơi vào LLM planning, và LLM trả lời như assistant tổng quát.

### Giải pháp: 2 lớp lọc

**Lớp 1 — Heuristic off-topic detection (nhanh, không tốn token)**

Thêm hàm `isOffTopic(message)` trong `orchestrator.ts`:
- Tin nhắn quá ngắn (< 5 ký tự, không phải follow-up) + không match bất kỳ intent nào → off-topic
- Match các pattern off-topic rõ ràng: hỏi toán, code, dịch thuật không liên quan marketing, câu hỏi cá nhân, v.v.
- Nếu off-topic → trả về template plan "off_topic" mới, skip toàn bộ graph engine

**Lớp 2 — System prompt guardrail (cho LLM fallback)**

Cập nhật system prompt trong `prompt-registry.ts` và `ORCHESTRATOR_SYSTEM_PROMPT` để thêm:
- Quy tắc rõ ràng: chỉ trả lời về content marketing, social media, branding, thương hiệu
- Khi nhận câu hỏi không liên quan → trả lời lịch sự redirect về đúng chức năng

### File thay đổi

**1. `supabase/functions/_shared/graph/orchestrator.ts`**
- Thêm `OFF_TOPIC_PATTERNS` regex array cho các câu hỏi rõ ràng ngoài phạm vi
- Thêm hàm `isOffTopic(message)` kiểm tra: (a) không match intent nào + quá ngắn/vô nghĩa, (b) match off-topic patterns
- Trong `matchIntent`: nếu không match gì → gọi `isOffTopic` → trả về intent `off_topic`
- Thêm template plan `off_topic` trong `intentToTemplate`

**2. `supabase/functions/_shared/graph/graph-engine.ts`**
- Thêm template plan `off_topic` → chỉ chạy node `content` với flag `isOffTopic: true`
- Khi `isOffTopic`, content node trả response cố định thay vì gọi LLM

**3. `supabase/functions/_shared/prompt-registry.ts`**
- Cập nhật system prompt `chat-topics` thêm boundary rõ ràng:
  ```
  PHẠM VI: Chỉ hỗ trợ về content marketing, social media, branding, chiến lược nội dung.
  Nếu câu hỏi ngoài phạm vi → từ chối lịch sự và gợi ý hỏi về marketing.
  ```

**4. `supabase/functions/_shared/graph/orchestrator.ts` — ORCHESTRATOR_SYSTEM_PROMPT**
- Thêm rule: "If user message is clearly off-topic (not related to marketing, content, branding), return a minimal plan with content node only and set reasoning to 'off_topic'."

### Off-topic response mẫu
```
Mình là Flowa AI — chuyên hỗ trợ về content marketing và chiến lược nội dung. 🎯

Mình có thể giúp bạn:
• Gợi ý chủ đề content
• Lập kế hoạch nội dung
• Viết bài cho các kênh social media
• Phân tích xu hướng và đối thủ

Hãy hỏi mình về marketing nhé! 💡
```

### Logic flow
```text
User message → matchIntent()
  ├─ match found → fast-path (existing)
  ├─ no match + isOffTopic() = true → return canned response (no LLM call)
  └─ no match + isOffTopic() = false → LLM planning (existing, with guardrail prompt)
```

