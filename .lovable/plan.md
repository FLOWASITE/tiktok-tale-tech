

# Tích hợp GEO vào quy trình tạo nội dung (viết chuẩn GEO ngay từ đầu)

## Vấn đề

Hiện tại hệ thống **viết xong rồi mới chấm điểm GEO** — nghĩa là AI tạo nội dung bình thường, sau đó mới đánh giá theo 8 yếu tố GEO. Cách đúng là phải **viết theo chuẩn GEO ngay từ đầu** — inject các nguyên tắc GEO vào prompt generation.

## Giải pháp: Inject GEO guidelines vào prompts

### 1. Tạo shared GEO prompt module
- Tạo `supabase/functions/_shared/geo-prompt-guidelines.ts`
- Chứa hướng dẫn viết chuẩn GEO dựa trên 8 yếu tố có trọng số:
  - **Answer-First (15%)**: Câu trả lời trực tiếp ngay đầu đoạn/bài
  - **Citation Signals (15%)**: Luôn kèm số liệu, thống kê, nguồn cụ thể
  - **Content Depth (15%)**: Phân tích đa góc, không hời hợt
  - **Entity Clarity (13%)**: Định nghĩa rõ brand/sản phẩm/khái niệm
  - **Structured Data (12%)**: Dùng lists, tables, FAQ format cho AI dễ trích xuất
  - **Extractability (12%)**: Viết đoạn ngắn, tự chứa (self-contained snippets)
  - **Heading Hierarchy (10%)**: Cấu trúc H1→H2→H3 logic
  - **Freshness (8%)**: Đề cập xu hướng, dữ liệu mới nhất

### 2. Inject vào `generate-core-content`
- Import GEO guidelines và append vào system prompt
- Core Content là "Source of Truth" → cần chuẩn GEO nhất vì nó là gốc cho tất cả kênh
- Thêm GEO requirements vào cả prompt `singlePass`, `outline`, `section`, `compile`

### 3. Inject vào `generate-multichannel`
- Thêm GEO section vào system prompt của multichannel
- Mỗi channel adapt GEO khác nhau:
  - **Website**: Full GEO (heading, schema, citations, FAQ)
  - **Facebook/LinkedIn**: Answer-first, citations, depth
  - **Instagram/TikTok**: Extractability, entity clarity (ngắn gọn nhưng rõ ràng)

### 4. Cập nhật prompt-registry defaults
- Thêm GEO principles vào các default prompts hardcoded
- Đảm bảo cả DB prompts và fallback prompts đều có GEO

## Files cần tạo/sửa

| File | Action |
|------|--------|
| `supabase/functions/_shared/geo-prompt-guidelines.ts` | **Tạo mới** — shared GEO writing guidelines |
| `supabase/functions/_shared/prompt-registry.ts` | Sửa — inject GEO vào default prompts |
| `supabase/functions/generate-core-content/index.ts` | Sửa — import + append GEO guidelines vào system prompt |
| `supabase/functions/generate-multichannel/index.ts` | Sửa — import + inject GEO theo channel type |

## Kết quả

Sau khi implement, mọi nội dung AI tạo ra sẽ tự động tuân thủ 8 yếu tố GEO → điểm GEO sẽ cao ngay từ đầu, không cần optimize lại sau.

