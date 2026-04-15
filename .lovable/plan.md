

## Lọc Kho chủ đề theo Brand hiện tại

### Vấn đề
`useTopicHistory` trong `TopicSuggestionPanel` được gọi **không truyền `brandTemplateId`**, nên hiển thị tất cả topic của user/org bất kể brand nào. Cần lọc chỉ hiện topic thuộc brand đang chọn.

### Thay đổi

**File: `src/components/TopicSuggestionPanel.tsx`**

1. Truyền `brandTemplateId` vào `useTopicHistory`:
```tsx
const { history: topicHistory, ... } = useTopicHistory({
  enabled: true,
  brandTemplateId,
});
```

2. Nếu `brandTemplateId` không được truyền từ parent, fallback lấy từ `useCurrentBrand()`:
```tsx
import { useCurrentBrand } from '@/contexts/BrandContext';
// ...
const { currentBrand } = useCurrentBrand();
const effectiveBrandId = brandTemplateId || currentBrand?.id;
```

Rồi truyền `effectiveBrandId` vào hook. Khi user đổi brand, kho chủ đề tự động cập nhật.

### Không thay đổi
- Database, hook `useTopicHistory` (đã hỗ trợ filter `brand_template_id` sẵn), các file khác

