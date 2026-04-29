## Vấn đề

Trong sidebar "Kênh" của MultiChannelViewer:
- **Blogger** đang dùng icon `Globe` (quả địa cầu) thay vì logo Blogger thật.
- **WordPress** đang dùng icon `Globe` và label rút gọn `WP` thay vì tên đầy đủ `WordPress` + logo WordPress thật.

Tương tự `MultiChannelListView.tsx` cũng còn `wordpress: 'WP'` và `blogger: 'Blog'`.

## Kế hoạch sửa

### 1. `src/components/MultiChannelViewer.tsx`
- Import thêm `BloggerIcon, WordPressIcon` từ `@/components/icons/SocialIcons` (đã có sẵn `PinterestIcon`).
- Sửa entry `blogger`:
  - `icon`: `<BloggerIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />`
  - giữ `shortLabel: 'Blogger'`
- Sửa entry `wordpress`:
  - `icon`: `<WordPressIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />`
  - `shortLabel: 'WordPress'` (thay vì `WP`)

### 2. `src/components/MultiChannelListView.tsx`
- `blogger: 'Blog'` → `blogger: 'Blogger'`
- `wordpress: 'WP'` → `wordpress: 'WordPress'`

## Kết quả mong muốn

Sidebar hiển thị:
```
[logo Blogger cam]   Blogger
[logo WordPress xanh] WordPress
```

Đồng nhất với cách đã sửa cho Pinterest ở lượt trước.