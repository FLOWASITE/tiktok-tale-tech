

# Tích hợp Blog với hệ thống Flowa — Dynamic Blog Publishing

## Tổng quan

Hiện tại blog đang dùng các component React tĩnh (BlogPostFlowa.tsx, BlogPostMultiChannel.tsx...). Để Flowa có thể tự động đăng bài blog, cần chuyển sang mô hình **dynamic blog** lưu trữ trong database, kết nối với pipeline content của Flowa.

## Kiến trúc

```text
Flowa AI Agent Pipeline
  → generate-multichannel (website_content + website_seo_data)
  → publish-website / publish-blog (mới)
  → blog_posts table (mới)
  → Landing Blog UI (đọc từ DB)
```

## Thay đổi

### 1. Tạo bảng `blog_posts` (Migration)

Lưu trữ bài viết blog với đầy đủ metadata:

| Column | Type | Mô tả |
|--------|------|-------|
| id | uuid | PK |
| slug | text | URL slug, unique |
| title | text | Tiêu đề bài viết |
| excerpt | text | Mô tả ngắn |
| content | text | Nội dung HTML/Markdown |
| cover_image | text | URL ảnh bìa |
| category | text | Danh mục (Product, Strategy, AI...) |
| tags | text[] | Tags |
| author_name | text | Tên tác giả |
| author_avatar | text | Avatar tác giả |
| read_time | text | Thời gian đọc |
| status | text | draft / published / archived |
| seo_title | text | SEO meta title |
| seo_description | text | SEO meta description |
| organization_id | uuid | FK → organizations |
| content_id | uuid | FK → multi_channel_contents (liên kết với content Flowa) |
| published_at | timestamptz | Ngày xuất bản |
| created_at / updated_at | timestamptz | Timestamps |

RLS: Bài `published` → public read. Insert/Update → org member.

### 2. Seed dữ liệu từ blog tĩnh hiện tại

Chuyển 4 bài blog hiện tại thành records trong `blog_posts` table để giữ nguyên nội dung.

### 3. Cập nhật Blog List (`Blog.tsx`)

- Fetch danh sách bài từ `blog_posts` table thay vì hardcode
- Query: `select * from blog_posts where status = 'published' order by published_at desc`
- Giữ nguyên UI hiện tại (featured post, grid, pagination)

### 4. Tạo Dynamic Blog Post Renderer

- Thay thế switch/case routing bằng fetch content từ DB theo slug
- Render HTML/Markdown content dynamically
- Giữ nguyên các component hỗ trợ: ReadingProgress, SocialShare, BlogReactions, BlogComments, RelatedPosts, TOC
- Parse headings từ content để tự động tạo Table of Contents
- Fallback: Nếu slug khớp với 4 bài tĩnh cũ → vẫn render component tĩnh (backward compatibility)

### 5. Edge Function `publish-blog`

Tạo function mới hoặc mở rộng `publish-website` để hỗ trợ đăng bài trực tiếp vào `blog_posts` table:

- Input: title, content, excerpt, slug, cover_image, category, tags, seo_data, content_id
- Logic: Insert/upsert vào `blog_posts` với status `draft` hoặc `published`
- Tích hợp vào `channel-publisher` gateway (thêm action `blog`)

### 6. Cập nhật Channel Publisher

Thêm `blog: 'publish-blog'` vào `PLATFORM_FUNCTION_MAP` trong `channel-publisher/index.ts`.

## Files thay đổi

- **Migration**: Tạo bảng `blog_posts` + RLS policies
- **New**: `supabase/functions/publish-blog/index.ts`
- **Edit**: `supabase/functions/channel-publisher/index.ts` — thêm route blog
- **Edit**: `src/landing/pages/Blog.tsx` — fetch từ DB
- **Edit**: `src/landing/pages/BlogPost.tsx` — dynamic renderer + fallback static
- **New**: `src/landing/components/DynamicBlogPost.tsx` — component render bài viết dynamic
- **Edit**: `src/components/blog/index.ts` — cập nhật blogPostsData source

## Lưu ý

- 4 bài blog tĩnh hiện tại vẫn hoạt động qua fallback
- Bài mới từ Flowa sẽ tự động hiển thị trên blog sau khi publish
- SEO metadata được quản lý trong DB, SEOHead component render dynamic

