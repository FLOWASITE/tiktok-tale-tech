

## Sửa lỗi: Tin nhắn vô nghĩa vẫn kích hoạt tạo nội dung

### Nguyên nhân gốc

Luồng xử lý hiện tại có lỗ hổng:

1. `matchIntent()` kiểm tra regex marketing → không match → trả null
2. `isOffTopic()` kiểm tra regex off-topic cụ thể (toán, code, thời tiết...) → cũng không match vì tin nhắn vô nghĩa không thuộc danh mục nào
3. `tryFastPath()` trả null → rơi vào LLM Planning
4. LLM Orchestrator prompt nói "For simple chat/Q&A, use content node" → LLM gán plan "content" → hệ thống tạo nội dung

Tóm lại: **tin nhắn vô nghĩa lọt qua cả 2 bộ lọc** (không phải marketing, cũng không phải off-topic đã định nghĩa) và LLM mặc định coi nó là yêu cầu tạo content.

### Giải pháp

**File: `supabase/functions/_shared/graph/orchestrator.ts`**

**1. Thêm phát hiện tin nhắn vô nghĩa vào `isOffTopic()`:**
- Pattern cho chuỗi ký tự lặp lại vô nghĩa (aaaa, hhhh, asdf...)
- Pattern cho tin nhắn không chứa từ có nghĩa (toàn ký tự đặc biệt hoặc random)
- Heuristic: nếu tin nhắn > 5 ký tự nhưng không chứa từ tiếng Việt/Anh phổ biến nào → likely nonsense

**2. Thêm fallback trong `matchIntent()`:**
- Khi không match intent nào VÀ `isOffTopic` cũng false → thêm kiểm tra "meaningfulness":
  - Nếu tin nhắn không chứa danh từ/động từ nhận diện được → trả về off_topic
  - Sử dụng kiểm tra tỷ lệ từ có nghĩa (word-level check)

**3. Cụ thể các pattern mới cho `OFF_TOPIC_PATTERNS`:**

```typescript
// Gibberish / nonsense
{ pattern: /^([a-zA-Z])\1{3,}/i, label: 'gibberish' },  // aaaa, hhhh
{ pattern: /^[^a-zA-ZÀ-ỹ0-9\s]{3,}$/, label: 'symbols_only' },  // ###, ???
{ pattern: /^(?:[bcdfghjklmnpqrstvwxz]{4,})/i, label: 'consonant_spam' },  // bcdfg
```

**4. Thêm hàm `looksLikeNonsense()` kiểm tra semantic:**

```typescript
function looksLikeNonsense(message: string): boolean {
  const words = message.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return true;
  // Nếu không có từ nào > 2 ký tự match từ điển cơ bản → nonsense
  const BASIC_WORDS = /^(tạo|viết|bài|nội dung|content|post|marketing|brand|kênh|channel|...)$/i;
  const meaningfulWords = words.filter(w => BASIC_WORDS.test(w) || w.length > 15);
  return meaningfulWords.length === 0 && words.length <= 3;
}
```

**5. Cập nhật logic cuối `matchIntent()`** (line 549-563):

```typescript
// No marketing intent matched — check if off-topic
const offTopicCheck = isOffTopic(message);
if (offTopicCheck.offTopic) { ... }

// NEW: No intent + not clearly off-topic = likely nonsense → treat as off-topic
if (looksLikeNonsense(message)) {
  return { intent: 'off_topic', confidence: 0.85, ... };
}

// Fallback: return null → LLM will decide (but message has some substance)
return null;
```

### Kết quả
- Tin nhắn vô nghĩa ("asdfgh", "haha xyz", "???") → trả phản hồi "Mình là Flowa AI — chuyên hỗ trợ về content marketing..."
- Tin nhắn marketing hợp lệ → vẫn hoạt động bình thường
- Tin nhắn mơ hồ nhưng có từ khóa nhận diện được → vẫn đi qua LLM planning

