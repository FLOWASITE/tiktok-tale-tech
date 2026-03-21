import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Bell, 
  Search, Home, Users, Compass, Clock, User, Check,
  ThumbsUp, Eye, Image as ImageIcon, ChevronLeft, 
  MessageSquare, BookOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ZaloOAMockupProps {
  content: string;
  brandName: string;
  logoUrl?: string;
  isGenerating?: boolean;
  channelImage?: string;
}

/** Extract title (first heading or first line) and body from content */
function extractTitleAndBody(content: string): { title: string; body: string } {
  if (!content?.trim()) return { title: 'Tiêu đề bài viết', body: '' };
  
  const lines = content.split('\n');
  
  // Check for markdown heading
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^#{1,3}\s+(.+)/);
    if (match) {
      const title = match[1].trim();
      const body = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n').trim();
      return { title, body };
    }
  }
  
  // Use first non-empty line as title
  const firstLine = lines.find(l => l.trim())?.trim() || 'Tiêu đề bài viết';
  const rest = lines.slice(lines.indexOf(firstLine) + 1).join('\n').trim();
  return { title: firstLine.replace(/^\*\*(.+)\*\*$/, '$1'), body: rest };
}

function estimateReadTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-[#081c36] dark:text-white">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-none my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-1.5">
      <span className="text-[#0068ff] mt-0.5 flex-shrink-0">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-base font-bold mb-2 text-[#081c36] dark:text-white">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[15px] font-bold mb-2 text-[#081c36] dark:text-white">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[14px] font-semibold mb-1.5 text-[#081c36] dark:text-white">{children}</h3>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-3 border-[#0068ff] pl-3 my-2 text-[#5a6981] dark:text-[#a0aec0] italic">{children}</blockquote>
  ),
  br: () => <br />,
};

const ZALO_REACTIONS = ['👍', '❤️', '😆', '😮', '😢', '😡'];

