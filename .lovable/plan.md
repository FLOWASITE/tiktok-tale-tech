

# Thêm Popup chi tiết điểm từng yếu tố khi click chỉ số

## Ý tưởng
Khi user click vào bất kỳ chỉ số nào trên MockupScoreBar (Chất lượng, GEO, SEO, Tương tác), hiển thị Popover chi tiết điểm từng yếu tố con thay vì tooltip đơn giản.

## Dữ liệu hiện có

| Chỉ số | Data chi tiết | Nguồn |
|--------|--------------|-------|
| **GEO** | `factor_scores`: answer_first, citation_signals, content_depth, entity_clarity, structured_data, extractability, heading_hierarchy, freshness | `geo_content_scores.factor_scores` từ DB |
| **Chất lượng** | Chỉ có 1 số (0-10) — không có breakdown | `critique_score` |
| **Tương tác** | Tính heuristic realtime — có thể breakdown | Tính inline |
| **SEO** | Tính heuristic realtime — có thể breakdown | `calculateSEOScore()` |

## Giải pháp

### 1. Truyền `geoFactorScores` từ MultiChannelViewer → MockupScoreBar
- Truyền `geoScoreData?.factor_scores` qua ContentMockupToggle xuống MockupScoreBar
- Thêm prop `geoFactorScores?: Record<string, number>`

### 2. Chuyển Tooltip → Popover (click-to-open) trong MockupScoreBar
- Import `Popover, PopoverTrigger, PopoverContent` thay thế Tooltip cho mỗi chỉ số
- Click vào chỉ số → hiện Popover với bảng chi tiết từng yếu tố
- GEO: Hiển thị 8 yếu tố với tên tiếng Việt, điểm, progress bar mini, trọng số
- Chất lượng: Hiển thị mô tả các tiêu chí đánh giá (không có breakdown số)
- Tương tác: Breakdown 6 yếu tố heuristic (CTA, emoji, hashtag, câu hỏi, độ dài, cấu trúc)
- SEO: Breakdown các yếu tố SEO (headings, keyword, links, word count...)

### 3. Tạo hàm breakdown cho Engagement và SEO
- `getEngagementBreakdown(content)` → trả về mảng `{ label, score, max }` cho từng yếu tố
- `getSEOBreakdown(content)` → tương tự

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/preview/MockupScoreBar.tsx` | Tooltip → Popover, hiển thị bảng factor scores |
| `src/components/viewer/ContentMockupToggle.tsx` | Forward `geoFactorScores` prop |
| `src/components/MultiChannelViewer.tsx` | Truyền `geoScoreData?.factor_scores` |

