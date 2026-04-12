

# Fix: Bảng Markdown không render đúng trên Blog

## Nguyên nhân

`ReactMarkdown` mặc định chỉ hỗ trợ Markdown cơ bản. Bảng (table), strikethrough, autolink... thuộc **GFM (GitHub Flavored Markdown)** và cần plugin `remark-gfm`. Hiện tại project chưa cài plugin này, nên bảng hiển thị dạng text thô `| ... | ... |`.

## Giải pháp

### 1. Cài đặt `remark-gfm`

```bash
npm install remark-gfm
```

### 2. Sửa `DynamicBlogPost.tsx`

- Import `remarkGfm` và truyền vào `ReactMarkdown` qua prop `remarkPlugins={[remarkGfm]}`
- Thêm custom component cho `table`, `thead`, `tbody`, `tr`, `th`, `td` để styling đẹp (border, padding, striped rows)

### 3. Thêm table styles vào `src/index.css`

Thêm CSS cho `.blog-prose table` với:
- Border và border-collapse
- Header có background highlight
- Alternating row colors
- Responsive overflow-x scroll trên mobile

## Files thay đổi

- **Install**: `remark-gfm`
- **Edit**: `src/landing/components/DynamicBlogPost.tsx` — thêm remarkGfm plugin + table components
- **Edit**: `src/index.css` — thêm table styles cho `.blog-prose`

