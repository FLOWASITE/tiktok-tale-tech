import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import { WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { MessageSquare, Calendar, User, Tag } from 'lucide-react';

interface WordPressMockupProps {
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

/**
 * WordPress mockup — inspired by Twenty Twenty-Four / Twenty Twenty-Five default themes.
 * Standalone — separate from the corporate WebsiteMockup and Blogspot-style BloggerMockup.
 */
export function WordPressMockup({
  content,
  brandName,
  logoUrl,
  primaryColor,
  isGenerating,
  seoData,
  channelImage,
}: WordPressMockupProps) {
  const safeBrand = (brandName && brandName.trim()) || 'Brand';
  const themeColor = primaryColor || '#0073aa'; // WordPress default blue

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
    return firstLine?.substring(0, 120) || 'Untitled Post';
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

  const categories = useMemo(() => {
    if (seoData?.focus_keyword) return [seoData.focus_keyword];
    return ['Uncategorized'];
  }, [seoData]);

  const tags = useMemo(() => {
    const list: string[] = [];
    if (seoData?.focus_keyword) list.push(seoData.focus_keyword);
    if (seoData?.secondary_keywords?.length) {
      list.push(...seoData.secondary_keywords.slice(0, 5));
    }
    return Array.from(new Set(list)).slice(0, 6);
  }, [seoData]);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const siteDomain = useMemo(() => {
    const canonical = (seoData as any)?.canonical_url as string | undefined;
    if (canonical) {
      try {
        return new URL(canonical).hostname.replace(/^www\./, '');
      } catch {
        // ignore
      }
    }
    return `${safeBrand.toLowerCase().replace(/\s+/g, '')}.wordpress.com`;
  }, [seoData, safeBrand]);

  if (isGenerating && !formattedContent) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-[#e0e0e0] dark:border-[#3a3a3a] p-12 text-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang tạo nội dung WordPress…</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-[#e0e0e0] dark:border-[#3a3a3a] font-['system-ui','-apple-system','Segoe_UI',sans-serif]">
      {/* ──────────── Twenty Twenty-Four style header ──────────── */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-[#e0e0e0] dark:border-[#3a3a3a]">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={safeBrand}
                className="h-9 w-9 rounded-sm object-cover"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-sm flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: themeColor }}
              >
                {safeBrand.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-base font-semibold text-[#1a1a1a] dark:text-white tracking-tight leading-none">
                {safeBrand}
              </div>
              <div className="text-[10px] text-[#6c6c6c] dark:text-[#a0a0a0] mt-1 lowercase tracking-wide">
                {siteDomain}
              </div>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-7 text-[13px] text-[#1a1a1a] dark:text-[#e8e8e8]">
            <span className="font-medium border-b-2 pb-0.5" style={{ borderColor: themeColor }}>Home</span>
            <span className="hover:opacity-70 transition cursor-default">Blog</span>
            <span className="hover:opacity-70 transition cursor-default">About</span>
            <span className="hover:opacity-70 transition cursor-default">Contact</span>
          </nav>
        </div>
      </header>

      {/* ──────────── Post hero (full-bleed image) ──────────── */}
      {channelImage && (
        <figure className="w-full">
          <img
            src={channelImage}
            alt={postTitle}
            className="w-full h-64 sm:h-80 object-cover"
          />
        </figure>
      )}

      {/* ──────────── Post body ──────────── */}
      <article className="px-6 sm:px-12 py-10 max-w-[720px] mx-auto">
        {/* Categories chip row */}
        <div className="flex items-center gap-2 mb-4">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-[11px] font-medium uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm"
              style={{
                color: themeColor,
                backgroundColor: `${themeColor}15`,
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Title — large serif, left-aligned */}
        <h2 className="text-3xl sm:text-[40px] font-normal text-[#1a1a1a] dark:text-white leading-[1.15] mb-5 font-['Source_Serif_Pro','Georgia',serif] tracking-tight">
          {postTitle}
        </h2>

        {/* Meta: avatar + by + date + read time */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-[13px] text-[#6c6c6c] dark:text-[#a0a0a0] mb-8 pb-6 border-b border-[#e8e8e8] dark:border-[#3a3a3a]">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={safeBrand} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ backgroundColor: themeColor }}
              >
                {safeBrand.charAt(0).toUpperCase()}
              </div>
            )}
            <span>
              By <span className="font-semibold text-[#1a1a1a] dark:text-white">{safeBrand}</span>
            </span>
          </div>
          <span className="text-[#d0d0d0] dark:text-[#4a4a4a]">·</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{today}</span>
          </div>
          <span className="text-[#d0d0d0] dark:text-[#4a4a4a]">·</span>
          <span>{readTime} min read</span>
        </div>

        {/* Lead / excerpt */}
        {seoData?.meta_description && (
          <p className="text-[17px] text-[#3c3c3c] dark:text-[#c8c8c8] italic mb-7 leading-[1.6] font-['Source_Serif_Pro','Georgia',serif]">
            {seoData.meta_description}
          </p>
        )}

        {/* Body — WordPress prose */}
        <div
          className={cn(
            'prose prose-sm sm:prose-base max-w-none dark:prose-invert',
            'prose-headings:font-semibold prose-headings:text-[#1a1a1a] dark:prose-headings:text-white',
            'prose-headings:font-["system-ui",sans-serif] prose-headings:tracking-tight',
            'prose-h2:text-[26px] prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-tight',
            'prose-h3:text-[20px] prose-h3:mt-7 prose-h3:mb-3',
            'prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-[#2c2c2c] dark:prose-p:text-[#e0e0e0] prose-p:my-5',
            'prose-a:font-medium prose-a:no-underline hover:prose-a:underline',
            'prose-strong:text-[#1a1a1a] dark:prose-strong:text-white prose-strong:font-semibold',
            'prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-[#5a5a5a] dark:prose-blockquote:text-[#b0b0b0] prose-blockquote:font-["Source_Serif_Pro","Georgia",serif] prose-blockquote:text-[18px]',
            'prose-li:text-[16px] prose-li:leading-[1.75] prose-li:my-1.5',
            'prose-code:bg-[#f3f4f6] dark:prose-code:bg-[#2a2a2a] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.9em] prose-code:before:content-none prose-code:after:content-none',
            'prose-pre:bg-[#1e1e1e] prose-pre:text-[#e0e0e0]',
            'prose-img:rounded-md prose-img:shadow-sm',
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

        {/* Tags row — WordPress classic "Tagged: a, b, c" */}
        {tags.length > 0 && (
          <div className="mt-10 pt-5 border-t border-[#e8e8e8] dark:border-[#3a3a3a] flex items-center flex-wrap gap-2 text-[13px]">
            <Tag className="w-3.5 h-3.5 text-[#6c6c6c] dark:text-[#a0a0a0]" />
            <span className="text-[#6c6c6c] dark:text-[#a0a0a0]">Tagged:</span>
            {tags.map((tag, i) => (
              <span key={tag}>
                <span
                  className="hover:underline cursor-default font-medium"
                  style={{ color: themeColor }}
                >
                  {tag}
                </span>
                {i < tags.length - 1 && <span className="text-[#6c6c6c] dark:text-[#a0a0a0]">,</span>}
              </span>
            ))}
          </div>
        )}

        {/* Author bio card */}
        <div className="mt-10 p-5 bg-[#f8f9fa] dark:bg-[#222] rounded-md flex items-start gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt={safeBrand} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              {safeBrand.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#6c6c6c] dark:text-[#a0a0a0] mb-1">
              <User className="w-3 h-3" />
              <span>Published by</span>
            </div>
            <div className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">{safeBrand}</div>
            <div className="text-[12px] text-[#6c6c6c] dark:text-[#a0a0a0] mt-0.5">
              View all posts by {safeBrand}
            </div>
          </div>
        </div>

        {/* Comments stub — WordPress "Leave a Reply" */}
        <div className="mt-10 pt-6 border-t border-[#e8e8e8] dark:border-[#3a3a3a]">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4" style={{ color: themeColor }} />
            <h3 className="text-[18px] font-semibold text-[#1a1a1a] dark:text-white">Leave a Reply</h3>
          </div>
          <p className="text-[12px] text-[#6c6c6c] dark:text-[#a0a0a0] mb-3">
            Your email address will not be published. Required fields are marked <span style={{ color: themeColor }}>*</span>
          </p>
          <div
            className="w-full h-20 rounded border border-[#d0d0d0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[13px] text-[#9a9a9a]"
          >
            Comment *
          </div>
          <button
            type="button"
            disabled
            className="mt-3 px-4 py-2 text-[13px] font-medium text-white rounded-sm"
            style={{ backgroundColor: themeColor }}
          >
            Post Comment
          </button>
        </div>
      </article>

      {/* ──────────── Footer ──────────── */}
      <footer className="border-t border-[#e0e0e0] dark:border-[#3a3a3a] px-6 py-6 text-center bg-[#fafafa] dark:bg-[#141414]">
        <div className="text-[12px] text-[#6c6c6c] dark:text-[#a0a0a0]">
          © {new Date().getFullYear()} {safeBrand}. All rights reserved.
        </div>
        <div className="mt-1.5 text-[11px] text-[#8a8a8a] dark:text-[#7a7a7a]">
          Proudly powered by{' '}
          <span className="font-semibold" style={{ color: themeColor }}>
            WordPress
          </span>
        </div>
      </footer>
    </div>
  );
}
