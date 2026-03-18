# Đồng bộ UI/UX Topic Input: MultiChannelFormStepper → giống CarouselForm

## Hiện trạng


| &nbsp;        | CarouselForm                         | MultiChannelFormStepper                                    |
| ------------- | ------------------------------------ | ---------------------------------------------------------- |
| &nbsp;        | &nbsp;                               | &nbsp;                                                     |
| Char counter  | Badge trong input, right-3           | Text riêng phía trên                                       |
| Gợi ý chủ đề  | `TopicSuggestionPanel` luôn hiển thị | Không có (chỉ có TopicRefinementSuggestions khi ≥10 ký tự) |
| Glossary      | Có (nút "Từ điển")                   | Không có                                                   |
| Brainstorm AI | Không                                | Có nút riêng                                               |


## Thay đổi

### `src/components/multichannel/MultiChannelFormStepper.tsx`

1. **Thêm `TopicSuggestionPanel**` — import và sử dụng `useEnhancedTopicSuggestions` hook để hiển thị gợi ý chủ đề (collapsible, có score, cached badge, refresh)
2. **Thêm GlossaryQuickLookup** — nút "Từ điển" khi có `industry_template_id`
3. **Giữ lại Brainstorm AI + TopicRefinementSuggestions** — đặt phía dưới TopicSuggestionPanel
4. **Giảm MAX_TOPIC_LENGTH** từ 500 → 300 cho phù hợp với single-line input

### Import mới cần thêm

- `TopicSuggestionPanel` từ `@/components/TopicSuggestionPanel`
- `useEnhancedTopicSuggestions` từ `@/hooks/useEnhancedTopicSuggestions`
- `GlossaryQuickLookup` từ `@/components/GlossaryQuickLookup`
- `Input` từ `@/components/ui/input`
- Icon `Book` từ lucide-react