

# Tích hợp Research Agent với Topic-AI

## Vấn đề hiện tại

Research Agent và Topic-AI hoạt động **hoàn toàn độc lập**:

- **Research Agent**: Chỉ có 2 tools (`web_search`, `search_topics`) -- `search_topics` chỉ tìm trong Topic Bank (topics đã lưu), không gợi ý topic mới
- **Topic-AI Edge Function**: Có 10+ actions mạnh mẽ (`suggest`, `refine`, `trending`, `gap_analysis`, `cluster`, `keywords`, `next_best`, `weekly_plan`, `suggest_compliant`, `suggest_audience`) nhưng **không được Research Agent sử dụng**

Kết quả: Research Agent chỉ search web rồi trả text, không tạo được topic suggestions có điểm số, không tận dụng được brand context, persona matching, hay industry compliance.

## Giải pháp

Thêm tool mới `discover_topics` cho Research Agent, tool này gọi trực tiếp vào `topic-ai` edge function để:
1. Gợi ý topics mới dựa trên brand context + web search
2. Phân tích trending topics trong ngành
3. Tìm topic gaps chưa được khai thác

## Thay đổi cụ thể

### 1. Thêm Tool Definition `discover_topics`

**File**: `supabase/functions/_shared/tool-definitions.ts`

Thêm tool mới vào `CHAT_TOOLS`:

```text
name: "discover_topics"
description: "Gọi Topic-AI để gợi ý chủ đề mới, tìm trending topics, hoặc phân tích topic gaps. Gọi khi user muốn tìm ý tưởng nội dung mới."
parameters:
  - action: "suggest" | "trending" | "gap_analysis" (bắt buộc)
  - query: string (mô tả yêu cầu của user)
  - content_goal: "viral" | "evergreen" | "seasonal" | "series" (tùy chọn)
  - limit: number (tùy chọn, mặc định 5)
```

### 2. Implement Tool Executor `executeDiscoverTopics`

**File**: `supabase/functions/_shared/tool-executor.ts`

Thêm case `discover_topics` gọi internal đến `topic-ai` edge function:

- Với action `suggest`: Gọi `topic-ai?action=suggest` kèm brand context
- Với action `trending`: Gọi `topic-ai?action=trending`
- Với action `gap_analysis`: Gọi `topic-ai?action=gap_analysis`
- Kết quả trả về dạng structured: danh sách topics với scores, categories, reasoning

### 3. Cập nhật Agent Registry

**File**: `supabase/functions/_shared/supervisor/agent-registry.ts`

- Thêm `discover_topics` vào tools list của `research-agent`
- Tools mới: `['web_search', 'search_topics', 'discover_topics']`

### 4. Cập nhật Research Agent System Prompt

**File**: `supabase/functions/_shared/agents/research-agent.ts`

Cập nhật prompt để:
- Hướng dẫn agent gọi `discover_topics` khi user cần ý tưởng topic mới
- Phân biệt rõ: `search_topics` = tìm topics cũ đã lưu, `discover_topics` = gợi ý topics mới từ AI
- Yêu cầu agent chọn topic tốt nhất từ kết quả và ghi vào Blackboard

### 5. Cập nhật Tool Chain & Parallel Executor

**Files**:
- `supabase/functions/_shared/tool-chain-executor.ts` -- thêm output mapping cho `discover_topics`
- `supabase/functions/_shared/parallel-tool-executor.ts` -- thêm `discover_topics` vào TOOL_OUTPUTS

---

## Luồng hoạt động mới

```text
User: "Tìm ý tưởng content về skincare cho Gen Z"
         |
    Intent: research
         |
  Research Agent
    |-- web_search("skincare Gen Z trends 2026")
    |-- discover_topics(action="suggest", query="skincare Gen Z")
         |
         |  (discover_topics gọi internal topic-ai)
         |  topic-ai: brand context + Perplexity + AI scoring
         |
    Research Agent nhận:
      - Web search results (xu hướng thực tế)
      - Topic suggestions (có điểm, category, reasoning)
         |
    Ghi vào Blackboard: research_data + suggested_topics
         |
    Trả kết quả cho user / chuyển cho Content Agent
```

## Lợi ích

- **Không duplicate web search**: `discover_topics` tận dụng cache + web search optimization của topic-ai (skip nếu đã có data)
- **Topics có chất lượng cao**: Được scoring, persona matching, brand alignment từ topic-ai
- **Kết nối 2 hệ thống**: Research Agent output có thể dùng trực tiếp cho Content Agent qua Blackboard
- **Backward compatible**: Không ảnh hưởng đến topic-ai standalone hay frontend hiện tại

