

# Nâng cấp GEO Scoring — từ 80 lên 90+ điểm

## 5 vấn đề cần sửa

| # | Vấn đề | Tác động |
|---|--------|----------|
| 1 | Model scoring quá yếu (`flash-lite`) | Chấm thiếu chính xác, cho điểm "safe" |
| 2 | Prompt thiếu rubric chi tiết | AI không biết scale nào cho 90 vs 70 |
| 3 | `structured_data` đánh giá schema markup trong text | Text thuần luôn bị 0-30, kéo tổng xuống |
| 4 | Content bị cắt 6000 chars | Bài dài mất phần cuối |
| 5 | Chỉ chấm 1 lần, không feedback loop | Nội dung không được cải thiện |

## Giải pháp

### 1. Nâng model scoring → `gemini-2.5-flash`
- Thay `gemini-2.5-flash-lite` bằng `gemini-2.5-flash` (cân bằng hơn)
- Đánh giá chính xác hơn, phân biệt tốt hơn giữa 80 và 95

### 2. Thêm rubric chi tiết vào scoring prompt
- Mỗi yếu tố có mô tả rõ: 90-100 = gì, 70-89 = gì, dưới 70 = gì
- Ví dụ: answer_first 90+ = "Câu đầu tiên mỗi section trả lời trực tiếp, có số liệu"

### 3. Đổi `structured_data` → đánh giá cấu trúc nội dung
- Thay vì đòi JSON-LD/schema markup (không áp dụng cho text), đánh giá:
  - Có bullet lists, numbered lists không?
  - Có bảng so sánh không?
  - Có FAQ format không?
- Phù hợp hơn với nội dung Markdown

### 4. Tăng limit content → 10000 chars
- Cho phép đánh giá nhiều nội dung hơn

### 5. Cải thiện generation prompt — thêm ví dụ cụ thể
- Thêm ví dụ "trước/sau" vào GEO guidelines
- Thêm yêu cầu: "PHẢI có ít nhất 5 citations cụ thể" thay vì chỉ nói "nên có"

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/geo-score-content/index.ts` | Nâng model, thêm rubric, đổi structured_data criteria, tăng char limit |
| `supabase/functions/_shared/geo-prompt-guidelines.ts` | Thêm ví dụ cụ thể, yêu cầu mạnh hơn cho citations/answer-first |

