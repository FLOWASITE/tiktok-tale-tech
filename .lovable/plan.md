

## Thêm content-type terms vào NON_TOPIC_TERMS

### Vấn đề
Khi người dùng nhập "Tạo kịch bản video" hoặc "Tạo carousel cho hôm nay", các từ như "kịch bản", "video", "carousel", "script" được tính là "real words", khiến `hasExplicitTopic` trả về `true` sai -- hệ thống bỏ qua Research Agent.

### Giải pháp
Thêm các từ chỉ **loại nội dung** (content format) vào `NON_TOPIC_TERMS` trong `supabase/functions/_shared/graph/orchestrator.ts`.

### Chi tiết kỹ thuật

**File:** `supabase/functions/_shared/graph/orchestrator.ts` (dòng 65-71)

Thêm một dòng mới vào Set `NON_TOPIC_TERMS`:

```typescript
const NON_TOPIC_TERMS = new Set([
  'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'threads', 'youtube',
  'kênh', 'channel', 'social', 'mxh', 'online',
  'bài', 'post', 'content', 'nội', 'dung', 'noi',
  'viết', 'tạo', 'soạn', 'làm', 'generate', 'create', 'write', 'make',
  'cho', 'về', 'about', 'the', 'a', 'an', 'một', 'mot',
  // Content format terms - không phải topic cụ thể
  'carousel', 'script', 'kịch', 'bản', 'video', 'reel', 'reels', 'story', 'stories',
  'multichannel', 'đa', 'multi',
]);
```

**Lưu ý:** Tách "kịch bản" thành "kịch" và "bản" vì hàm split theo khoảng trắng sẽ tạo ra 2 từ riêng biệt. Thêm luôn "reel", "reels", "story", "stories" để phủ hết các format phổ biến.

### Kết quả

| Prompt | Trước | Sau |
|--------|-------|-----|
| "Tạo carousel" | `false` (1 word) | `false` (0 words) |
| "Tạo kịch bản video" | `true` (2 words: kịch, bản) | `false` (0 words) |
| "Tạo video về skincare" | `true` (2 words: video, skincare) | `true` (1 word >= 2 needed → `false`) |
| "Tạo carousel về skincare mùa hè" | `true` | `true` (skincare, mùa, hè) |

**Lưu ý cho "Tạo video về skincare":** chỉ còn 1 real word ("skincare") nên `hasExplicitTopic` trả về `false` theo check cuối (cần >= 2). Tuy nhiên, nó sẽ match qua `veMatch` pattern ("về skincare") và `hasRealWords` sẽ return `true` -- nên kết quả cuối cùng vẫn đúng: `true`.

