import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Helmet } from 'react-helmet-async';
import { Clock, User, Calendar, ArrowLeft, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/landing/components/LandingNav';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
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

// Generate heading id from text
const toHeadingId = (text: string) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

const DynamicBlogPost = ({ post }: DynamicBlogPostProps) => {
  const articleRef = useRef<HTMLElement>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const markdownContent = stripSeoMetadata(ensureMarkdownFormat(post.content || ''));

  // Extract headings for TOC
  const headings = markdownContent
    .split('\n')
    .filter((line) => /^#{2,3}\s/.test(line))
    .map((line) => {
      const match = line.match(/^(#{2,3})\s+(.*)/);
      if (!match) return null;
      const level = match[1].length;
      const text = match[2].trim();
      const id = toHeadingId(text);
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

  const authorInitial = post.author_name?.[0]?.toUpperCase() || 'F';

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

      {/* Hero image */}
      {post.cover_image && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full rounded-2xl object-cover max-h-[420px] shadow-lg"
          />
        </div>
      )}

      <article ref={articleRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10">
          {post.category && (
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs tracking-wide uppercase">
              {post.category}
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 tracking-tight leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed">{post.excerpt}</p>
          )}

          {/* Author & meta row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              {post.author_avatar ? (
                <AvatarImage src={post.author_avatar} alt={post.author_name || ''} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground">
              {post.author_name && (
                <span className="font-medium text-foreground">{post.author_name}</span>
              )}
              <span className="hidden sm:inline text-border">·</span>
              <div className="flex items-center gap-3">
                {formattedDate && (
                  <time className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate}
                  </time>
                )}
                {post.read_time && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {post.read_time}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <Separator className="mb-8" />

        {/* Mobile TOC */}
        {headings.length > 0 && (
          <div className="lg:hidden mb-8">
            <Collapsible open={tocOpen} onOpenChange={setTocOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-sm font-medium">
                  Mục lục ({headings.length} phần)
                  <ChevronDown className={`w-4 h-4 transition-transform ${tocOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <nav className="space-y-1">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      onClick={() => setTocOpen(false)}
                      className={`blog-toc-link ${h.level === 3 ? 'pl-5' : 'pl-3'}`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_220px] gap-10">
          {/* Content */}
          <div className="blog-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children, ...props }) => (
                  <h1 id={toHeadingId(String(children))} {...props}>{children}</h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 id={toHeadingId(String(children))} {...props}>{children}</h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 id={toHeadingId(String(children))} {...props}>{children}</h3>
                ),
                a: ({ children, href, ...props }) => (
                  <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} {...props}>
                    {children}
                  </a>
                ),
                img: ({ src, alt, ...props }) => (
                  <figure className="my-8">
                    <img src={src} alt={alt || ''} className="w-full rounded-xl shadow-md" loading="lazy" {...props} />
                    {alt && <figcaption className="text-center text-sm text-muted-foreground mt-3 italic">{alt}</figcaption>}
                  </figure>
                ),
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto my-8 rounded-lg border border-border">
                    <table className="w-full border-collapse" {...props}>{children}</table>
                  </div>
                ),
                thead: ({ children, ...props }) => (
                  <thead className="bg-muted/60" {...props}>{children}</thead>
                ),
                tr: ({ children, ...props }) => (
                  <tr className="even:bg-muted/20" {...props}>{children}</tr>
                ),
                th: ({ children, ...props }) => (
                  <th className="text-left font-semibold py-3 px-4 border-b border-border text-foreground text-sm" {...props}>{children}</th>
                ),
                td: ({ children, ...props }) => (
                  <td className="py-3 px-4 border-b border-border/50 text-muted-foreground text-sm" {...props}>{children}</td>
                ),
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>

          {/* TOC sidebar (desktop) */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h4 className="font-medium text-xs mb-4 text-muted-foreground uppercase tracking-widest">
                  Mục lục
                </h4>
                <nav className="space-y-0.5 border-l border-border/50 pl-0">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`blog-toc-link ${h.level === 2 ? 'pl-4' : 'pl-7'}`}
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
          <>
            <Separator className="mt-10 mb-6" />
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal px-3 py-1">
                  #{tag}
                </Badge>
              ))}
            </div>
          </>
        )}

        {/* Social & reactions */}
        <Separator className="mt-8 mb-6" />
        <SocialShare title={post.title} />

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
