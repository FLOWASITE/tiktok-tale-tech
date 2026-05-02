import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import { WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { MessageCircle, Search, Menu } from 'lucide-react';

interface BloggerMockupProps {
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

/**
 * Blogger.com (Blogspot) classic look — Notable/Soho/Contempo feel.
 * Standalone mockup — separate from corporate WebsiteMockup.
 */
export function BloggerMockup({
  content,
  brandName,
  logoUrl,
  primaryColor,
  isGenerating,
  seoData,
  channelImage,
}: BloggerMockupProps) {
  const safeBrand = (brandName && brandName.trim()) || 'Brand';
  const themeColor = primaryColor || '#1a73e8'; // Blogger default blue accent

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

  // Title: prefer SEO title → first H1/H2 in content → fallback
  const postTitle = useMemo(() => {
    if (seoData?.seo_title) return seoData.seo_title;
    const headingMatch = formattedContent.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim();
    const firstLine = formattedContent
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
      .find((l) => l.length > 0);
    return firstLine?.substring(0, 120) || 'Bài viết mới';
  }, [seoData, formattedContent]);

  // Strip the title line out of body so it doesn't render twice
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

  const labels = useMemo(() => {
    const tags: string[] = [];
    if (seoData?.focus_keyword) tags.push(seoData.focus_keyword);
    if (seoData?.secondary_keywords?.length) {
      tags.push(...seoData.secondary_keywords.slice(0, 4));
    }
    return tags.slice(0, 5);
  }, [seoData]);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  if (isGenerating && !formattedContent) {
    return (
      <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#3d3d3f] p-12 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang tạo nội dung Blogger…</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] dark:border-[#3d3d3f] font-['Georgia','Times_New_Roman',serif]">
      {/* ──────────── Blogger header (centered, classic Blogspot) ──────────── */}
      <header className="border-b border-[#e5e7eb] dark:border-[#3d3d3f] bg-white dark:bg-[#1c1c1e]">
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-['Roboto',system-ui,sans-serif]">
          <Menu className="w-3.5 h-3.5" />
          <div className="uppercase tracking-[0.18em] text-[9px]">Blog</div>
          <Search className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={safeBrand}
              className="h-10 w-10 rounded-full object-cover mb-3 ring-1 ring-[#e5e7eb] dark:ring-[#3d3d3f]"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full mb-3 flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: themeColor }}
            >
              {safeBrand.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-normal text-[#202124] dark:text-white tracking-tight">
            {safeBrand}
          </h1>
          <div className="mt-2 h-px w-12 bg-[#dadce0] dark:bg-[#5f6368]" />
          <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[#5f6368] dark:text-[#9aa0a6] font-['Roboto',system-ui,sans-serif]">
            {safeBrand.toLowerCase().replace(/\s+/g, '')}.blogspot.com
          </div>
        </div>
        {/* Nav strip — classic Blogger pages list */}
        <nav className="border-t border-[#e5e7eb] dark:border-[#3d3d3f] flex items-center justify-center gap-6 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6] font-['Roboto',system-ui,sans-serif]">
          <span className="text-[#202124] dark:text-white">Home</span>
          <span>About</span>
          <span>Posts</span>
          <span>Contact</span>
        </nav>
      </header>

      {/* ──────────── Post body ──────────── */}
      <article className="px-6 sm:px-10 py-8 max-w-[680px] mx-auto">
        {/* Date strap (Blogger shows date above post) */}
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#5f6368] dark:text-[#9aa0a6] mb-4 text-center font-['Roboto',system-ui,sans-serif]">
          {today}
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-[34px] font-normal text-[#202124] dark:text-white leading-[1.2] text-center mb-3">
          {postTitle}
        </h2>

        {/* Meta line */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mb-6 font-['Roboto',system-ui,sans-serif]">
          <span>Posted by</span>
          <span className="font-medium" style={{ color: themeColor }}>
            {safeBrand}
          </span>
          <span>·</span>
          <span>{readTime} min read</span>
          {labels[0] && (
            <>
              <span>·</span>
              <span className="italic">{labels[0]}</span>
            </>
          )}
        </div>

        {/* Hero image */}
        {channelImage && (
          <figure className="mb-6 -mx-6 sm:-mx-10">
            <img
              src={channelImage}
              alt={postTitle}
              className="w-full h-56 sm:h-72 object-cover"
            />
            {seoData?.meta_description && (
              <figcaption className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] italic text-center mt-2 px-6">
                {seoData.meta_description}
              </figcaption>
            )}
          </figure>
        )}

        {/* Lead paragraph (meta description if no image) */}
        {!channelImage && seoData?.meta_description && (
          <p className="text-base text-[#5f6368] dark:text-[#9aa0a6] italic mb-6 leading-relaxed text-center">
            {seoData.meta_description}
          </p>
        )}

        {/* Body — prose */}
        <div
          className={cn(
            'prose prose-sm sm:prose-base max-w-none dark:prose-invert',
            'prose-headings:font-normal prose-headings:text-[#202124] dark:prose-headings:text-white',
            'prose-headings:font-["Georgia",serif]',
            'prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3',
            'prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2',
            'prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[#3c4043] dark:prose-p:text-[#e8eaed]',
            'prose-a:no-underline hover:prose-a:underline',
            'prose-strong:text-[#202124] dark:prose-strong:text-white',
            'prose-blockquote:border-l-2 prose-blockquote:italic prose-blockquote:text-[#5f6368] dark:prose-blockquote:text-[#9aa0a6]',
            'prose-li:text-[15px] prose-li:leading-relaxed',
          )}
          style={{ ['--tw-prose-links' as any]: themeColor }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bodyContent || '*(Chưa có nội dung)*'}
          </ReactMarkdown>
        </div>

        {/* Labels (Blogger calls tags "Labels") */}
        {labels.length > 0 && (
          <div className="mt-8 pt-4 border-t border-[#e5e7eb] dark:border-[#3d3d3f] flex items-center flex-wrap gap-2 font-['Roboto',system-ui,sans-serif]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6]">
              Labels:
            </span>
            {labels.map((label, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded border text-[#3c4043] dark:text-[#e8eaed] bg-[#f8f9fa] dark:bg-[#2c2c2e]"
                style={{ borderColor: `${themeColor}40` }}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Reactions (Blogger native: Funny / Interesting / Cool) */}
        <div className="mt-6 flex items-center gap-3 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-['Roboto',system-ui,sans-serif]">
          <span>Reactions:</span>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3 accent-[currentColor]" disabled />
            <span>Funny</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" disabled />
            <span>Interesting</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" className="w-3 h-3" disabled />
            <span>Cool</span>
          </label>
        </div>

        {/* Comments stub */}
        <div className="mt-8 pt-6 border-t border-[#e5e7eb] dark:border-[#3d3d3f] font-['Roboto',system-ui,sans-serif]">
          <div className="flex items-center gap-2 text-sm text-[#202124] dark:text-white mb-3">
            <MessageCircle className="w-4 h-4" style={{ color: themeColor }} />
            <span className="font-medium">No comments:</span>
          </div>
          <button
            type="button"
            disabled
            className="text-[12px] px-3 py-1.5 rounded border border-[#dadce0] dark:border-[#5f6368] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#2c2c2e] transition"
          >
            Post a Comment
          </button>
        </div>
      </article>

      {/* ──────────── Footer ──────────── */}
      <footer className="border-t border-[#e5e7eb] dark:border-[#3d3d3f] px-6 py-5 text-center text-[10px] uppercase tracking-[0.2em] text-[#5f6368] dark:text-[#9aa0a6] font-['Roboto',system-ui,sans-serif] bg-[#fafafa] dark:bg-[#161618]">
        <div>© {new Date().getFullYear()} {safeBrand}</div>
        <div className="mt-1 normal-case tracking-normal text-[10px] text-[#9aa0a6]">
          Powered by <span className="font-semibold" style={{ color: themeColor }}>Blogger</span>
        </div>
      </footer>
    </div>
  );
}
