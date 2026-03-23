

# Giải thích và cải tiến hiển thị chỉ số trên Mockup

## Tình trạng hiện tại

| Chỉ số | Khi nào hiển thị | Tại sao user không thấy |
|--------|-------------------|------------------------|
| **Chất lượng** (critique_score) | Luôn hiện nếu bài viết đã được AI chấm điểm | Hoạt động bình thường |
| **GEO Score** | Chỉ hiện khi user đã bấm "Chấm điểm GEO" trong sidebar | Chưa có bài nào được chấm GEO → `geo_content_scores` trả về rỗng `[]` |
| **Tương tác** (Engagement) | Luôn tính tự động từ nội dung | Đang hoạt động nhưng có thể bị ẩn nếu không có score nào khác |

## Về câu hỏi GEO vs SEO

- **SEO Score**: Hiện chỉ hiển thị cho channel `website` (đúng — SEO là tối ưu cho Google Search truyền thống, chủ yếu áp dụng cho web)
- **GEO Score**: Nên áp dụng cho **tất cả kênh**, không chỉ web. GEO đánh giá khả năng nội dung được AI search (ChatGPT, Gemini, Perplexity) trích dẫn — áp dụng cho mọi nội dung online

## Giải pháp đề xuất

### 1. Tự động chấm GEO Score khi tạo/lưu nội dung
- Hiện tại GEO chỉ được chấm khi user bấm thủ công → rất ít bài có score
- Thêm logic: khi save channel content, tự động gọi `geo-score-content` edge function để chấm điểm
- Score sẽ lưu vào `geo_content_scores` và hiển thị tự động trên MockupScoreBar

### 2. Đảm bảo Engagement Score luôn hiển thị
- Hiện tại engagement score đã được tính nhưng MockupScoreBar ẩn toàn bộ nếu `hasAnyScore === false`
- Engagement score luôn có data (tính từ text) → nên luôn hiển thị

### 3. Hiển thị SEO Score trên MockupScoreBar (chỉ channel website)
- Thêm prop `seoScore` vào MockupScoreBar
- Hiển thị cột SEO bên cạnh GEO khi channel = website

### Files cần sửa
- `src/components/MultiChannelViewer.tsx` — auto-trigger GEO scoring khi save content
- `src/components/preview/MockupScoreBar.tsx` — thêm cột SEO (optional), đảm bảo engagement luôn hiện
- `src/components/viewer/ContentMockupToggle.tsx` — forward seoScore prop

