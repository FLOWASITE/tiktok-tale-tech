

# Thêm Tooltip giải thích cho từng chỉ số trên MockupScoreBar

## Thay đổi

### Sửa `MockupScoreBar.tsx`
- Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` từ UI components
- Wrap mỗi cột chỉ số trong `Tooltip` + thêm icon `Info` nhỏ (w-3 h-3) bên cạnh label
- Nội dung tooltip cho từng chỉ số:

| Chỉ số | Tooltip |
|--------|---------|
| **Chất lượng** (0-10) | "Điểm đánh giá chất lượng nội dung do AI chấm dựa trên: cấu trúc bài viết, độ rõ ràng thông điệp, tính sáng tạo, phù hợp kênh và thương hiệu" |
| **GEO** (0-100) | "Generative Engine Optimization — đánh giá khả năng xuất hiện trên AI search (ChatGPT, Gemini...) dựa trên 8 yếu tố: citations, statistics, quotes, fluency, authority, unique words, technical terms, content depth" |
| **Tương tác** (0-100%) | "Dự đoán mức độ tương tác dựa trên: độ dài phù hợp, có câu hỏi/CTA, emoji, hashtag, cấu trúc đoạn văn. Đây là ước tính, không phải số liệu thực tế" |

- Thêm `TooltipProvider` wrap toàn bộ grid
- Icon `Info` chỉ hiện khi hover vào label area (opacity-0 → group-hover:opacity-100)

### File cần sửa
- `src/components/preview/MockupScoreBar.tsx`

