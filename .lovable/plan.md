

# Gộp Brainstorm AI + Kho ý tưởng thành panel thống nhất

## Ý tưởng

Tạo component mới `TopicIdeaHub` thay thế cả `TopicSuggestionPanel` + nút `Brainstorm AI` riêng lẻ. Panel có 2 tab: **Danh sách nhanh** (gợi ý có sẵn) và **Chat AI** (brainstorm sâu), chuyển đổi ngay trong cùng một khu vực.

## Component mới: `src/components/topic/TopicIdeaHub.tsx`

- Sử dụng `Tabs` với 2 tab:
  - **Tab "Gợi ý nhanh"** (icon Lightbulb): Chứa nội dung hiện tại của `TopicSuggestionPanel` — danh sách gợi ý dạng badge/chip, có score, feedback, save, refresh
  - **Tab "Brainstorm AI"** (icon Sparkles): Embed `TopicAIChatbot` inline (mode="embedded") trực tiếp trong panel, không cần mở Sheet riêng
- Collapsible wrapper giữ nguyên khả năng thu gọn
- Chiều cao tab Chat AI cố định ~280px với scroll nội bộ

## Thay đổi trong các form

### `MultiChannelFormWizard.tsx`
1. Thay `TopicSuggestionPanel` + nút "Brainstorm với AI" + `TopicBrainstormSheet` bằng `TopicIdeaHub`
2. Bỏ state `showBrainstormSheet` và import `TopicBrainstormSheet`
3. Truyền props: suggestions, chatbot config (brandTemplateId, contentGoal), onSelect

### `MultiChannelFormStepper.tsx`
- Tương tự: thay thế `TopicSuggestionPanel` + `TopicBrainstormSheet` bằng `TopicIdeaHub`

### `CarouselForm.tsx`
- Thay `TopicSuggestionPanel` bằng `TopicIdeaHub` (CarouselForm hiện không có Brainstorm, giờ sẽ có luôn)

## Cấu trúc UI

```text
┌─────────────────────────────────────────┐
│ 💡 Ý tưởng chủ đề              [▼] [↻] │
├──────────────┬──────────────────────────┤
│ Gợi ý nhanh │ Brainstorm AI            │
├──────────────┴──────────────────────────┤
│                                         │
│  (Nội dung tab active)                  │
│  - Tab 1: chips gợi ý có score         │
│  - Tab 2: chat AI inline               │
│                                         │
└─────────────────────────────────────────┘
```

## Props của TopicIdeaHub

```typescript
interface TopicIdeaHubProps {
  // Suggestion list props (from TopicSuggestionPanel)
  suggestions: EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string) => void;
  onRefresh: () => void;
  onSave?: (s: EnhancedTopicSuggestion) => void;
  onFeedback?: (s: EnhancedTopicSuggestion, fb: 'positive'|'negative') => void;
  // Chatbot props
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  // General
  disabled?: boolean;
  showEnhancedInfo?: boolean;
}
```

## Tóm tắt

- 1 component mới: `TopicIdeaHub`
- 3 file cập nhật: `MultiChannelFormWizard`, `MultiChannelFormStepper`, `CarouselForm`
- Bỏ sử dụng `TopicBrainstormSheet` trong wizard/stepper (file giữ lại cho backward compat)
- `TopicSuggestionPanel` giữ nguyên file gốc, chỉ không import trực tiếp nữa

