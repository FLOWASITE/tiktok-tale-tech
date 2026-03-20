

# Đồng bộ UI/UX phần Chủ đề Video Script với Carousel

## Tóm tắt

Hiện tại phần chủ đề Video Script (Step 2) dùng `ScriptTopicDiscoveryPanel` (panel nặng với bộ lọc, slider điểm) và `InlineTopicSuggestions` (khi topic trống). Carousel dùng `TopicIdeaHub` — gọn, có quick action chips (Viral, Trend, Lễ hội...), nút Brainstorm AI gradient, và SWR. Cần thay thế để đồng nhất trải nghiệm.

## Thay đổi — 1 file: `src/components/script/ScriptFormStepper.tsx`

### 1. Thêm `useEnhancedTopicSuggestions` hook (giống Carousel)

Import `useEnhancedTopicSuggestions` và `TopicIdeaHub` thay cho `ScriptTopicDiscoveryPanel` và `InlineTopicSuggestions`. Khởi tạo hook với `format: 'script'` và `contentGoal` từ `scriptContentGoal`.

### 2. Cập nhật Topic Textarea style

Thay textarea `min-h-[120px]` thành `min-h-[72px]` với auto-resize (`onInput` tự điều chỉnh height) giống Carousel — gọn hơn, tự mở rộng khi nhập nhiều.

### 3. Thay thế Dynamic Zone (empty/substantial state)

**Xóa hoàn toàn** khối `AnimatePresence` chứa:
- Hero Brainstorm Card (khi topic trống)
- `InlineTopicSuggestions` (compact)
- `TopicRefinementSuggestions` (khi topic đủ dài)
- Secondary Brainstorm Button

**Thay bằng** `TopicIdeaHub` đặt ngay dưới textarea (luôn hiển thị), giống Carousel:
```
<TopicIdeaHub
  suggestions={enhancedSuggestions}
  source={suggestionsSource}
  isLoading={suggestionsLoading}
  onSelect={(topic) => setFormData(prev => ({ ...prev, topic }))}
  onRefresh={refreshSuggestions}
  onBrainstorm={() => setShowBrainstormSheet(true)}
  onSave={saveSuggestion}
  onFeedback={submitFeedback}
  disabled={isLoading}
  showEnhancedInfo={true}
  brandTemplateId={formData.brandTemplateId}
  contentGoal={scriptContentGoal}
/>
```

### 4. Xóa `ScriptTopicDiscoveryPanel` ở cuối

Xóa block `ScriptTopicDiscoveryPanel` (dòng ~648-655) — không cần nữa vì `TopicIdeaHub` đã thay thế.

### 5. Giữ lại các tính năng riêng của Script

- `TopicAngleSelector` + `TopicAnglePreview` — vẫn giữ, hiển thị khi topic ≥ 20 ký tự
- `ComplianceWarningBadge` — vẫn giữ
- `TopicBrainstormSheet` — vẫn giữ (được trigger từ TopicIdeaHub)

### 6. Dọn import không dùng

Xóa import `ScriptTopicDiscoveryPanel`, `InlineTopicSuggestions`, `EnhancedTopicSuggestion` (type cũ). Thêm import `TopicIdeaHub`, `useEnhancedTopicSuggestions`.

## Kết quả mong đợi

- Phần chủ đề Script trông giống hệt Carousel: textarea gọn + TopicIdeaHub với quick chips
- Vẫn giữ TopicAngle + Compliance riêng cho Script
- Code đơn giản hơn, bớt 1 component (`ScriptTopicDiscoveryPanel`) và logic AnimatePresence phức tạp

