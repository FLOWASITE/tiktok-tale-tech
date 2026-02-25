

# Fix: Content Agent không lấy được Topic từ Research Agent

## Nguyên nhân gốc

Có **2 vấn đề cốt lõi** khiến Content Agent không sử dụng topic do Research Agent tìm được:

### Vấn đề 1: Blackboard context bị cắt ngắn (500 ký tự)

Trong `blackboard.ts` dòng 196, hàm `buildBlackboardContext` cắt giá trị JSON xuống còn **500 ký tự**:

```text
JSON.stringify(e.value, null, 2).slice(0, 500)
```

Research Agent ghi vào blackboard key `research_data` một object phức tạp: `{ content: "...", toolResults: [...] }`. Khi JSON.stringify, dữ liệu topics nằm sâu bên trong `toolResults` bị cắt mất hoàn toàn. Content Agent chỉ nhận được phần đầu (metadata), **không bao giờ thấy danh sách topics**.

### Vấn đề 2: Không có key `best_topic` trên Blackboard

Supervisor emit SSE event `topic_suggestions` về frontend (OK), nhưng **không ghi `best_topic` lên Blackboard** cho Content Agent đọc. Content Agent chỉ thấy `research_data` bị cắt ngắn, không có key riêng biệt cho topic được chọn.

## Giải pháp

### 1. Ghi `best_topic` và `suggested_topics` lên Blackboard sau Research Agent

**File**: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

Sau khi emit `topic_suggestions` (dòng ~282-288 và ~446-453), thêm logic ghi trực tiếp lên blackboard:

```text
if (topicPayload) {
  // Emit SSE to frontend (existing)
  options.onEvent?.({ type: 'topic_suggestions', data: topicPayload });

  // NEW: Write best_topic to blackboard for Content Agent
  await blackboard.write('best_topic', topicPayload.best_topic, 'research-agent');
  await blackboard.write('suggested_topics', topicPayload.topics, 'research-agent');
}
```

Thay đổi này áp dụng ở **2 nơi**: multi-step workflow (dòng ~278-288) và linear workflow (dòng ~443-453).

### 2. Tăng giới hạn truncation cho blackboard context

**File**: `supabase/functions/_shared/supervisor/blackboard.ts`

Tăng giới hạn slice từ 500 lên 1500 ký tự trong `buildBlackboardContext` (dòng 196):

```text
// Trước: .slice(0, 500)
// Sau: .slice(0, 1500)
```

### 3. Cập nhật Content Agent system prompt

**File**: `supabase/functions/_shared/agents/content-agent.ts`

Thêm chỉ dẫn rõ ràng trong system prompt để Content Agent **ưu tiên sử dụng `best_topic`** từ blackboard:

```text
## QUY TẮC CHỌN TOPIC (ƯU TIÊN)
1. Nếu có key "best_topic" trên Blackboard → BẮT BUỘC dùng topic này
2. Nếu có key "suggested_topics" → chọn topic đầu tiên
3. Chỉ tự chọn topic khi KHÔNG CÓ dữ liệu nào từ Research Agent
```

## Thay đổi chi tiết

| File | Dòng | Thay đổi |
|------|------|----------|
| `supervisor-loop.ts` | ~282-288 | Ghi `best_topic` + `suggested_topics` lên blackboard (multi-step) |
| `supervisor-loop.ts` | ~446-453 | Ghi `best_topic` + `suggested_topics` lên blackboard (linear) |
| `blackboard.ts` | 196 | Tăng truncation limit từ 500 lên 1500 chars |
| `content-agent.ts` | 17-24 | Thêm quy tắc ưu tiên best_topic từ blackboard |

## Luồng sau fix

```text
Research Agent:
  → discover_topics → 5 topics
  → Blackboard: research_data = {content, toolResults}
  → Blackboard: best_topic = "Tối ưu hóa thuế cho startup 2026"  ← NEW
  → Blackboard: suggested_topics = [{topic, score, ...}, ...]    ← NEW

Content Agent:
  → Đọc blackboard context
  → Thấy best_topic = "Tối ưu hóa thuế cho startup 2026"        ← KEY FIX
  → Gọi generate_multichannel(topic="Tối ưu hóa thuế cho startup 2026", ...)
  → Core Content được tạo với đúng topic
```
