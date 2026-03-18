

# Fix chip quick-action không hoạt động trong form đa kênh

## Nguyên nhân gốc

CarouselForm hoạt động vì nó dùng `isEnhancing` làm loading state:
```typescript
// CarouselForm.tsx — HOẠT ĐỘNG
isEnhancing: suggestionsLoading,  // maps to suggestEnhancing ✅
```

MultiChannelForm dùng `isLoading` — state này chỉ được set `true` khi `allSuggestions.length === 0` (lần load đầu tiên), **không bao giờ** được set khi gọi `refreshSuggestions()`:
```typescript
// MultiChannelFormWizard.tsx — KHÔNG HOẠT ĐỘNG  
isLoading: isSuggestionsLoading,  // maps to suggestLoading ❌ (never true on refresh)
```

Kết quả: chip click → `loadingCategory` được set → nhưng `isLoading` vẫn `false` → `useEffect` reset `loadingCategory = null` ngay lập tức → không có spinner, không có visual feedback.

## Giải pháp

Thay `isLoading` bằng `isEnhancing` trong cả 2 form đa kênh, giống cách CarouselForm đang làm.

### File sửa

1. **`src/components/multichannel/MultiChannelFormWizard.tsx`**
   - Destructure thêm `isEnhancing` từ `useEnhancedTopicSuggestions`
   - Truyền `isLoading={isSuggestionsEnhancing}` vào `TopicIdeaHub`

2. **`src/components/multichannel/MultiChannelFormStepper.tsx`**
   - Tương tự: destructure `isEnhancing` và dùng nó cho `TopicIdeaHub`

Thay đổi nhỏ — chỉ sửa 2 dòng mỗi file.

