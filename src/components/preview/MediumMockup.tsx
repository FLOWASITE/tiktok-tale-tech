import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import { WebsiteSEOData } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import {
  Bookmark,
  Hand,
  MessageCircle,
  MoreHorizontal,
  Search,
  Bell,
  Share2,
} from 'lucide-react';

interface MediumMockupProps {
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  seoData?: WebsiteSEOData;
  channelImage?: string;
}

/**
 * Medium.com reading view — serif headlines (Charter/Source Serif),
 * narrow 680px column, member badge, claps + responses + bookmark bar.
 */
export function MediumMockup({
  content,
  brandName,
  logoUrl,
  primaryColor,
  isGenerating,
  seoData,
  channelImage,
}: MediumMockupProps) {
  const safeBrand = (brandName && brandName.trim()) || 'Author';
  const accent = primaryColor || '#1a8917'; // Medium green

  const effectiveContent = useMemo(() => {
    if (content && content.trim()) return content;
    const seoContent = (seoData as { content?: string })?.content;
    if (typeof seoContent === 'string' && seoContent.trim()) return seoContent;
    return '';
  }, [content, seoData]);

  const formatted = useMemo(
    () => ensureMarkdownFormat(effectiveContent),
    [effectiveContent],
  );

  const postTitle = useMemo(() => {
    if (seoData?.seo_title) return seoData.seo_title;
    const m = formatted.match(/^#{1,3}\s+(.+)$/m);
    if (m) return m[1].trim();
    const firstLine = formatted
      .split('\n')
      .map((l) => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
      .find((l) => l.length > 0);
    return firstLine?.substring(0, 140) || 'Untitled story';
  }, [seoData, formatted]);

  const subtitle = useMemo(() => {
    if (seoData?.meta_description) return seoData.meta_description;
    const lines = formatted.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstPara = lines.find(
      (l) => !l.startsWith('#') && !l.startsWith('!') && l.length > 30,
    );
    return firstPara?.replace(/[*_~`]/g, '').substring(0, 180) || '';
  }, [seoData, formatted]);

  const bodyContent = useMemo(() => {
    const lines = formatted.split('\n');
    const titleLow = postTitle.trim().toLowerCase();
    let i = 0;
    while (i < lines.length) {
      const cleaned = lines[i]
        .replace(/^#+\s*/, '')
        .replace(/[*_~`]/g, '')
        .trim()
        .toLowerCase();
      if (!cleaned) { i++; continue; }
      if (cleaned === titleLow || titleLow.startsWith(cleaned)) {
        lines.splice(i, 1);
        break;
      }
      break;
    }
    return lines.join('\n').trim();
  }, [formatted, postTitle]);

  const wordCount = formatted.split(/\s+/).filter(Boolean).length;
  const readTime = seoData?.reading_time_minutes || Math.max(1, Math.ceil(wordCount / 220));

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
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const claps = useMemo(() => {
    // pseudo-stable count from title length so re-render doesn't jump
    const base = (postTitle.length * 17) % 900 + 120;
    return base >= 1000 ? `${(base / 1000).toFixed(1)}K` : `${base}`;
  }, [postTitle]);

  if (isGenerating && !formatted) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-xl overflow-hidden shadow-2xl border border-[#e6e6e6] dark:border-[#2a2a2a] p-12 text-center">
        <div className="animate-pulse text-muted-foreground text-sm font-['Charter','Georgia',serif]">
          Drafting on Medium…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0f0f0f] rounded-xl overflow-hidden shadow-2xl border border-[#e6e6e6] dark:border-[#2a2a2a] font-['Charter','Georgia','Times_New_Roman',serif] text-[#242424] dark:text-[#e6e6e6]">
      {/* ──────────── Top bar ──────────── */}
      <header className="border-b border-[#f2f2f2] dark:border-[#1f1f1f] bg-white dark:bg-[#0f0f0f]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            {/* Medium "M" wordmark */}
            <div className="font-['Playfair_Display','Georgia',serif] font-black italic text-[26px] leading-none tracking-[-0.04em] text-[#242424] dark:text-white">
              M
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-transparent">
              <Search className="w-3.5 h-3.5 text-[#6b6b6b] dark:text-[#a8a8a8]" />
              <span className="text-[12px] text-[#6b6b6b] dark:text-[#a8a8a8] font-['ui-sans-serif',system-ui,sans-serif]">Search</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-[#6b6b6b] dark:text-[#a8a8a8]" />
            <button
              type="button"
              disabled
              className="text-[12px] px-3 py-1 rounded-full text-white font-['ui-sans-serif',system-ui,sans-serif]"
              style={{ backgroundColor: accent }}
            >
              Get started
            </button>
            <div
              className="w-7 h-7 rounded-full bg-cover bg-center ring-1 ring-[#e6e6e6] dark:ring-[#2a2a2a] flex items-center justify-center text-[11px] font-semibold text-white font-['ui-sans-serif',system-ui,sans-serif]"
              style={{
                backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
                backgroundColor: logoUrl ? undefined : accent,
              }}
            >
              {!logoUrl && safeBrand.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ──────────── Story body ──────────── */}
      <article className="px-6 sm:px-10 py-10 max-w-[728px] mx-auto">
        {/* Title — Medium uses big serif */}
        <h1 className="text-[32px] sm:text-[42px] font-bold leading-[1.15] tracking-[-0.02em] text-[#242424] dark:text-white mb-3 font-['Playfair_Display','Charter','Georgia',serif]">
          {postTitle}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-[18px] sm:text-[20px] leading-[1.4] text-[#6b6b6b] dark:text-[#a8a8a8] mb-7 font-normal">
            {subtitle}
          </p>
        )}

        {/* Author strip */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-full bg-cover bg-center ring-1 ring-[#e6e6e6] dark:ring-[#2a2a2a] flex items-center justify-center text-sm font-semibold text-white font-['ui-sans-serif',system-ui,sans-serif]"
            style={{
              backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
              backgroundColor: logoUrl ? undefined : accent,
            }}
          >
            {!logoUrl && safeBrand.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 font-['ui-sans-serif',system-ui,sans-serif]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-medium text-[#242424] dark:text-white">
                {safeBrand}
              </span>
              <button
                type="button"
                disabled
                className="text-[13px] font-medium"
                style={{ color: accent }}
              >
                Follow
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#6b6b6b] dark:text-[#a8a8a8] mt-0.5">
              <span>{readTime} min read</span>
              <span aria-hidden="true">·</span>
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* Engagement bar (sticky-look) */}
        <div className="border-y border-[#f2f2f2] dark:border-[#1f1f1f] my-6 py-2 flex items-center justify-between font-['ui-sans-serif',system-ui,sans-serif]">
          <div className="flex items-center gap-5 text-[13px] text-[#6b6b6b] dark:text-[#a8a8a8]">
            <button type="button" disabled className="flex items-center gap-1.5 hover:text-[#242424] dark:hover:text-white">
              <Hand className="w-[18px] h-[18px]" />
              <span>{claps}</span>
            </button>
            <button type="button" disabled className="flex items-center gap-1.5 hover:text-[#242424] dark:hover:text-white">
              <MessageCircle className="w-[18px] h-[18px]" />
              <span>{Math.max(1, Math.round(parseInt(claps) / 25) || 8)}</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-[#6b6b6b] dark:text-[#a8a8a8]">
            <Bookmark className="w-[18px] h-[18px]" />
            <Share2 className="w-[18px] h-[18px]" />
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </div>
        </div>

        {/* Hero image — Medium full-bleed */}
        {channelImage && (
          <figure className="mb-8 -mx-6 sm:-mx-10">
            <img
              src={channelImage}
              alt={postTitle}
              className="w-full h-60 sm:h-80 object-cover"
            />
            {seoData?.meta_description && (
              <figcaption className="text-[13px] text-[#6b6b6b] dark:text-[#a8a8a8] italic text-center mt-3 px-6 font-['ui-sans-serif',system-ui,sans-serif]">
                {seoData.meta_description}
              </figcaption>
            )}
          </figure>
        )}

        {/* Body — Medium prose */}
        <div
          className={cn(
            'prose prose-base sm:prose-lg max-w-none dark:prose-invert',
            // Body uses serif Charter feel
            'prose-p:font-["Charter","Georgia",serif]',
            'prose-p:text-[18px] sm:prose-p:text-[20px]',
            'prose-p:leading-[1.58] prose-p:tracking-[-0.003em]',
            'prose-p:text-[#242424] dark:prose-p:text-[#e6e6e6]',
            'prose-p:my-5',
            // Headings
            'prose-headings:font-["Playfair_Display","Charter","Georgia",serif]',
            'prose-headings:font-bold prose-headings:tracking-[-0.015em]',
            'prose-headings:text-[#242424] dark:prose-headings:text-white',
            'prose-h2:text-[26px] sm:prose-h2:text-[30px] prose-h2:mt-10 prose-h2:mb-3',
            'prose-h3:text-[22px] sm:prose-h3:text-[24px] prose-h3:mt-8 prose-h3:mb-2',
            // Links — green underline accent
            'prose-a:no-underline prose-a:underline-offset-4 hover:prose-a:underline',
            'prose-strong:text-[#242424] dark:prose-strong:text-white prose-strong:font-bold',
            // Blockquote — Medium pull-quote
            'prose-blockquote:border-l-[3px] prose-blockquote:border-[#242424] dark:prose-blockquote:border-white',
            'prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:font-medium',
            'prose-blockquote:text-[#242424] dark:prose-blockquote:text-[#e6e6e6]',
            'prose-blockquote:text-[20px] sm:prose-blockquote:text-[22px]',
            // Lists
            'prose-li:text-[18px] sm:prose-li:text-[20px] prose-li:leading-[1.58]',
            'prose-li:font-["Charter","Georgia",serif]',
            // Code
            'prose-code:bg-[#f2f2f2] dark:prose-code:bg-[#1f1f1f] prose-code:px-1 prose-code:rounded prose-code:font-["Menlo",monospace] prose-code:text-[15px]',
            'prose-pre:bg-[#f2f2f2] dark:prose-pre:bg-[#1f1f1f]',
            // Images
            'prose-img:rounded prose-img:my-6',
            // HR — Medium uses a centred dot pattern; mimic with thin rule
            'prose-hr:border-[#e6e6e6] dark:prose-hr:border-[#2a2a2a] prose-hr:my-8',
          )}
          style={{ ['--tw-prose-links' as never]: accent }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bodyContent || '*No content yet.*'}
          </ReactMarkdown>
        </div>

        {/* Tags — Medium tag chips */}
        {tags.length > 0 && (
          <div className="mt-10 flex items-center flex-wrap gap-2 font-['ui-sans-serif',system-ui,sans-serif]">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="text-[13px] px-3 py-1.5 rounded-full bg-[#f2f2f2] dark:bg-[#1f1f1f] text-[#242424] dark:text-[#e6e6e6] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2a2a] transition"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom engagement bar — bigger claps */}
        <div className="mt-10 pt-6 border-t border-[#f2f2f2] dark:border-[#1f1f1f] flex items-center justify-between font-['ui-sans-serif',system-ui,sans-serif]">
          <div className="flex items-center gap-6 text-[14px] text-[#6b6b6b] dark:text-[#a8a8a8]">
            <button
              type="button"
              disabled
              className="flex items-center gap-2 group"
            >
              <span className="w-9 h-9 rounded-full border border-[#e6e6e6] dark:border-[#2a2a2a] flex items-center justify-center group-hover:border-[#242424] dark:group-hover:border-white transition">
                <Hand className="w-4 h-4" />
              </span>
              <span className="font-medium">{claps}</span>
            </button>
            <button type="button" disabled className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>Responses</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-[#6b6b6b] dark:text-[#a8a8a8]">
            <Bookmark className="w-[18px] h-[18px]" />
            <Share2 className="w-[18px] h-[18px]" />
          </div>
        </div>

        {/* Author footer card */}
        <div className="mt-10 rounded-lg border border-[#f2f2f2] dark:border-[#1f1f1f] p-5 flex items-start gap-4 font-['ui-sans-serif',system-ui,sans-serif] bg-[#fafafa] dark:bg-[#141414]">
          <div
            className="w-14 h-14 rounded-full bg-cover bg-center ring-1 ring-[#e6e6e6] dark:ring-[#2a2a2a] flex items-center justify-center text-base font-semibold text-white shrink-0"
            style={{
              backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
              backgroundColor: logoUrl ? undefined : accent,
            }}
          >
            {!logoUrl && safeBrand.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b] dark:text-[#a8a8a8] mb-1">
              Written by
            </div>
            <div className="text-[16px] font-bold text-[#242424] dark:text-white">
              {safeBrand}
            </div>
            <div className="text-[13px] text-[#6b6b6b] dark:text-[#a8a8a8] mt-0.5">
              {Math.max(120, wordCount % 9000)} Followers · {Math.max(3, Math.round(wordCount / 250))} Following
            </div>
          </div>
          <button
            type="button"
            disabled
            className="text-[13px] px-3 py-1.5 rounded-full text-white font-medium shrink-0"
            style={{ backgroundColor: accent }}
          >
            Follow
          </button>
        </div>
      </article>

      {/* ──────────── Footer ──────────── */}
      <footer className="border-t border-[#f2f2f2] dark:border-[#1f1f1f] px-6 py-5 text-center text-[12px] text-[#6b6b6b] dark:text-[#a8a8a8] font-['ui-sans-serif',system-ui,sans-serif] bg-white dark:bg-[#0f0f0f]">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span>Help</span>
          <span>Status</span>
          <span>About</span>
          <span>Careers</span>
          <span>Press</span>
          <span>Blog</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
