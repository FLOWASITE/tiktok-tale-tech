

# Fix: Áp dụng UI carousel-style vào đúng file `MultiChannelFormWizard.tsx`

## Vấn đề

Lần trước các thay đổi UI (Input single-line, TopicSuggestionPanel, GlossaryQuickLookup) được áp dụng vào file **sai** — `MultiChannelFormStepper.tsx`. Trang `/multichannel/new` thực tế sử dụng `MultiChannelFormWizard.tsx`, file này vẫn giữ UI cũ (Textarea lớn, 0/500, không có gợi ý chủ đề kiểu carousel).

## Thay đổi trong `src/components/multichannel/MultiChannelFormWizard.tsx`

### 1. Thay Textarea bằng Input single-line
- Thay `<Textarea>` (min-h-100px) bằng `<Input>` (h-11, border-2, pr-20)
- Đổi `topicTextareaRef` từ `HTMLTextAreaElement` sang `HTMLInputElement`
- Char counter hiển thị dạng Badge overlay bên phải input (giống carousel)

### 2. Giảm MAX_TOPIC_LENGTH: 500 → 300

### 3. Thay `InlineTopicSuggestions` bằng `TopicSuggestionPanel`
- Import `TopicSuggestionPanel` và `useEnhancedTopicSuggestions`
- Hiển thị gợi ý chủ đề có điểm score, cached badge, refresh — giống CarouselForm
- Bỏ card "Chưa có ý tưởng?" hero lớn, thay bằng TopicSuggestionPanel compact hơn

### 4. Thêm GlossaryQuickLookup
- Nút "Từ điển" cạnh label khi có `industry_template_id`

### 5. Giữ nguyên
- Brainstorm AI button (nhỏ gọn hơn)
- TopicRefinementSuggestions khi topic ≥ 10 ký tự
- ComplianceWarningBadge

