import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import { WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { Search, ShoppingBag, User, Menu, Heart, Share2, Tag } from 'lucide-react';

interface ShopifyMockupProps {
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

/**
 * Shopify storefront blog article look (Dawn theme inspired).
 * Standalone — separate from corporate WebsiteMockup, Blogspot, WordPress.
 * Includes top utility bar + shop navigation + product CTA card at the bottom.
 */
export function ShopifyMockup({
  content,
  brandName,
  logoUrl,
  primaryColor,
  isGenerating,
  seoData,
  channelImage,
}: ShopifyMockupProps) {
  const safeBrand = (brandName && brandName.trim()) || 'Shop';
  const themeColor = primaryColor || '#96bf48'; // Shopify green

  const effectiveContent = useMemo(() => {
    if (content && content.trim()) return content;
    const seoContent = (seoData as any)?.content;
    if (typeof seoContent === 'string' && seoContent.trim()) return seoContent;
    return '';
  }, [content, seoData]);

  const formattedContent = useMemo(
    () => ensureMarkdownFormat(effectiveContent),
    [effectiveContent],
  );

  const postTitle = useMemo(() => {
    if (seoData?.seo_title) return seoData.seo_title;
    const headingMatch = formattedContent.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim();
    const firstLine = formattedContent
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
      .find((l) => l.length > 0);
    return firstLine?.substring(0, 120) || 'New Post';
  }, [seoData, formattedContent]);

  const bodyContent = useMemo(() => {
    if (!postTitle) return formattedContent;
    const lines = formattedContent.split('\n');
    const titleStripped = postTitle.trim().toLowerCase();
    let firstNonEmpty = -1;
    for (let i = 0; i < lines.length; i++) {
      const cleaned = lines[i].replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim().toLowerCase();
      if (cleaned) {
        firstNonEmpty = i;
        break;
      }
    }
    if (firstNonEmpty >= 0) {
      const cleaned = lines[firstNonEmpty]
        .replace(/^#+\s*/, '')
        .replace(/[*_~`]/g, '')
        .trim()
        .toLowerCase();
      if (cleaned === titleStripped || titleStripped.startsWith(cleaned)) {
        lines.splice(firstNonEmpty, 1);
      }
    }
    return lines.join('\n').trim();
  }, [formattedContent, postTitle]);

  const wordCount = formattedContent.split(/\s+/).filter(Boolean).length;
  const readTime = seoData?.reading_time_minutes || Math.max(1, Math.ceil(wordCount / 200));

  const tags = useMemo(() => {
    const t: string[] = [];
    if (seoData?.focus_keyword) t.push(seoData.focus_keyword);
    if (seoData?.secondary_keywords?.length) {
      t.push(...seoData.secondary_keywords.slice(0, 4));
    }
    return t.slice(0, 5);
  }, [seoData]);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const shopHandle = safeBrand.toLowerCase().replace(/\s+/g, '-');

  if (isGenerating && !formattedContent) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#3d3d3f] p-12 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang tạo nội dung Shopify…</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#3d3d3f] font-['Inter','Helvetica_Neue',system-ui,sans-serif]">
      {/* Announcement bar */}
      <div
        className="text-center text-[10px] py-1.5 tracking-wider uppercase text-white"
        style={{ backgroundColor: themeColor }}
      >
        Free shipping on orders over $50 · Shop new arrivals →
      </div>

      {/* Shop header */}
      <header className="border-b border-[#e5e7eb] dark:border-[#3d3d3f] bg-white dark:bg-[#1c1c1e]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4 text-[#3c4043] dark:text-[#e8eaed] sm:hidden" />
            {logoUrl ? (
              <img src={logoUrl} alt={safeBrand} className="h-7 w-7 rounded object-cover" />
            ) : (
              <div
                className="h-7 w-7 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: themeColor }}
              >
                {safeBrand.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold tracking-tight text-[#202124] dark:text-white uppercase">
              {safeBrand}
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-5 text-[12px] font-medium text-[#202124] dark:text-[#e8eaed]">
            <span>Shop</span>
            <span>Collections</span>
            <span className="border-b-2 pb-0.5" style={{ borderColor: themeColor }}>Journal</span>
            <span>About</span>
          </nav>
          <div className="flex items-center gap-3 text-[#3c4043] dark:text-[#e8eaed]">
            <Search className="w-4 h-4" />
            <User className="w-4 h-4" />
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              <span
                className="absolute -top-1.5 -right-1.5 text-[8px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center"
                style={{ backgroundColor: themeColor }}
              >
                2
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="px-4 sm:px-10 py-3 text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6] border-b border-[#f1f3f4] dark:border-[#2c2c2e]">
        Home / Journal / <span className="text-[#202124] dark:text-white">{tags[0] || 'Article'}</span>
      </div>

      {/* Article */}
      <article className="px-5 sm:px-10 py-8 max-w-[720px] mx-auto">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#5f6368] dark:text-[#9aa0a6] mb-3">
          {today} · {readTime} min read
        </div>

        <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#202124] dark:text-white leading-[1.15] tracking-tight mb-4">
          {postTitle}
        </h1>

        {seoData?.meta_description && (
          <p className="text-[15px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed mb-6">
            {seoData.meta_description}
          </p>
        )}

        {channelImage && (
          <figure className="mb-7 -mx-5 sm:-mx-10">
            <img
              src={channelImage}
              alt={postTitle}
              className="w-full h-60 sm:h-80 object-cover"
            />
          </figure>
        )}

        <div
          className={cn(
            'prose prose-sm sm:prose-base max-w-none dark:prose-invert',
            'prose-headings:font-semibold prose-headings:text-[#202124] dark:prose-headings:text-white prose-headings:tracking-tight',
            'prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3',
            'prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2',
            'prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-[#3c4043] dark:prose-p:text-[#e8eaed]',
            'prose-a:no-underline hover:prose-a:underline prose-a:font-medium',
            'prose-strong:text-[#202124] dark:prose-strong:text-white',
            'prose-blockquote:border-l-2 prose-blockquote:italic prose-blockquote:text-[#5f6368] dark:prose-blockquote:text-[#9aa0a6]',
            'prose-li:text-[15px] prose-li:leading-relaxed',
            'prose-img:rounded-lg',
          )}
          style={{ ['--tw-prose-links' as any]: themeColor }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bodyContent || '*(Chưa có nội dung)*'}
          </ReactMarkdown>
        </div>

        {/* Product CTA card — Shopify hallmark */}
        <div className="mt-8 rounded-lg border border-[#e5e7eb] dark:border-[#3d3d3f] bg-[#fafafa] dark:bg-[#161618] p-4 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${themeColor}1a` }}
          >
            <ShoppingBag className="w-7 h-7" style={{ color: themeColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5">
              Featured in this post
            </div>
            <div className="text-sm font-semibold text-[#202124] dark:text-white truncate">
              {tags[0] ? `${tags[0]} Collection` : `${safeBrand} Essentials`}
            </div>
            <div className="text-[12px] text-[#5f6368] dark:text-[#9aa0a6]">From $29.00</div>
          </div>
          <button
            type="button"
            disabled
            className="text-[12px] font-medium text-white px-4 py-2 rounded-md whitespace-nowrap"
            style={{ backgroundColor: themeColor }}
          >
            Shop now
          </button>
        </div>

        {/* Tags + share */}
        <div className="mt-6 pt-4 border-t border-[#e5e7eb] dark:border-[#3d3d3f] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <Tag className="w-3 h-3 text-[#5f6368] dark:text-[#9aa0a6]" />
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f3f4] dark:bg-[#2c2c2e] text-[#3c4043] dark:text-[#e8eaed]"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#9aa0a6]">No tags</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[#5f6368] dark:text-[#9aa0a6]">
            <Heart className="w-4 h-4" />
            <Share2 className="w-4 h-4" />
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-[#e5e7eb] dark:border-[#3d3d3f] px-6 py-5 text-center text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6] bg-[#fafafa] dark:bg-[#161618]">
        <div>© {new Date().getFullYear()} {safeBrand} · {shopHandle}.myshopify.com</div>
        <div className="mt-1 normal-case tracking-normal text-[10px] text-[#9aa0a6]">
          Powered by <span className="font-semibold" style={{ color: themeColor }}>Shopify</span>
        </div>
      </footer>
    </div>
  );
}
