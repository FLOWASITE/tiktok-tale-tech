
# Kế hoạch: Cải thiện Web Search Integration cho Topic Brainstorm AI

## Phân tích vấn đề

Hệ thống hiện tại **đã có** chức năng web search nhưng không được sử dụng triệt để:

### Luồng hiện tại
```
User message → chat-topics edge function
                    ↓
              Kiểm tra "trending intent" (xu hướng, trending, viral...)
                    ↓
        [Có keywords] → Prefetch web search tự động
        [Không có]    → Chỉ dựa vào context có sẵn
                    ↓
              AI nhận system prompt
                    ↓
        AI có thể gọi tool web_search (nhưng thường không chủ động)
```

### Vấn đề cụ thể
1. **Prefetch chỉ kích hoạt khi có keywords trending** - Nếu user hỏi "cho tôi ý tưởng về chủ đề AI" mà không có từ "xu hướng", prefetch sẽ không chạy
2. **AI không được yêu cầu LUÔN tìm kiếm web** - System prompt chỉ "gợi ý" dùng web_search khi cần, không bắt buộc
3. **Fallback về thông tin cũ** - Khi không có web search, AI dùng brand context/industry memory có thể đã outdate

---

## Giải pháp đề xuất

### 1. Mở rộng Prefetch Trigger Keywords

**File:** `supabase/functions/chat-topics/index.ts`

Thêm nhiều keywords để kích hoạt prefetch web search:
- Keywords hiện tại: "xu hướng", "trending", "viral", "hot topic"...
- Thêm: "ý tưởng mới", "chủ đề hay", "gợi ý topic", "content gì", "brainstorm"

```typescript
const trendingKeywords = [
  // Existing
  'xu hướng', 'trending', 'đang hot', 'viral', 'trend',
  'tin tức mới nhất', 'tin mới', 'hot topic', 'xu huong',
  'đang được quan tâm', 'nổi bật', 'phổ biến', 'gần đây',
  // NEW: Brainstorm & discovery intent
  'ý tưởng', 'chủ đề', 'topic', 'brainstorm', 'gợi ý',
  'content gì', 'nội dung gì', 'viết gì', 'làm gì',
  'tìm kiếm', 'discover', 'khám phá', 'mới', 'fresh'
];
```

### 2. Thêm flag `forceWebSearch` trong request

**Files:**
- `src/hooks/useChatStreaming.ts`
- `supabase/functions/chat-topics/index.ts`

Cho phép frontend yêu cầu bắt buộc web search:

```typescript
// Frontend - khi gọi từ TopicBrainstormSheet
body: JSON.stringify({
  messages: apiMessages,
  brandTemplateId,
  contentGoal,
  forceWebSearch: true, // NEW: Always search web for brainstorm
})
```

### 3. Cập nhật System Prompt để AI chủ động hơn

**File:** `supabase/functions/_shared/system-prompt-builder.ts`

Thêm hướng dẫn rõ ràng hơn:

```
## 🔍 Web Search - CHỦ ĐỘNG SỬ DỤNG

⚡ LUÔN gọi tool web_search TRƯỚC khi đưa ra gợi ý topic nếu:
1. User hỏi về ý tưởng/topic mới
2. Chưa có dữ liệu web search trong context
3. Brand context không đủ fresh (không có [🌐 Web Search] context)

Lý do: Thông tin ngành thay đổi liên tục. Web search đảm bảo gợi ý luôn relevant và up-to-date.
```

### 4. Thêm Context Indicator cho User

**File:** `src/components/topic/chatbot/SimpleMessageList.tsx` (hoặc tương tự)

Hiển thị badge khi AI đang sử dụng web search vs cached data:
- `🌐 Real-time data` - Đang dùng web search
- `📚 Cached data` - Dùng dữ liệu có sẵn

---

## Chi tiết kỹ thuật

### Thay đổi 1: Mở rộng prefetch triggers

```typescript
// supabase/functions/chat-topics/index.ts - Lines ~420-430

const trendingKeywords = [
  // Trending/viral intent
  'xu hướng', 'trending', 'đang hot', 'viral', 'trend',
  'tin tức mới nhất', 'tin mới', 'hot topic', 'xu huong',
  'đang được quan tâm', 'nổi bật', 'phổ biến', 'gần đây',
  // NEW: Brainstorm/discovery intent (ensures web search for topic suggestions)
  'ý tưởng', 'chủ đề', 'topic', 'brainstorm', 'gợi ý',
  'content gì', 'nội dung gì', 'viết gì', 'làm gì',
  'tìm kiếm', 'discover', 'khám phá',
];
```

### Thay đổi 2: Thêm forceWebSearch option

```typescript
// supabase/functions/chat-topics/index.ts - Request interface

interface ChatRequest {
  messages: ChatMessage[];
  brandTemplateId?: string;
  contentGoal?: string;
  organizationId?: string;
  userId?: string;
  enableTools?: boolean;
  enableAgenticLoop?: boolean;
  maxAgentTurns?: number;
  forceWebSearch?: boolean; // NEW
}

// Logic change - always prefetch when forceWebSearch is true
const shouldPrefetch = hasTrendingIntent || forceWebSearch;
```

### Thay đổi 3: Frontend gửi forceWebSearch từ Brainstorm

```typescript
// src/hooks/useChatStreaming.ts - Lines ~140-148

body: JSON.stringify({
  messages: apiMessages,
  brandTemplateId,
  contentGoal,
  organizationId,
  userId,
  enableTools: true,
  forceWebSearch: true, // Always use web search for brainstorm context
}),
```

### Thay đổi 4: Cập nhật system prompt

```typescript
// supabase/functions/_shared/system-prompt-builder.ts - After line ~162

prompt += `
## 🔍 Web Search - CHỦ ĐỘNG SỬ DỤNG

⚡ QUAN TRỌNG: LUÔN gọi tool \`web_search\` khi:
1. User yêu cầu ý tưởng/topic/brainstorm
2. Không có [🌐 Web Trends Context] trong prompt này
3. Dữ liệu industry/brand đã > 1 tuần

Lý do: Thông tin thị trường thay đổi liên tục. Web search đảm bảo gợi ý luôn fresh và relevant.

**Flow đề xuất:**
1. Nhận yêu cầu brainstorm → gọi web_search(search_type: "trending")
2. Kết hợp kết quả với brand context
3. Gợi ý topics dựa trên real-time data
`;
```

---

## Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/chat-topics/index.ts` | Mở rộng trending keywords, thêm forceWebSearch logic |
| `src/hooks/useChatStreaming.ts` | Thêm forceWebSearch parameter |
| `supabase/functions/_shared/system-prompt-builder.ts` | Cập nhật hướng dẫn web search chủ động |
| `src/components/multichannel/TopicBrainstormSheet.tsx` | (Optional) Hiển thị indicator web search status |

---

## Lợi ích

1. **Real-time data**: Brainstorm AI luôn có thông tin mới nhất từ web
2. **Không phụ thuộc AI decision**: Force prefetch đảm bảo web search luôn chạy
3. **Trải nghiệm nhất quán**: User không cần biết dùng từ khóa đặc biệt
4. **Backward compatible**: Không ảnh hưởng luồng chat thông thường

---

## Ước tính

- **Độ phức tạp**: Thấp-Trung bình
- **Files thay đổi**: 3-4 files
- **Thời gian**: 15-20 phút
- **Risk**: Thấp - chỉ mở rộng logic có sẵn
