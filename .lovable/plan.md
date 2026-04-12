

# Nâng cấp Format bài viết Blog

## Vấn đề hiện tại

Bài viết đã render đúng Markdown nhưng thiếu các yếu tố visual để trông chuyên nghiệp:
- Headings không có khoảng cách và style nổi bật
- Không có highlight cho blockquote, code blocks
- Bullet list thiếu spacing
- Thiếu divider giữa các section
- TOC sidebar quá đơn giản
- Header bài viết thiếu author avatar và visual hierarchy

## Giải pháp

### 1. Thêm custom prose styles vào `src/index.css`

Thêm Tailwind `@layer` cho typography plugin với custom styles:
- Headings có gradient accent border-left hoặc underline
- Blockquote có background và left-border màu primary
- Lists có spacing tốt hơn, custom bullet color
- Links có underline và hover effect
- Paragraphs có line-height thoáng hơn (1.8)
- Code inline có background highlight
- HR có gradient style

### 2. Cải thiện `DynamicBlogPost.tsx`

- **Header**: Thêm author avatar placeholder, separator đẹp hơn giữa metadata
- **ReactMarkdown components**: Custom render cho blockquote, links, images (rounded + shadow), code blocks (syntax highlight background)
- **TOC sidebar**: Thêm left border indicator, active state highlight, smooth scroll
- **Section dividers**: Thêm gradient divider giữa content và tags/comments
- **Reading time + date**: Badge style thay vì plain text

### 3. Responsive improvements

- Mobile: TOC chuyển thành collapsible section trên đầu bài
- Tăng font-size cho mobile reading

## Files thay đổi

- **Edit**: `src/index.css` — thêm custom prose/typography styles
- **Edit**: `src/landing/components/DynamicBlogPost.tsx` — nâng cấp layout, custom components, TOC styling

