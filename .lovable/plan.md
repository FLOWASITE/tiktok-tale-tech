## Mục tiêu
Mode **"Theo ý tưởng"** = thuần idea-first. Bỏ toàn bộ UI/logic liên quan đến Keyword + Pillar (Cần cho SEO). Pillar + Keyword chỉ tồn tại ở mode "Cần cho SEO".

## Thay đổi

### 1. `src/components/multichannel/MultiChannelFormWizard.tsx`
- **Xóa block `entryMode === 'idea'` (lines 1344–1386)**: bỏ hẳn `<PillarKeywordSection variant="inline">` + heuristic suggest banner + warning amber "Đang tạo long-form...".
- **Bỏ `useSuggestedPillar` call** (line 496) — không còn dùng.
- **Truyền context có điều kiện** vào `useEnhancedTopicSuggestions` (lines 676–681):
  ```ts
  clusterId: entryMode === 'seo' ? formData.clusterId ?? undefined : undefined,
  targetKeywords: entryMode === 'seo' ? targetKeywordsText : [],
  ```
  → Topic suggestions ở idea mode hoàn toàn không bias theo keyword.
- **Khi user switch mode `idea` → reset SEO state**: trong `setEntryMode` callback (hoặc effect theo `entryMode`), clear `formData.clusterId = null` và `targetKeywordIds = []` để không "lén" gửi xuống backend.
- Bỏ import `useSuggestedPillar`, `PillarKeywordSection` nếu không còn caller khác trong file.

### 2. (Giữ nguyên) `SeoFirstEntry.tsx`, `PillarKeywordSection.tsx`, `useSuggestedPillar.ts`
Không xóa file — vẫn dùng cho SEO mode (PillarKeywordSection variant=card). `useSuggestedPillar` có thể giữ để dùng tương lai hoặc xóa nếu chắc không còn caller.

### 3. `src/hooks/useEntryMode.ts` (optional polish)
Khi auto-switch hoặc manual switch sang `idea`, fire callback để parent reset SEO fields. Hoặc đơn giản hơn: parent tự dùng `useEffect([entryMode])` để clear.

## Kết quả
- Mode "Theo ý tưởng": chỉ có ô Topic + TopicIdeaHub (suggestions thuần theo brand/goal/topic, không gắn keyword nào).
- Mode "Cần cho SEO": giữ nguyên flow Pillar → Keyword → Topic suggestions bám keyword.
- Switch giữa 2 mode = state SEO được reset sạch, không leak xuống generate-multichannel payload.

## Files sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — xóa idea-mode SEO block, conditional pass props, reset state khi switch.

## Không đụng
- Schema, edge functions, SEO mode UI.
