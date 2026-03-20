

# Gộp Tab Caption & CTA trong CarouselViewer

## Thay đổi

Gộp 2 tab "Caption" và "CTA" thành 1 tab duy nhất "Caption & CTA", giảm số tab từ 5 xuống 4.

### File: `src/components/CarouselViewer.tsx`

**Tab bar (dòng ~706-713)**:
- Xóa TabsTrigger `value="cta"` 
- Đổi TabsTrigger `value="caption"` thành hiển thị "Caption & CTA" (trên desktop), icon giữ `MessageSquare`

**Tab content (dòng ~868-922)**:
- Gộp 2 `TabsContent` thành 1 `TabsContent value="caption"`
- Bên trong chứa 2 section xếp dọc (gap-4):
  - Section 1: Caption (giữ nguyên card + copy button)
  - Section 2: CTA (giữ nguyên card + copy button)
- Thêm nút "Copy tất cả" ở trên cùng để copy cả caption + CTA cùng lúc

**Copy all handler**: 
- Copy format: `{caption}\n\n---\n\n{cta}`

Chỉ sửa 1 file duy nhất.

