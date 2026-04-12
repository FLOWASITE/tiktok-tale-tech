

# Bổ sung chế độ xem "Theo kênh" trong trang Nội dung đa kênh

## Mô tả
Thêm nút thứ 3 vào toggle group (Grid | List | **Theo kênh**) — khi chọn, hiển thị nội dung được nhóm theo từng kênh social (Facebook, X, Instagram, LinkedIn...), mỗi kênh là một section riêng với icon + label + danh sách bài viết thuộc kênh đó.

## Thay đổi

### 1. `src/components/multichannel/MultiChannelHeroSection.tsx`
- Mở rộng `viewMode` type từ `'grid' | 'list'` → `'grid' | 'list' | 'channel'`
- Thêm ToggleGroupItem thứ 3 với icon `Users` (hoặc `Share2`) và value `'channel'`

### 2. `src/components/multichannel/ChannelGroupView.tsx` (file mới)
- Component nhận `contents: MultiChannelContent[]` + callbacks (onView, onDelete...)
- Group contents theo `selected_channels`: mỗi content xuất hiện ở các kênh mà nó target
- Render mỗi kênh như một section:
  - Header: `ChannelIcon` + label + badge số lượng bài
  - Grid cards (reuse `MultiChannelCard`) bên dưới
- Kênh nào không có bài thì ẩn
- Sắp xếp kênh theo số lượng bài giảm dần

### 3. `src/pages/MultiChannel.tsx`
- Đổi type `viewMode` state → `'grid' | 'list' | 'channel'`
- Thêm block render `ChannelGroupView` khi `viewMode === 'channel'`
- Truyền cùng props (onView, onDelete, selectedIds, toggleSelection...)

### Files
| File | Thay đổi |
|------|----------|
| `src/components/multichannel/MultiChannelHeroSection.tsx` | Thêm toggle item "channel" |
| `src/components/multichannel/ChannelGroupView.tsx` | **Mới** — view nhóm theo kênh |
| `src/pages/MultiChannel.tsx` | Wire viewMode 'channel' vào render |

