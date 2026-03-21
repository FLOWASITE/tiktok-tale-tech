import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Bell, 
  Search, Home, Users, ShoppingBag, User, Check,
  ThumbsUp, Eye, Image as ImageIcon
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

const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong: ({ children }: { children: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children: React.ReactNode }) => <ul className="list-none my-1 space-y-0.5">{children}</ul>,
  li: ({ children }: { children: React.ReactNode }) => <li className="flex items-start gap-1"><span className="text-[#0068ff] mt-0.5">•</span>{children}</li>,
  br: () => <br />,
};

export function ZaloOAMockup({ content, brandName, logoUrl, isGenerating, channelImage }: ZaloOAMockupProps) {
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(true);

  const followerCount = '12.4K';
  const timeAgo = '2 giờ trước';

  return (
    <div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-[#e0e0e0] dark:border-[#2d2d44] overflow-hidden font-['Roboto',system-ui,sans-serif] shadow-sm max-w-[420px] mx-auto">
      
      {/* Zalo Status Bar */}
      <div className="bg-[#0068ff] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/80" />
          <span className="text-white/90 text-xs font-medium">Zalo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/90 text-xs">09:41</span>
        </div>
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

      {/* OA Header Bar */}
      <div className="bg-[#0068ff] px-3 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-white/30 shadow-md">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-white text-[#0068ff] font-bold text-sm">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-white truncate">{brandName}</p>
              <div className="w-4 h-4 bg-[#ffd700] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Check className="w-2.5 h-2.5 text-[#0068ff]" strokeWidth={3} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white/70 text-xs">{followerCount} người quan tâm</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Bell className="w-5 h-5 text-white/80" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Search className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>

        {/* OA Tabs */}
        <div className="flex mt-3 gap-1">
          {['Trang chủ', 'Bài viết', 'Thông tin'].map((tab, i) => (
            <button
              key={tab}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-full transition-all",
                i === 1 
                  ? "bg-white text-[#0068ff]" 
                  : "bg-white/15 text-white/80 hover:bg-white/25"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Article Post Card */}
      <div className="bg-white dark:bg-[#1a1a2e]">
        {/* Post Header */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-[#0068ff]/10 text-[#0068ff] font-bold text-xs">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[13px] text-[#081c36] dark:text-[#e4e6eb]">{brandName}</span>
              <div className="w-3.5 h-3.5 bg-[#0068ff] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-2 h-2 text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] text-[#7589a3] dark:text-[#a0aec0]">{timeAgo}</span>
          </div>
          <button className="p-1.5 hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] rounded-full transition-all">
            <MoreHorizontal className="w-4 h-4 text-[#7589a3] dark:text-[#a0aec0]" />
          </button>
        </div>

        {/* Post Image */}
        {channelImage ? (
          <div className="w-full aspect-[16/9] bg-[#f0f2f5] dark:bg-[#2d2d44] overflow-hidden">
            <img src={channelImage} alt="Article cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-[#0068ff]/5 to-[#0068ff]/15 dark:from-[#0068ff]/10 dark:to-[#0068ff]/20 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-10 h-10 text-[#0068ff]/30 mx-auto mb-2" />
              <span className="text-xs text-[#0068ff]/40">Ảnh bài viết</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-3 pt-2.5 pb-2">
          {isGenerating ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
              <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-5/6" />
              <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-4/6" />
            </div>
          ) : (
            <div className="text-[13px] text-[#081c36] dark:text-[#e4e6eb] leading-[1.5] whitespace-pre-wrap">
              <ReactMarkdown components={markdownComponents as any}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Engagement Stats */}
        <div className="px-3 py-2 flex items-center justify-between border-t border-[#e8eaed] dark:border-[#2d2d44]">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-[#0068ff] flex items-center justify-center border border-white dark:border-[#1a1a2e]">
                <ThumbsUp className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 rounded-full bg-[#f44336] flex items-center justify-center border border-white dark:border-[#1a1a2e]">
                <Heart className="w-2 h-2 text-white fill-white" />
              </div>
            </div>
            <span className="text-[11px] text-[#7589a3] dark:text-[#a0aec0]">{liked ? '847' : '846'}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#7589a3] dark:text-[#a0aec0]">
            <span>56 bình luận</span>
            <span>12 chia sẻ</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-1 grid grid-cols-4 gap-0.5 border-t border-[#e8eaed] dark:border-[#2d2d44]">
          <button 
            onClick={() => setLiked(!liked)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all duration-200 hover:bg-[#f0f2f5] dark:hover:bg-[#2d2d44] active:scale-95",
              liked && "text-[#0068ff]"
            )}
          >
            <ThumbsUp className={cn(
              "w-[18px] h-[18px] transition-all",
              liked ? "text-[#0068ff] fill-[#0068ff]" : "text-[#7589a3] dark:text-[#a0aec0]"
            )} />
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
            <Eye className="w-[18px] h-[18px] text-[#7589a3] dark:text-[#a0aec0]" />
            <span className="text-[10px] font-medium text-[#7589a3] dark:text-[#a0aec0]">Xem thêm</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white dark:bg-[#1a1a2e] border-t border-[#e8eaed] dark:border-[#2d2d44] px-2 py-1.5 grid grid-cols-4 gap-1">
        {[
          { icon: Home, label: 'Tin nhắn', active: false },
          { icon: Users, label: 'Danh bạ', active: false },
          { icon: ShoppingBag, label: 'Khám phá', active: false },
          { icon: User, label: 'Cá nhân', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors",
              active ? "text-[#0068ff]" : "text-[#7589a3] dark:text-[#a0aec0]"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
