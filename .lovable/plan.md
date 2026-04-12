

# Hoàn thiện Templates USP theo Ngành Hàng

## Issues hiện tại

1. **Thiếu category "Khác"**: `other` chưa có templates
2. **Visibility hạn chế**: Templates chỉ hiện khi USP list rỗng (dòng 543)
3. **Không thể re-show**: Sau khi thêm USP, templates biến mất vĩnh viễn
4. **UX chưa tốt**: Không có nút refresh hoặc thêm tất cả templates

## Thay đổi

### 1. Thêm templates cho category "Khác"
**File**: `src/components/brand/ProductCatalogEditor.tsx`
- Thêm `other: ['Uy tín 10+ năm', 'Giá cạnh tranh', 'Hỗ trợ tận tâm', 'Giải pháp tùy chỉnh']` vào `CATEGORY_USP_TEMPLATES`

### 2. Cải thiện visibility logic
**File**: `src/components/brand/ProductCatalogEditor.tsx`
- Thay đổi condition: templates luôn hiển thị khi có category được chọn
- Chỉ filter ra những template chưa được thêm (không ẩn toàn bộ section)
- Thêm collapse/expand để tiết kiệm không gian

### 3. Thêm "Thêm tất cả" button
**File**: `src/components/brand/ProductCatalogEditor.tsx`
- Nút nhỏ "Thêm tất cả" ở góc templates section
- Click để thêm tất cả templates chưa có vào USP list

### 4. Phân biệt visual rõ hơn
**File**: `src/components/brand/ProductCatalogEditor.tsx`
- AI suggestions: border-primary/20, Sparkles icon
- Category templates: border-amber/20, Lightbulb icon
- Rõ ràng hơn cho marketer phân biệt nguồn gợi ý

## Files thay đổi
- **Edit**: `src/components/brand/ProductCatalogEditor.tsx` (templates logic + UI)

## Không thay đổi
- AI suggest USP logic
- Quality scoring
- Database schema

