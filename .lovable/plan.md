

# Thêm cộng ngang + cộng dọc cho Brands và Đóng góp

## Thay đổi trong `AdminWorkspacesTab.tsx`

### Brands section (lines 164-204)
- **Cộng ngang**: Mỗi brand row thêm tổng `b.content_count + b.image_count` ở cuối
- **Cộng dọc**: Sau danh sách brands, thêm dòng footer tổng: Σ content_count, Σ image_count, Σ total

### Đóng góp section (lines 206-251)
- **Cộng ngang**: Mỗi member row thêm tổng `contentCount + imageCount + carouselCount + scriptCount` ở cuối
- **Cộng dọc**: Sau danh sách contributions, thêm dòng footer tổng: Σ contentCount, Σ imageCount, Σ carouselCount, Σ scriptCount, Σ total

### Style
- Tổng ngang: `font-bold text-primary` để nổi bật
- Dòng tổng dọc: border-top, text muted + bold, đặt ngoài scroll area

| File | Thay đổi |
|------|----------|
| `src/components/admin/AdminWorkspacesTab.tsx` | Thêm tổng ngang per row + footer tổng dọc cho cả 2 section |

