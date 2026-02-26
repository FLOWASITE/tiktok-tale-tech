

# Bắt buộc Research Node gọi Trending + Suggest song song

## Vấn đề hiện tại

Research Node phụ thuộc hoàn toàn vào LLM để quyết định gọi tool nào. LLM thường chỉ chọn 1 action (thường là `suggest`), bỏ qua `trending` -- dẫn đến thiếu dữ liệu xu hướng/viral.

## Giải pháp

Thay đổi Research Node để **gọi trực tiếp** 2 lệnh `discover_topics` (suggest + trending) **trước khi** gọi LLM, rồi đưa kết quả vào context cho LLM tổng hợp.

## Thay đổi chi tiết

### 1. `research-node.ts` -- Gọi song song trước LLM

```text
Flow mới:
┌─────────────────────────────────┐
│ 1. Gọi SONG SONG (không qua LLM):    │
│    - discover_topics(suggest)         │
│    - discover_topics(trending)        │
├─────────────────────────────────┤
│ 2. Inject kết quả vào user message   │
├─────────────────────────────────┤
│ 3. LLM call (vẫn có tools nếu cần   │
│    web_search thêm) → tổng hợp      │
├─────────────────────────────────┤
│ 4. Merge topics từ cả 2 nguồn       │
│    Ưu tiên: trending score cao hơn   │
└─────────────────────────────────┘
```

- Trước LLM call, thực thi `executeToolCall('discover_topics', { action: 'suggest', query: userMessage })` và `executeToolCall('discover_topics', { action: 'trending' })` song song bằng `Promise.all`
- Gộp kết quả thành `prefetchedContext` string, inject vào message cho LLM
- LLM vẫn có thể gọi thêm `web_search` nếu cần, nhưng không cần gọi lại `discover_topics`
- Merge topics: trending topics được tag `[TRENDING]`, suggest topics tag `[SUGGEST]`, sắp xếp theo score

### 2. `research-agent.ts` -- Cập nhật system prompt

- Thêm hướng dẫn: "Dữ liệu trending và suggest đã được cung cấp sẵn bên dưới. Hãy tổng hợp và chọn topic tốt nhất."
- Bỏ quy tắc yêu cầu LLM tự gọi `discover_topics` (vì đã gọi sẵn)
- Giữ `web_search` trong tools để LLM bổ sung nếu cần

### 3. Merge logic cho `suggestedTopics`

- Gộp topics từ cả suggest + trending, dedup theo tên
- Trending topics được boost score +10 để ưu tiên hiển thị
- `bestTopic` chọn từ pool gộp (score cao nhất)

## Tác động

- Đảm bảo **100%** request đều có dữ liệu trending
- Giảm phụ thuộc vào quyết định của LLM
- Tăng nhẹ latency (~200ms) do 2 tool call song song, nhưng đổi lại chất lượng topic tốt hơn nhiều
