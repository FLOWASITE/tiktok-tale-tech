

# Nâng Tầm SEO: Các Cải Tiến Nâng Cao

## Hiện trạng đã có
- SEOHead: dynamic title, description, OG, Twitter, canonical, JSON-LD (Article, BreadcrumbList, Organization, WebSite, FAQ)
- Semantic HTML: `<article>`, `<time>`, `loading="lazy"`, sitemap, robots.txt
- Table of Contents, Related Posts, Social Share

## 7 cải tiến nâng cao

### 1. Blog List Schema (CollectionPage JSON-LD)
Trang `/blog` chưa có schema. Thêm `CollectionPage` + `ItemList` schema để Google hiểu đây là trang tổng hợp bài viết, hiển thị rich results dạng carousel.

### 2. Internal Linking tự động trong bài viết
Hiện tại bài viết không link chéo đến nhau trong nội dung (chỉ có RelatedPosts cuối bài). Tạo component `InternalLink` và thêm 2-3 contextual links trong mỗi bài — đây là yếu tố SEO on-page quan trọng nhất mà đang thiếu.

### 3. Table of Contents schema (SiteNavigationElement)
Mỗi bài đều có TOC nhưng chưa có schema. Thêm JSON-LD cho TOC giúp Google tạo "jump to" links trong SERP (sitelinks).

### 4. Estimated Reading Time trong meta + schema
`timeRequired` field trong Article schema giúp Google hiển thị thời gian đọc. Hiện có readTime text nhưng chưa inject vào JSON-LD.

### 5. HowTo Schema cho bài hướng dẫn
Bài "Cách Tạo Content Đa Kênh" và "AI Content Marketing" có dạng step-by-step guide. Thêm `HowTo` schema để Google hiển thị rich snippet dạng steps.

### 6. Tối ưu OG Image riêng mỗi bài
Hiện tất cả bài dùng chung 1 `DEFAULT_OG_IMAGE`. Mỗi bài nên có OG image riêng (dùng hero image) để khi share lên social media sẽ có thumbnail phù hợp.

### 7. Author Schema chi tiết hơn
Hiện author chỉ là `Person` với `name`. Nâng cấp thêm `url`, `sameAs` (social profiles), `jobTitle` để tăng E-E-A-T (Experience, Expertise, Authority, Trust) — yếu tố Google đang ưu tiên cao.

## Chi tiết kỹ thuật

### Files thay đổi
| File | Thay đổi |
|------|----------|
| `SEOHead.tsx` | Thêm `timeRequired`, nâng cấp author schema, nhận `ogImage` per-post |
| `Blog.tsx` | Thêm CollectionPage + ItemList JSON-LD |
| `BlogPostFlowa.tsx` | Thêm OG image riêng, internal links trong nội dung |
| `BlogPostMultiChannel.tsx` | Thêm HowTo schema, OG image, internal links |
| `BlogPostAIContent.tsx` | Thêm HowTo schema, OG image, internal links |
| `BlogPostRepurposing.tsx` | Thêm OG image, internal links |

### SEOHead upgrades
- `ArticleData` interface: thêm `readingTime` (ISO 8601 duration, vd: "PT15M"), `authorUrl`, `authorJobTitle`
- Article JSON-LD: thêm `timeRequired`, `wordCount`, author `url`/`jobTitle`/`sameAs`
- Tạo `HowToSEOSchema` component cho bài hướng dẫn
- Tạo `CollectionPageSchema` component cho trang blog list

### Internal links cần thêm
Trong mỗi bài viết, thêm 2-3 `<Link to="/blog/slug">anchor text</Link>` contextual:
- BlogPostFlowa → link tới bài Repurposing, AI Content
- BlogPostMultiChannel → link tới bài Flowa, Repurposing  
- BlogPostAIContent → link tới bài Flowa, MultiChannel
- BlogPostRepurposing → link tới bài MultiChannel, AI Content

Ước lượng: ~150 dòng code mới/sửa, 6 files.

