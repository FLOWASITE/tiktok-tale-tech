import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import { WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { Search, Menu, ShoppingBag, Heart, Share2, Tag } from 'lucide-react';

interface WixMockupProps {
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

/**
 * Wix site blog post look (Editor X / Wix Studio inspired).
 * Standalone mockup — full-bleed hero, large display title,
 * minimalist top nav, and "Powered by Wix" footer badge.
 */
export function WixMockup({
  content,
  brandName,
  logoUrl,
  primaryColor,
  isGenerating,
  seoData,
  channelImage,
}: WixMockupProps) {
  const safeBrand = (brandName && brandName.trim()) || 'My Site';
  const themeColor = primaryColor || '#0070F3'; // Wix-ish blue

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
      if (cleaned) { firstNonEmpty = i; break; }
    }
    if (firstNonEmpty >= 0) {
      const cleaned = lines[firstNonEmpty]
        .replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim().toLowerCase();
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
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);

  const siteHandle = safeBrand.toLowerCase().replace(/\s+/g, '');

  if (isGenerating && !formattedContent) {
    return (
      <div className="bg-white dark:bg-[#0c0d10] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#2a2c33] p-12 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang tạo nội dung Wix…</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0c0d10] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#2a2c33] font-['Madefor','Helvetica_Neue',system-ui,sans-serif]">
      {/* Top nav (Wix style — minimal, centered logo optional) */}
      <header className="border-b border-[#eef0f3] dark:border-[#2a2c33] bg-white dark:bg-[#0c0d10]">
        <div className="flex items-center justify-between px-5 sm:px-8 py-3.5">
          <div className="flex items-center gap-2.5">
            <Menu className="w-4 h-4 text-[#3b4151] dark:text-[#d3d6db] sm:hidden" />
            {logoUrl ? (
              <img src={logoUrl} alt={safeBrand} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                style={{ backgroundColor: themeColor }}
              >
                {safeBrand.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[13px] font-semibold tracking-tight text-[#13141c] dark:text-white">
              {safeBrand}
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-[12px] font-medium text-[#3b4151] dark:text-[#d3d6db]">
            <span>Home</span>
            <span>About</span>
            <span className="border-b-2 pb-0.5" style={{ borderColor: themeColor }}>Blog</span>
            <span>Shop</span>
            <span>Contact</span>
          </nav>
          <div className="flex items-center gap-3 text-[#3b4151] dark:text-[#d3d6db]">
            <Search className="w-4 h-4" />
            <ShoppingBag className="w-4 h-4" />
            <button
              type="button"
              disabled
              className="hidden sm:inline-block text-[11px] font-medium text-white px-3 py-1.5 rounded-full"
              style={{ backgroundColor: themeColor }}
            >
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* Hero image (full-bleed Wix signature) */}
      {channelImage && (
        <figure className="relative">
          <img
            src={channelImage}
            alt={postTitle}
            className="w-full h-56 sm:h-72 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5 sm:left-10 right-5 sm:right-10">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/90 mb-1.5">
              {tags[0] || 'Blog'} · {today}
            </div>
            <h1 className="text-white text-[24px] sm:text-[34px] font-semibold leading-[1.15] tracking-tight drop-shadow">
              {postTitle}
            </h1>
          </div>
        </figure>
      )}

      {/* Article */}
      <article className="px-5 sm:px-12 py-9 max-w-[760px] mx-auto">
        {!channelImage && (
          <>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#5f6675] dark:text-[#8a90a0] mb-3">
              {today} · {readTime} min read
            </div>
            <h1 className="text-[28px] sm:text-[38px] font-semibold text-[#13141c] dark:text-white leading-[1.1] tracking-tight mb-5">
              {postTitle}
            </h1>
          </>
        )}

        {seoData?.meta_description && (
          <p className="text-[15px] text-[#5f6675] dark:text-[#8a90a0] leading-relaxed mb-6 italic">
            {seoData.meta_description}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-[#5f6675] dark:text-[#8a90a0] mb-7">
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: themeColor }}
          >
            {safeBrand.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-[#13141c] dark:text-white">{safeBrand}</span>
          <span>·</span>
          <span>{readTime} min read</span>
        </div>

        <div
          className={cn(
            'prose prose-sm sm:prose-base max-w-none dark:prose-invert',
            'prose-headings:font-semibold prose-headings:text-[#13141c] dark:prose-headings:text-white prose-headings:tracking-tight',
            'prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3',
            'prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2',
            'prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[#3b4151] dark:prose-p:text-[#d3d6db]',
            'prose-a:no-underline hover:prose-a:underline prose-a:font-medium',
            'prose-strong:text-[#13141c] dark:prose-strong:text-white',
            'prose-blockquote:border-l-4 prose-blockquote:italic prose-blockquote:text-[#5f6675] dark:prose-blockquote:text-[#8a90a0]',
            'prose-li:text-[15px] prose-li:leading-relaxed',
            'prose-img:rounded-xl',
          )}
          style={{
            ['--tw-prose-links' as any]: themeColor,
            ['--tw-prose-quote-borders' as any]: themeColor,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bodyContent || '*(Chưa có nội dung)*'}
          </ReactMarkdown>
        </div>

        {/* Tags + share */}
        <div className="mt-8 pt-5 border-t border-[#eef0f3] dark:border-[#2a2c33] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <Tag className="w-3 h-3 text-[#5f6675] dark:text-[#8a90a0]" />
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-[#f4f5f7] dark:bg-[#1a1c22] text-[#3b4151] dark:text-[#d3d6db]"
                >
                  #{t.replace(/\s+/g, '')}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#8a90a0]">No tags</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[#5f6675] dark:text-[#8a90a0]">
            <Heart className="w-4 h-4" />
            <Share2 className="w-4 h-4" />
          </div>
        </div>

        {/* Subscribe CTA */}
        <div className="mt-7 rounded-2xl border border-[#eef0f3] dark:border-[#2a2c33] bg-[#fafbfc] dark:bg-[#13151a] p-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#5f6675] dark:text-[#8a90a0] mb-1">
            Subscribe
          </div>
          <div className="text-[15px] font-semibold text-[#13141c] dark:text-white mb-3">
            Never miss a post from {safeBrand}
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              disabled
              placeholder="Enter your email"
              className="flex-1 text-[12px] px-3 py-2 rounded-md border border-[#e5e7eb] dark:border-[#2a2c33] bg-white dark:bg-[#0c0d10] text-[#3b4151] dark:text-[#d3d6db]"
            />
            <button
              type="button"
              disabled
              className="text-[12px] font-medium text-white px-4 py-2 rounded-md whitespace-nowrap"
              style={{ backgroundColor: themeColor }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-[#eef0f3] dark:border-[#2a2c33] px-6 py-5 text-center bg-[#fafbfc] dark:bg-[#13151a]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#5f6675] dark:text-[#8a90a0]">
          © {new Date().getFullYear()} {safeBrand} · {siteHandle}.wixsite.com
        </div>
        <div className="mt-1.5 text-[10px] text-[#8a90a0]">
          This site was created with{' '}
          <span className="font-bold text-[#0070F3]">Wix</span>
          .com
        </div>
      </footer>
    </div>
  );
}