export function ZaloOAMockup({ content, brandName, logoUrl, isGenerating, channelImage }: ZaloOAMockupProps) {
  const [liked, setLiked] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);

  const { title, body } = extractTitleAndBody(content);
  const readTime = estimateReadTime(content);
  const followerCount = '12.4K';
  const timeAgo = '2 giờ trước';
  const viewCount = '1.2K';

  const handleReaction = (emoji: string) => {
    setActiveReaction(prev => prev === emoji ? null : emoji);
    setLiked(true);
    setShowReactions(false);
  };

  return (
    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-[#e0e0e0] dark:border-[#2d2d44] overflow-hidden font-['Roboto',system-ui,sans-serif] shadow-sm max-w-[420px] mx-auto">
      
      {/* Status Bar */}
      <div className="bg-[#0068ff] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/80" />
          <span className="text-white/90 text-[10px] font-medium">Zalo</span>
        </div>
        <span className="text-white/90 text-[10px] font-medium">09:41</span>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn("w-[3px] rounded-full bg-white/80", i === 1 ? "h-1.5" : i === 2 ? "h-2" : i === 3 ? "h-2.5" : "h-3")} />
            ))}
          </div>
          <div className="w-5 h-2.5 border border-white/80 rounded-sm ml-1">
            <div className="w-3.5 h-full bg-white/80 rounded-sm" />
          </div>
        </div>
      </div>

      {/* OA Header with Back + Chat */}
      <div className="bg-[#0068ff] px-2 pb-2.5 pt-1">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <Avatar className="h-10 w-10 border-2 border-white/30 shadow-md flex-shrink-0">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-white text-[#0068ff] font-bold text-sm">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-bold text-[13px] text-white truncate">{brandName}</p>
              <div className="w-3.5 h-3.5 bg-[#ffd700] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-2 h-2 text-[#0068ff]" strokeWidth={3} />
              </div>
            </div>
            <span className="text-white/60 text-[10px]">{followerCount} người quan tâm</span>
          </div>

          {/* Follow button */}
          <button className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-semibold text-white border border-white/40 transition-all flex-shrink-0">
            + Quan tâm
          </button>

          {/* Chat button */}
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <MessageSquare className="w-4.5 h-4.5 text-white/90" />
          </button>
        </div>

        {/* OA Tabs */}
        <div className="flex mt-2.5 gap-1">
          {['Trang chủ', 'Bài viết', 'Thông tin'].map((tab, i) => (
            <button
              key={tab}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-medium rounded-full transition-all",
                i === 1 
                  ? "bg-white text-[#0068ff] shadow-sm" 
                  : "bg-white/15 text-white/75 hover:bg-white/25"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Article Card */}
      <div className="bg-white dark:bg-[#1a1a2e]">

        {/* Cover Image */}
        {channelImage ? (
          <div className="w-full aspect-[16/9] bg-[#f0f2f5] dark:bg-[#2d2d44] overflow-hidden relative">
            <img src={channelImage} alt="Article cover" className="w-full h-full object-cover" />
            {/* Category badge */}
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 bg-[#0068ff] text-white text-[9px] font-semibold rounded-full shadow-sm">
                Bài viết
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-[#0068ff]/5 to-[#0068ff]/15 dark:from-[#0068ff]/10 dark:to-[#0068ff]/20 flex items-center justify-center relative">
            <div className="text-center">
              <ImageIcon className="w-10 h-10 text-[#0068ff]/25 mx-auto mb-1.5" />
              <span className="text-[10px] text-[#0068ff]/35">Ảnh bài viết</span>
            </div>
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 bg-[#0068ff] text-white text-[9px] font-semibold rounded-full shadow-sm">
                Bài viết
              </span>
            </div>
          </div>
        )}

        {/* Article Title */}
        <div className="px-3.5 pt-3">
          {isGenerating ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
              <div className="h-5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-4/6" />
            </div>
          ) : (
            <h2 className="text-[16px] font-bold text-[#081c36] dark:text-white leading-snug">
              {title}
            </h2>
          )}
        </div>

        {/* OA info + read time */}
        <div className="px-3.5 pt-2 pb-2.5 flex items-center gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-[#0068ff]/10 text-[#0068ff] font-bold text-[8px]">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[#081c36] dark:text-[#e4e6eb] truncate">{brandName}</span>
            <div className="w-3 h-3 bg-[#0068ff] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-1.5 h-1.5 text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#7589a3] dark:text-[#a0aec0] flex-shrink-0">
            <span>{timeAgo}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" />
              {readTime} phút đọc
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3.5 border-t border-[#e8eaed]/60 dark:border-[#2d2d44]" />

        {/* Article Body */}
        <div className="px-3.5 pt-3 pb-3">
          {isGenerating ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3.5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
              <div className="h-3.5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-5/6" />
              <div className="h-3.5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-4/6" />
              <div className="h-3.5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
              <div className="h-3.5 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-3/6" />
            </div>
          ) : (
            <div className="text-[13px] text-[#333] dark:text-[#d4d4d4] leading-[1.65]">
              <ReactMarkdown components={markdownComponents as any}>
                {body || content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* View count */}
        <div className="px-3.5 pb-2 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-[#7589a3] dark:text-[#a0aec0]" />
          <span className="text-[10px] text-[#7589a3] dark:text-[#a0aec0]">{viewCount} lượt xem</span>
        </div>

        {/* Engagement Stats */}
        <div className="px-3.5 py-2 flex items-center justify-between border-t border-[#e8eaed] dark:border-[#2d2d44]">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-0.5">
              {['👍', '❤️', '😆'].map((emoji, i) => (
                <span key={i} className="text-[12px] leading-none">{emoji}</span>
              ))}
            </div>
            <span className="text-[11px] text-[#7589a3] dark:text-[#a0aec0]">
              {liked ? 'Bạn và 846 người khác' : '846'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#7589a3] dark:text-[#a0aec0]">
            <span>56 bình luận</span>
            <span>12 chia sẻ</span>
          </div>
        </div>

        {/* Reaction Picker (floating) */}
        {showReactions && (
          <div className="px-3.5 pb-1">
            <div className="flex items-center gap-1 p-1.5 bg-white dark:bg-[#2d2d44] rounded-full shadow-lg border border-[#e8eaed] dark:border-[#3a3b3c] w-fit animate-in fade-in-0 zoom-in-95 duration-200">
              {ZALO_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "text-lg hover:scale-125 transition-transform p-1 rounded-full",
                    activeReaction === emoji && "bg-[#0068ff]/10 scale-110"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-2 py-1 grid grid-cols-4 gap-0.5 border-t border-[#e8eaed] dark:border-[#2d2d44]">
          <button 
            onClick={() => {
              if (!liked) {
                setLiked(true);
                setActiveReaction('👍');
              } else {
                setLiked(false);
                setActiveReaction(null);
              }
            }}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setTimeout(() => setShowReactions(false), 1500)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all duration-200 hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] active:scale-95",
              liked && "text-[#0068ff]"
            )}
          >
            {activeReaction ? (
              <span className="text-[16px] leading-none">{activeReaction}</span>
            ) : (
              <ThumbsUp className={cn(
                "w-[18px] h-[18px] transition-all",
                liked ? "text-[#0068ff] fill-[#0068ff]" : "text-[#7589a3] dark:text-[#a0aec0]"
              )} />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              liked ? "text-[#0068ff]" : "text-[#7589a3] dark:text-[#a0aec0]"
            )}>Thích</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] transition-all active:scale-95">
            <MessageCircle className="w-[18px] h-[18px] text-[#7589a3] dark:text-[#a0aec0]" />
            <span className="text-[10px] font-medium text-[#7589a3] dark:text-[#a0aec0]">Bình luận</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] transition-all active:scale-95">
            <Share2 className="w-[18px] h-[18px] text-[#7589a3] dark:text-[#a0aec0]" />
            <span className="text-[10px] font-medium text-[#7589a3] dark:text-[#a0aec0]">Chia sẻ</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] transition-all active:scale-95">
            <MoreHorizontal className="w-[18px] h-[18px] text-[#7589a3] dark:text-[#a0aec0]" />
            <span className="text-[10px] font-medium text-[#7589a3] dark:text-[#a0aec0]">Thêm</span>
          </button>
        </div>
      </div>

      {/* Related Posts */}
      <div className="bg-[#f5f6f8] dark:bg-[#13132b] px-3.5 py-3">
        <p className="text-[11px] font-semibold text-[#081c36] dark:text-[#e4e6eb] mb-2">Bài viết liên quan</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-[#1a1a2e] rounded-lg overflow-hidden border border-[#e8eaed]/60 dark:border-[#2d2d44]">
              <div className="w-full aspect-[16/10] bg-gradient-to-br from-[#0068ff]/5 to-[#0068ff]/10 dark:from-[#0068ff]/10 dark:to-[#0068ff]/15 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-[#0068ff]/20" />
              </div>
              <div className="p-2">
                <p className="text-[10px] font-medium text-[#081c36] dark:text-[#e4e6eb] line-clamp-2 leading-tight">
                  {i === 1 ? 'Khám phá chương trình ưu đãi mới...' : 'Tin tức cập nhật từ ' + brandName}
                </p>
                <span className="text-[9px] text-[#7589a3] dark:text-[#a0aec0] mt-1 block">3 giờ trước</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA: Nhắn tin cho OA */}
      <div className="px-3.5 py-2.5 bg-white dark:bg-[#1a1a2e] border-t border-[#e8eaed] dark:border-[#2d2d44]">
        <button className="w-full py-2 bg-[#0068ff] hover:bg-[#0055d4] text-white text-[12px] font-semibold rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm">
          <MessageSquare className="w-3.5 h-3.5" />
          Nhắn tin cho {brandName}
        </button>
      </div>

      {/* Bottom Navigation - 5 tabs chuẩn Zalo */}
      <div className="bg-white dark:bg-[#1a1a2e] border-t border-[#e8eaed] dark:border-[#2d2d44] px-1 py-1.5 grid grid-cols-5 gap-0">
        {[
          { icon: MessageCircle, label: 'Tin nhắn', active: false },
          { icon: Users, label: 'Danh bạ', active: false },
          { icon: Compass, label: 'Khám phá', active: true },
          { icon: Clock, label: 'Nhật ký', active: false },
          { icon: User, label: 'Cá nhân', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors",
              active ? "text-[#0068ff]" : "text-[#7589a3] dark:text-[#a0aec0]"
            )}
          >
            <Icon className={cn("w-[18px] h-[18px]", active && "stroke-[2.5]")} />
            <span className={cn("text-[9px]", active ? "font-semibold" : "font-medium")}>{label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#f5f6f8] dark:bg-[#13132b] px-3 py-1.5 text-center">
        <span className="text-[9px] text-[#7589a3]/60 dark:text-[#a0aec0]/40">Xem trước · Zalo Official Account</span>
      </div>
    </div>
  );
}
