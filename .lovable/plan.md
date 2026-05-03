## Mục tiêu
Trong mode "Cần cho SEO":
- **Bỏ** card "3. Topic gợi ý từ Pillar + Keyword" (khoanh đỏ trong screenshot).
- **Dùng lại** "Ý tưởng chủ đề" (TopicIdeaHub) đã có sẵn ngay phía dưới.
- Topic ý tưởng phải **gắn trực tiếp với Pillar + Keyword target** đã chọn.

## Thay đổi

### 1. `src/components/multichannel/SeoFirstEntry.tsx`
- Xóa block `<Card>` chứa `<SuggestedTopicsFromKeyword>` + icon Sparkles + tiêu đề "3. Topic gợi ý...".
- Bỏ prop `onPickTopic` (không còn được dùng từ đây).
- Component chỉ còn render `PillarKeywordSection` (Pillar + Keyword picker).

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx`
- Bỏ prop `onPickTopic` truyền vào `SeoFirstEntry` (lines 1190–1199).
- Truyền thêm `clusterId` + `selectedKeywordIds` (resolved sang keyword strings) vào `useEnhancedTopicSuggestions` để TopicIdeaHub fetch suggestions có bias theo SEO context.

### 3. `src/hooks/useEnhancedTopicSuggestions.ts` + `src/hooks/ai/useTopicAI.ts`
- Thêm option `clusterId?: string` và `targetKeywords?: string[]` vào `UseTopicAIOptions`.
- Trong `fetchSuggestions`, gửi 2 field này xuống edge function `topic-ai` body.
- Khi giá trị đổi → trigger refetch (giống cách `brandTemplateId` đang làm).

### 4. `supabase/functions/topic-ai/index.ts`
- `handleSuggest`: nhận `clusterId`, `targetKeywords` từ body.
- Khi có `targetKeywords.length > 0`:
  - Inject vào prompt ngay sau `categoryGuidance`:
    ```
    🎯 SEO TARGET: Mỗi topic gợi ý phải bám tự nhiên ít nhất 1 keyword sau:
    - <kw1>
    - <kw2>
    ...
    Topic title nên chứa hoặc paraphrase keyword target.
    ```
  - Include `clusterId` vào cache key để không lẫn cache giữa các Pillar.
- Log `console.log('[topic-ai:suggest] targetKeywords:', targetKeywords?.length)` cho observability.

### 5. (Cleanup nhẹ — không bắt buộc)
- `SuggestedTopicsFromKeyword.tsx` không còn caller trong wizard nhưng vẫn giữ file (có thể dùng nơi khác như SEO Hub). Không xóa.

## Resolve keyword IDs → keyword strings
Trong `MultiChannelFormWizard`, sau khi user chọn `targetKeywordIds`, cần fetch `seo_keywords.keyword` để gửi xuống. 
- Dùng hook nhỏ `useKeywordsByIds(ids)` (TanStack Query, query `seo_keywords` where `id in (...)`, staleTime 60s).
- Hoặc đơn giản hơn: tận dụng data đã có trong `PillarKeywordSection` (kiểm tra trước; nếu component đã expose qua callback `onKeywordIdsChange` được, có thể đổi signature thành `(ids, keywords)`).

→ Approach chọn: **mở rộng `onKeywordIdsChange(ids, keywordObjects)`** trong `PillarKeywordSection` (đã có sẵn dữ liệu keyword). Wizard cache `targetKeywordsText: string[]` trong state để pass xuống hook.

## Files sửa
- `src/components/multichannel/SeoFirstEntry.tsx` — xóa card suggest.
- `src/components/multichannel/MultiChannelFormWizard.tsx` — bỏ onPickTopic, pass cluster+keywords vào hook suggestions, lưu `targetKeywordsText`.
- `src/components/multichannel/PillarKeywordSection.tsx` — mở rộng callback trả thêm keyword strings (nếu chưa).
- `src/hooks/useEnhancedTopicSuggestions.ts` — pass-through option mới.
- `src/hooks/ai/useTopicAI.ts` — accept option, gửi xuống edge function, depend trong refetch effect.
- `supabase/functions/topic-ai/index.ts` — đọc field, inject vào prompt, đưa vào cache key.

## Không đụng
- Idea mode flow (đã đúng sẵn).
- Schema DB, RLS.
- TopicIdeaHub UI (chỉ data đầu vào thay đổi).

## Kết quả
- UI gọn: 1 chỗ duy nhất hiển thị topic ý tưởng (TopicIdeaHub).
- Khi user chọn Pillar + Keyword trong SEO mode → topic suggestions ở TopicIdeaHub tự refresh và bám đúng keyword target.
- Khi user đổi keyword selection → suggestions tự cập nhật.
