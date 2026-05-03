## Mục tiêu
Khi user chọn pillar (cả Mode SEO và Mode Idea), chỉ **pre-fill top-5 keyword theo `priority_score`** thay vì auto-attach TOÀN BỘ keyword của cluster. Giúp AI focus đúng intent, tránh dilute prompt khi cluster có 20–50+ keyword.

## Vấn đề hiện tại
`src/components/seo/ClusterPicker.tsx` (lines 37–49) đang `select id` không limit → trả về tất cả keyword IDs → parent setFormData `targetKeywordIds` = full list.

`PillarKeywordSection` đã có effect pre-fill top-5, NHƯNG chỉ chạy khi `selectedKeywordIds.length === 0`, mà ClusterPicker đã set sẵn full list rồi nên effect không trigger → top-5 logic bị bỏ qua.

## Thay đổi

### `src/components/seo/ClusterPicker.tsx`
Thêm `.order('priority_score', { ascending: false }).limit(5)` vào query trong `handleChange`. Comment rõ "TOP-5 by priority_score — keeps AI focus tight".

### Không cần đổi
- `PillarKeywordSection`: effect pre-fill top-5 vẫn giữ làm fallback (trường hợp parent set clusterId mà không qua picker, vd: từ heuristic suggestion `onAcceptSuggestion` đã đang làm đúng top-5).
- `KeywordTargetPicker`: `max=5` đã giới hạn UI, user vẫn có thể bỏ/đổi.

## Out of scope
- Không đổi backend prompt — `generate-multichannel` vẫn nhận `targetKeywordIds` như cũ.
- Không đổi UI pillar context.
