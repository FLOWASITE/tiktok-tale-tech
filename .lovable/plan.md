

# Nâng cấp Bullet List chuyên nghiệp cho Blog

## Hiện tại
- Unordered list: chấm tròn đơn giản (circle dot) màu primary
- Ordered list: số + dấu chấm, không có visual nổi bật
- Không hỗ trợ nested list (danh sách lồng nhau)
- Thiếu icon-style bullets, thiếu hover/transition

## Thay đổi

### 1. Unordered list — Gradient bullet + nested support
- Bullet chính: gradient circle (primary → accent) với subtle shadow
- Nested level 2: dash line (—) nhỏ hơn, indent thêm
- Nested level 3: dot nhỏ outline-only
- Thêm hover effect nhẹ (text sáng hơn khi hover)
- Tăng padding-left cho bullet rõ ràng hơn

### 2. Ordered list — Numbered badge style
- Số thứ tự trong circle badge nhỏ (background primary/10, text primary)
- Font-weight bold cho số
- Nested ordered list: dùng lowercase letter (a, b, c)

### 3. Checklist / task list support (GFM)
- `- [x]` hiển thị checkbox checked với icon ✓ màu primary
- `- [ ]` hiển thị checkbox unchecked với border muted
- Style tương tự Notion/Linear task list

### 4. Spacing & animation
- Thêm `transition-colors` cho hover trên từng `li`
- Tăng `space-y` nhẹ giữa các items

## File thay đổi

- **Edit**: `src/index.css` — Nâng cấp toàn bộ `.blog-prose ul`, `.blog-prose ol`, thêm nested list styles, checklist styles
- **Edit**: `src/landing/components/DynamicBlogPost.tsx` — Thêm custom `li` renderer trong ReactMarkdown components để hỗ trợ GFM task list checkbox

