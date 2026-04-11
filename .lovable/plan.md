

# Nâng cấp tính năng USP cho Marketer

## Mục tiêu
Biến USP từ "text field thụ động" thành "marketing intelligence tool" — AI gợi ý, đánh giá chất lượng, và preview trong workflow.

## Thay đổi

### 1. AI Suggest USP (Ưu tiên cao)
**File mới**: `supabase/functions/suggest-usp/index.ts`
- Input: product name, description, category, industry (từ brand template)
- Dùng Lovable AI (gemini-2.5-flash) để generate 5 USP suggestions
- Prompt: phân tích mô tả → đề xuất USP theo framework: Functional benefit, Emotional benefit, Proof point

**File edit**: `src/components/brand/ProductCatalogEditor.tsx`
- Thêm nút "✨ Gợi ý USP" bên cạnh input field
- Khi click → gọi edge function → hiển thị 5 suggestions dạng chip, click để thêm
- Chỉ enable khi có description hoặc name

### 2. USP Quality Indicator (Ưu tiên trung bình)
**File edit**: `src/components/brand/ProductCatalogEditor.tsx`
- Client-side scoring cho mỗi USP tag:
  - Quá ngắn (< 5 ký tự) → ⚠️ vàng
  - Quá generic (match danh sách: "chất lượng tốt", "giá rẻ", "uy tín"...) → ⚠️ vàng
  - Có số liệu cụ thể ("giảm 40%", "2h giao hàng") → ✅ xanh
- Tooltip giải thích tại sao USP yếu/mạnh

### 3. USP Preview trong ProductSelector (Ưu tiên cao)
**File edit**: `src/components/topic/ProductSelector.tsx`
- Khi hover/select product trong dropdown → hiển thị mini preview:
  - 2-3 USP badges
  - Target audience (1 dòng)
  - Benefits count
- Giúp marketer chọn đúng sản phẩm khi tạo content

### 4. USP Templates theo Category (Ưu tiên thấp)
**File edit**: `src/components/brand/ProductCatalogEditor.tsx`
- Khi chọn category → hiển thị 3-4 mẫu USP phổ biến:
  - Sản phẩm vật lý: "Giao hàng trong 2h", "Đổi trả 30 ngày", "Nguyên liệu nhập khẩu"
  - Dịch vụ: "Hỗ trợ 24/7", "Cam kết hoàn tiền", "Chuyên gia 10 năm"
  - Khóa học: "Cấp chứng chỉ", "Mentor 1-1", "Học lại miễn phí"
- Dạng suggestion chips, click để thêm vào USP list

## Files tổng kết
- **Tạo mới**: `supabase/functions/suggest-usp/index.ts`
- **Edit**: `src/components/brand/ProductCatalogEditor.tsx` (AI suggest + quality indicator + templates)
- **Edit**: `src/components/topic/ProductSelector.tsx` (USP preview)

## Không thay đổi
- Backend AI pipeline — đã inject USP đầy đủ
- Database schema — `brand_products.unique_selling_points` đã là `text[]`
- Các edge functions content generation — đã dùng USP đúng cách

