import { useRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { Clock, User, Calendar, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/landing/components/LandingNav';
import {
  ReadingProgress,
  SocialShare,
  BlogReactions,
  BlogComments,
  RelatedPosts,
  BlogBreadcrumb,
  blogPostsData,
} from '@/components/blog';
import { ensureMarkdownFormat, stripSeoMetadata } from '@/utils/contentFormatter';

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[] | null;
  author_name: string | null;
  author_avatar: string | null;
  read_time: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
}

interface DynamicBlogPostProps {
  post: BlogPostData;
}

const DynamicBlogPost = ({ post }: DynamicBlogPostProps) => {
  const articleRef = useRef<HTMLElement>(null);
  const markdownContent = stripSeoMetadata(ensureMarkdownFormat(post.content || ''));

  // Extract headings for TOC
  const headings = markdownContent
    .split('\n')
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.*)/);
      if (!match) return null;
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      return { level, text, id };
    })
    .filter(Boolean) as { level: number; text: string; id: string }[];

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.seo_title || post.title} | Flowa Blog</title>
        <meta
          name="description"
          content={post.seo_description || post.excerpt || ''}
        />
        <link rel="canonical" href={`https://flowa.vn/blog/${post.slug}`} />
      </Helmet>

      <ReadingProgress containerRef={articleRef} />
      <LandingNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <BlogBreadcrumb postTitle={post.title} />
      </div>

      {/* Hero */}
      {post.cover_image && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full rounded-2xl object-cover max-h-[400px]"
          />
        </div>
      )}

      <article ref={articleRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          {post.category && (
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              {post.category}
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.author_name && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {post.author_name}
              </span>
            )}
            {formattedDate && (
              <time className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </time>
            )}
            {post.read_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.read_time}
              </span>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_200px] gap-8">
          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children, ...props }) => {
                  const id = String(children)
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-');
                  return <h1 id={id} {...props}>{children}</h1>;
                },
                h2: ({ children, ...props }) => {
                  const id = String(children)
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-');
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const id = String(children)
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-');
                  return <h3 id={id} {...props}>{children}</h3>;
                },
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>

          {/* TOC sidebar */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <h4 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
                  Mục lục
                </h4>
                <nav className="space-y-1">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block text-sm text-muted-foreground hover:text-primary transition-colors ${
                        h.level === 2 ? 'pl-0' : h.level === 3 ? 'pl-3' : ''
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border/50">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Social & reactions */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <SocialShare title={post.title} />
        </div>

        <BlogReactions postSlug={post.slug} />
        <BlogComments postSlug={post.slug} />

        <RelatedPosts
          currentSlug={post.slug}
          currentCategory={post.category || ''}
          posts={blogPostsData}
        />

        {/* Back */}
        <div className="mt-12 text-center">
          <Button variant="outline" asChild>
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Blog
            </Link>
          </Button>
        </div>
      </article>
    </div>
  );
};

export default DynamicBlogPost;
