## Mục tiêu
Hoàn thiện chế độ "Cần cho SEO" cho `MultiChannelFormWizard`: bỏ UI bị trùng, truyền đúng context xuống edge function, và đồng bộ keyword khi user pick 1 topic gợi ý. Không đổi schema/route, không đụng các hệ khác.

## Vấn đề phát hiện

1. **Trùng UI Pillar/Keyword khi mode = `seo`**  
   `SeoFirstEntry` đã render `PillarKeywordSection variant="card"` (dòng 1177), nhưng phía dưới (dòng 1343) lại render thêm `PillarKeywordSection variant="inline"` cộng banner heuristic của idea-mode + cảnh báo long-form (1376). User thấy 2 ô "Cần cho SEO" + 2 ô Keyword target.

2. **Edge `suggest-cluster-topics` bỏ qua keyword đã chọn**  
   Cache key client gồm `selectedKeywordIds`, nhưng edge function chỉ nhận `clusterId` → đổi keyword không đổi kết quả AI. Mode SEO mất ý nghĩa "thu hẹp top-5".

3. **Pick topic gợi ý không đồng bộ keyword target**  
   `SuggestedTopicsFromKeyword` gửi `s.keyword_ids` ra, nhưng wizard chỉ nhận `title`. Topic được gắn nhưng `targetKeywordIds` của form không cập nhật theo bài AI gợi ý → lệch context khi generate.

4. **Thiếu chỉ dẫn flow**  
   Trong mode SEO chưa có hint "đã chọn pillar → nhấn Gợi ý topic" rõ ràng khi cluster chưa chọn keyword.

## Giải pháp

### A. Wizard — chỉ render 1 block Pillar/Keyword theo mode
File: `src/components/multichannel/MultiChannelFormWizard.tsx`
- Wrap khối `PillarKeywordSection variant="inline"` (1342–1381) và banner cảnh báo long-form trong điều kiện `entryMode === 'idea'`. Mode `seo` đã có block đầy đủ ở `SeoFirstEntry`.
- Mở rộng `onPickTopic` của `SeoFirstEntry` để nhận thêm `keywordIds` và set vào `formData.targetKeywordIds` khi user chọn 1 topic gợi ý.

### B. `SeoFirstEntry` & `SuggestedTopicsFromKeyword` — emit keyword khi pick
- Đổi prop `onPick(title)` → `onPick(title, keywordIds)` trong `SuggestedTopicsFromKeyword`.
- `SeoFirstEntry` forward đúng signature ra wizard.

### C. Edge `suggest-cluster-topics` — nhận `selectedKeywordIds`
File: `supabase/functions/suggest-cluster-topics/index.ts`
- Đọc thêm `selectedKeywordIds: string[]` từ body (optional).
- Nếu có và non-empty: ưu tiên đẩy các keyword này lên đầu `kwBlock` + thêm chỉ thị "Tập trung phủ trước các keyword được đánh dấu [TARGET]".
- Vẫn giữ logic uncovered để không lệch.
- Trả thêm `usedTargetIds` để client log/debug.

### D. Client gọi đúng payload
- `SuggestedTopicsFromKeyword.generate()` truyền `selectedKeywordIds` xuống edge function.
- Cache key giữ nguyên (đã include sortedKeywordIds → đúng).

### E. Hint UX nhỏ
- Trong `SeoFirstEntry` thêm hint một dòng phía dưới topic suggestions khi `clusterId` đã chọn nhưng `selectedKeywordIds.length === 0`: "Chọn 1–5 keyword target để AI tập trung."

## Phạm vi không đụng
- Schema DB, RLS, route, tên cột `pillar_keyword_id`.
- `useEntryMode`, `EntryModeSwitcher`, `ClusterPicker`, `KeywordTargetPicker` (đã ổn).
- Idea mode flow.

## Files sẽ sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — gate inline block theo mode + nhận keywordIds khi pick topic.
- `src/components/multichannel/SeoFirstEntry.tsx` — đổi signature `onPickTopic` + hint khi chưa chọn keyword.
- `src/components/seo/SuggestedTopicsFromKeyword.tsx` — emit keywordIds + truyền `selectedKeywordIds` vào invoke.
- `supabase/functions/suggest-cluster-topics/index.ts` — nhận & ưu tiên `selectedKeywordIds` trong prompt.

## Kết quả mong đợi
- Mode "Cần cho SEO": chỉ 1 block Pillar/Keyword duy nhất, gọn.
- Click "Gợi ý topic" → AI bias theo top-5 keyword đã chọn (đổi keyword → đổi gợi ý).
- Click 1 topic → cả `topic` và `targetKeywordIds` được set đồng bộ → step generate dùng đúng keyword AI đã chọn.
