

# Tại sao chỉ thấy Chất lượng — thiếu GEO, SEO, Tương tác

## Nguyên nhân gốc

| Chỉ số | Tại sao không hiển thị |
|--------|----------------------|
| **GEO Score** | Bảng `geo_content_scores` có **0 dòng**. Edge function `geo-score-content` chưa bao giờ chạy thành công (không có logs). Auto-trigger chỉ kích hoạt khi tạo/lưu nội dung MỚI — các bài viết cũ không có score |
| **SEO Score** | Cột `website_seo_data` trong DB = `null` cho tất cả bài viết. Không có logic nào tính SEO score — chỉ có prop truyền nhưng data không tồn tại |
| **Tương tác** | Đang hoạt động nhưng bị ẩn khi `hasAnyScore === false` (do GEO và SEO đều null, chỉ còn critique). Thực tế engagement **có** được tính nhưng hiển thị đúng |

## Giải pháp

### 1. Fix edge function `geo-score-content` + chạy retroactively
- Kiểm tra và deploy lại edge function (hiện không có logs = chưa deploy hoặc crash)
- Thêm nút "Chấm điểm GEO" trên MockupScoreBar khi chưa có score — cho phép user trigger thủ công
- Khi mở MultiChannelViewer cho bài viết chưa có GEO score → tự động trigger chấm điểm (1 lần)

### 2. Tạo logic tính SEO Score cho channel website
- Tạo hàm `calculateSEOScore()` tính điểm heuristic từ content: có headings (H1-H4), meta description length, keyword density, internal links, độ dài phù hợp (>300 words)
- Tính realtime (như engagement) — không cần edge function
- Chỉ hiển thị cho channel `website`

### 3. Đảm bảo Engagement luôn hiển thị
- Engagement đã được tính nhưng UI logic `hasAnyScore` chỉ kiểm tra `!= null` — engagement luôn có giá trị khi có content → thực tế đã hiển thị cùng Chất lượng
- Xác nhận lại logic, đảm bảo engagement hiện ngay cả khi chỉ có nó

### Files cần sửa
- `supabase/functions/geo-score-content/index.ts` — redeploy, thêm error logging chi tiết
- `src/components/MultiChannelViewer.tsx` — auto-trigger GEO score khi mở viewer cho bài chưa có score
- `src/components/preview/MockupScoreBar.tsx` — thêm nút "Chấm GEO" khi chưa có score, thêm SEO heuristic
- `src/components/viewer/ContentMockupToggle.tsx` — forward channel content cho SEO calculation

### Technical details
- SEO heuristic: headings (+20), meta-like intro (+15), word count >300 (+20), links (+15), keyword repetition (+15), structured paragraphs (+15) = max 100
- GEO auto-trigger on viewer open: dùng `useEffect` check `geoScoreData === null && content.id` → fire once with ref guard

