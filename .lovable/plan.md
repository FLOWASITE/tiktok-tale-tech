## 🎯 Vấn đề

Trên form **Tạo Kịch bản Video** (`/scripts/new`), khi click vào các chip:
- 🔥 Viral tuần này
- 📈 Theo trend
- 🎁 Mùa lễ hội
- ⚡ So sánh A vs B
- 🔄 Refresh icon (góc phải)

→ **Nhìn như không có gì xảy ra** (không spinner, không update list trong tích tắc, người dùng bấm lại nghĩ là hỏng).

> Lưu ý: Backend (edge function `topic-ai`) vẫn fire request đúng với `categoryHint`, nhưng UX feedback bị gãy nên trông như không hoạt động. Multichannel & Carousel cũng dùng cùng component nên đang bị bug giống hệt — chỉ chưa ai phát hiện.

## 🔍 Root Cause (đã trace xong)

File `src/hooks/ai/useTopicAI.ts` — hàm `fetchSuggestions` (line 803):

```ts
const fetchSuggestions = useCallback(async (forceRefresh = false, categoryHint?: string) => {
  // ...
  setSuggestEnhancing(true);   // ← chỉ set "enhancing"
  // KHÔNG set setSuggestLoading(true)
  // ...
});
```

Nhưng module export ra:
```ts
suggestions: {
  isLoading: suggestLoading,    // ← luôn = false trong lúc refresh
  isEnhancing: suggestEnhancing,
  ...
}
```

**Hệ quả dây chuyền**:
1. `ScriptFormStepper` lấy `isLoading: suggestionsLoading` → truyền vào `TopicIdeaHub` → truyền tiếp vào `TopicSuggestionPanel`.
2. **Refresh icon** (`TopicSuggestionPanel` line 967): icon không quay (`isLoading && "animate-spin"` = false).
3. **Category chips** (`TopicIdeaHub` line 65-69):
   ```ts
   useEffect(() => {
     if (!isLoading && loadingCategory) setLoadingCategory(null);
   }, [isLoading, loadingCategory]);
   ```
   → Vì `isLoading` luôn false, effect chạy ngay sau khi `setLoadingCategory(label)`, **reset về null trước khi React kịp render spinner** → chip không bao giờ hiện trạng thái loading.
4. Người dùng click → không thấy gì → click lại → `if (loadingCategory) return` cũng không chặn được vì state đã reset.

## 🛠 Plan sửa (2 thay đổi nhỏ, an toàn)

### File 1: `src/hooks/ai/useTopicAI.ts` — fix nguồn gốc

Trong `fetchSuggestions` (~line 803-942), set **cả `suggestLoading`** khi refresh do user trigger:

```ts
const fetchSuggestions = useCallback(async (forceRefresh = false, categoryHint?: string) => {
  if (!enabled) return;
  if (suggestIsFetchingRef.current && !forceRefresh) { ... return; }
  
  // ... abort controller setup
  
  suggestIsFetchingRef.current = true;
  // ✅ NEW: bật suggestLoading khi user chủ động refresh / chọn category
  if (forceRefresh) setSuggestLoading(true);
  setSuggestEnhancing(true);
  // ...
  
  // trong finally / cleanup:
  setSuggestEnhancing(false);
  if (forceRefresh) setSuggestLoading(false);   // ✅ tắt khi xong
}, [...]);
```

→ Refresh icon sẽ quay, chip sẽ hiện `Loader2` spinner đúng vài giây cho đến khi suggestions mới về.

### File 2: `src/components/topic/TopicIdeaHub.tsx` — defensive fix cho chip

Chip đang reset quá nhanh do effect chỉ phụ thuộc `isLoading`. Đổi sang dùng `isEnhancing` HOẶC thêm minimum-delay 600ms để guarantee user thấy feedback ngay cả khi cache trả về tức thì:

```ts
// Approach A (preferred): theo dõi cả enhancing
useEffect(() => {
  if (!isLoading && !isEnhancing && loadingCategory) {
    setLoadingCategory(null);
  }
}, [isLoading, isEnhancing, loadingCategory]);
```

→ Cần thêm prop `isEnhancing?: boolean` vào `TopicIdeaHubProps` và pass từ `ScriptFormStepper` (đã có sẵn `suggestionsModule.isEnhancing` trong wrapper, chỉ cần expose qua `useEnhancedTopicSuggestions`).

### File 3 (optional): `src/components/script/ScriptFormStepper.tsx`

Pass thêm `isEnhancing={enhancingState}` vào `<TopicIdeaHub>` để chip có feedback chính xác.

## ✅ Kết quả mong đợi

| Action | Trước | Sau |
|---|---|---|
| Click chip "Theo trend" | Không feedback, list im lìm 5-10s | Chip biến thành button đậm + spinner, list hiện skeleton, sau ~3-8s ra suggestions mới |
| Click refresh icon | Icon đứng yên | Icon quay liên tục đến khi xong |
| Click "Brainstorm AI" | ✅ Vẫn OK (mở Sheet) | ✅ Không đổi |

## 🌐 Lan tỏa

Vì `useEnhancedTopicSuggestions` + `TopicIdeaHub` được dùng chung ở:
- `ScriptFormStepper` (Video Script)
- `MultiChannelFormStepper` / `MultiChannelFormWizard` (Đa kênh)
- `CarouselForm` (Carousel)

→ Fix một lần, **3 form đều được lợi**. Không có breaking change.

## 📌 Không thay đổi

- Logic backend `topic-ai` edge function (đang chạy đúng).
- Format/contentGoal mapping cho script.
- Brainstorm AI sheet flow.
