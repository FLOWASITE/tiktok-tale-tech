import { useState } from 'react';
import { 
  Facebook, 
  Linkedin, 
  Instagram, 
  Mail,
  Music2,
  Globe,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Share2,
  ThumbsUp,
  Repeat2,
  Play,
  Reply,
  Forward,
  Star,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type ChannelType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general';

interface ChannelMockupFrameProps {
  channel: ChannelType;
  content: string;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
}

// Reusable animated button component
function ActionButton({ 
  children, 
  className,
  activeColor,
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string;
  activeColor?: string;
  onClick?: () => void;
}) {
  const [isActive, setIsActive] = useState(false);
  
  return (
    <button 
      className={cn(
        "relative overflow-hidden transition-all duration-200 active:scale-95",
        className
      )}
      onClick={() => {
        setIsActive(!isActive);
        onClick?.();
      }}
    >
      <span className={cn(
        "relative z-10 flex items-center justify-center gap-2 transition-colors duration-200",
        isActive && activeColor
      )}>
        {children}
      </span>
    </button>
  );
}

// Facebook Post Mockup - Match official FB design
function FacebookMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const [liked, setLiked] = useState(false);
  
  return (
    <div className="bg-white dark:bg-[#242526] rounded-lg shadow-md border border-[#dadde1] dark:border-[#3e4042] overflow-hidden font-['Segoe_UI',system-ui,sans-serif]">
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        <Avatar className="h-10 w-10 transition-transform duration-200 hover:scale-105">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-[#1877f2] text-white font-bold text-sm">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-[#050505] dark:text-[#e4e6eb] leading-tight hover:underline cursor-pointer transition-colors">{brandName}</p>
          <div className="flex items-center gap-1 text-[13px] text-[#65676b] dark:text-[#b0b3b8]">
            <span>2 giờ</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <button className="p-2 hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] rounded-full transition-all duration-200 hover:scale-110 active:scale-95">
          <MoreHorizontal className="w-5 h-5 text-[#65676b] dark:text-[#b0b3b8]" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-5/6" />
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-4/6" />
          </div>
        ) : (
          <p className="text-[15px] text-[#050505] dark:text-[#e4e6eb] whitespace-pre-wrap leading-[1.3333]">{content}</p>
        )}
      </div>

      {/* Reactions bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#dadde1] dark:border-[#3e4042]">
        <div className="flex items-center gap-1 group cursor-pointer">
          <div className="flex -space-x-0.5 transition-transform duration-200 group-hover:scale-110">
            <div className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center border-2 border-white dark:border-[#242526]">
              <ThumbsUp className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="w-[18px] h-[18px] rounded-full bg-[#f33e58] flex items-center justify-center border-2 border-white dark:border-[#242526]">
              <Heart className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <div className="w-[18px] h-[18px] rounded-full bg-[#f7b928] flex items-center justify-center border-2 border-white dark:border-[#242526] text-[10px]">
              😮
            </div>
          </div>
          <span className="text-[15px] text-[#65676b] dark:text-[#b0b3b8] ml-1.5 hover:underline">{liked ? '1,3K' : '1,2K'}</span>
        </div>
        <div className="flex items-center gap-2 text-[15px] text-[#65676b] dark:text-[#b0b3b8]">
          <span className="hover:underline cursor-pointer transition-colors hover:text-[#050505] dark:hover:text-[#e4e6eb]">89 bình luận</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer transition-colors hover:text-[#050505] dark:hover:text-[#e4e6eb]">34 lượt chia sẻ</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-2 py-1 grid grid-cols-3 gap-1">
        <button 
          onClick={() => setLiked(!liked)}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 rounded-md transition-all duration-200 hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] active:scale-95 group",
            liked && "text-[#1877f2]"
          )}
        >
          <ThumbsUp className={cn(
            "w-5 h-5 transition-all duration-300 group-hover:scale-110",
            liked ? "text-[#1877f2] fill-[#1877f2] animate-bounce-once" : "text-[#65676b] dark:text-[#b0b3b8]"
          )} />
          <span className={cn(
            "text-[15px] font-semibold transition-colors",
            liked ? "text-[#1877f2]" : "text-[#65676b] dark:text-[#b0b3b8]"
          )}>Thích</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-2.5 hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] rounded-md transition-all duration-200 active:scale-95 group">
          <MessageCircle className="w-5 h-5 text-[#65676b] dark:text-[#b0b3b8] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[15px] font-semibold text-[#65676b] dark:text-[#b0b3b8]">Bình luận</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-2.5 hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] rounded-md transition-all duration-200 active:scale-95 group">
          <Share2 className="w-5 h-5 text-[#65676b] dark:text-[#b0b3b8] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
          <span className="text-[15px] font-semibold text-[#65676b] dark:text-[#b0b3b8]">Chia sẻ</span>
        </button>
      </div>
    </div>
  );
}

// LinkedIn Post Mockup - Match official LinkedIn design
function LinkedInMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const [liked, setLiked] = useState(false);
  
  return (
    <div className="bg-white dark:bg-[#1b1f23] rounded-lg border border-[#d8d8d8]/50 dark:border-[#38434f] shadow-sm overflow-hidden font-['Segoe_UI',system-ui,sans-serif]">
      {/* Header */}
      <div className="p-3 flex items-start gap-2">
        <Avatar className="h-12 w-12 shrink-0 transition-transform duration-200 hover:scale-105 cursor-pointer">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-[#0a66c2] text-white font-bold">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#000000e6] dark:text-[#ffffffe6] leading-tight hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors">{brandName}</p>
          <p className="text-xs text-[#00000099] dark:text-[#ffffff99] leading-tight mt-0.5">15.432 người theo dõi</p>
          <div className="flex items-center gap-1 text-xs text-[#00000099] dark:text-[#ffffff99] mt-0.5">
            <span>3 giờ</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <button className="p-1.5 hover:bg-[#00000014] dark:hover:bg-[#ffffff1a] rounded-full transition-all duration-200 hover:scale-110 active:scale-95">
          <MoreHorizontal className="w-5 h-5 text-[#00000099] dark:text-[#ffffff99]" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-[#00000014] dark:bg-[#ffffff14] rounded w-full" />
            <div className="h-4 bg-[#00000014] dark:bg-[#ffffff14] rounded w-full" />
            <div className="h-4 bg-[#00000014] dark:bg-[#ffffff14] rounded w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-[#000000e6] dark:text-[#ffffffe6] whitespace-pre-wrap leading-[1.42857]">{content}</p>
        )}
      </div>

      {/* Engagement counts */}
      <div className="px-4 py-2 flex items-center justify-between border-t border-[#00000014] dark:border-[#ffffff14]">
        <div className="flex items-center gap-0.5 group cursor-pointer">
          <div className="flex -space-x-0.5 transition-transform duration-200 group-hover:scale-110">
            <div className="w-4 h-4 rounded-full bg-[#378fe9] flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-[#df704d] flex items-center justify-center text-[8px]">
              👏
            </div>
            <div className="w-4 h-4 rounded-full bg-[#7fc15e] flex items-center justify-center text-[8px]">
              💡
            </div>
          </div>
          <span className="text-xs text-[#00000099] dark:text-[#ffffff99] ml-1 hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors">{liked ? '893' : '892'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#00000099] dark:text-[#ffffff99]">
          <span className="hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors">56 bình luận</span>
          <span>·</span>
          <span className="hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors">23 lượt đăng lại</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-2 py-1 grid grid-cols-4 gap-0.5 border-t border-[#00000014] dark:border-[#ffffff14]">
        <button 
          onClick={() => setLiked(!liked)}
          className={cn(
            "flex items-center justify-center gap-1.5 py-3 rounded transition-all duration-200 hover:bg-[#00000014] dark:hover:bg-[#ffffff14] active:scale-95 group",
            liked && "text-[#0a66c2]"
          )}
        >
          <ThumbsUp className={cn(
            "w-5 h-5 transition-all duration-300 group-hover:scale-110",
            liked ? "text-[#0a66c2] fill-[#0a66c2]" : "text-[#00000099] dark:text-[#ffffff99]"
          )} />
          <span className={cn(
            "text-xs font-semibold hidden sm:inline transition-colors",
            liked ? "text-[#0a66c2]" : "text-[#00000099] dark:text-[#ffffff99]"
          )}>Thích</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 py-3 hover:bg-[#00000014] dark:hover:bg-[#ffffff14] rounded transition-all duration-200 active:scale-95 group">
          <MessageCircle className="w-5 h-5 text-[#00000099] dark:text-[#ffffff99] transition-transform duration-200 group-hover:scale-110" />
          <span className="text-xs font-semibold text-[#00000099] dark:text-[#ffffff99] hidden sm:inline">Bình luận</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 py-3 hover:bg-[#00000014] dark:hover:bg-[#ffffff14] rounded transition-all duration-200 active:scale-95 group">
          <Repeat2 className="w-5 h-5 text-[#00000099] dark:text-[#ffffff99] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-180" />
          <span className="text-xs font-semibold text-[#00000099] dark:text-[#ffffff99] hidden sm:inline">Đăng lại</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 py-3 hover:bg-[#00000014] dark:hover:bg-[#ffffff14] rounded transition-all duration-200 active:scale-95 group">
          <Send className="w-5 h-5 text-[#00000099] dark:text-[#ffffff99] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
          <span className="text-xs font-semibold text-[#00000099] dark:text-[#ffffff99] hidden sm:inline">Gửi</span>
        </button>
      </div>
    </div>
  );
}

// Instagram Post Mockup - Match official IG design
function InstagramMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  
  const handleDoubleClick = () => {
    if (!liked) {
      setLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  };
  
  return (
    <div className="bg-white dark:bg-black rounded-none sm:rounded-lg border-y sm:border border-[#dbdbdb] dark:border-[#262626] overflow-hidden font-['Segoe_UI',system-ui,sans-serif]">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-3">
        <div className="relative cursor-pointer group">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5] transition-transform duration-200 group-hover:scale-105">
            <Avatar className="h-8 w-8 border-2 border-white dark:border-black">
              {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold text-xs">
                {brandName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#262626] dark:text-white leading-tight hover:opacity-60 cursor-pointer transition-opacity">{username}</p>
        </div>
        <button className="p-1 hover:opacity-60 transition-opacity active:scale-95">
          <MoreHorizontal className="w-5 h-5 text-[#262626] dark:text-white" />
        </button>
      </div>

      {/* Image placeholder */}
      <div 
        className="aspect-square bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 dark:from-[#833ab4]/30 dark:via-[#fd1d1d]/30 dark:to-[#fcb045]/30 flex items-center justify-center relative cursor-pointer select-none"
        onDoubleClick={handleDoubleClick}
      >
        <div className="text-center">
          <Instagram className="w-16 h-16 text-[#262626]/20 dark:text-white/20 mx-auto" />
          <p className="text-sm text-[#262626]/40 dark:text-white/40 mt-2">Nhấp đúp để thích</p>
        </div>
        
        {/* Heart animation on double click */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300",
          showHeart ? "opacity-100 scale-100" : "opacity-0 scale-50"
        )}>
          <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg animate-ping-once" />
        </div>
      </div>

      {/* Action icons */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLiked(!liked)}
            className="transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <Heart className={cn(
              "w-6 h-6 transition-all duration-300",
              liked ? "text-[#ed4956] fill-[#ed4956] scale-110" : "text-[#262626] dark:text-white"
            )} />
          </button>
          <button className="transition-transform duration-200 hover:scale-110 hover:opacity-60 active:scale-95">
            <MessageCircle className="w-6 h-6 text-[#262626] dark:text-white -scale-x-100" />
          </button>
          <button className="transition-transform duration-200 hover:scale-110 hover:opacity-60 active:scale-95">
            <Send className="w-6 h-6 text-[#262626] dark:text-white -rotate-12" />
          </button>
        </div>
        <button 
          onClick={() => setSaved(!saved)}
          className="transition-transform duration-200 hover:scale-110 active:scale-95"
        >
          <Bookmark className={cn(
            "w-6 h-6 transition-all duration-300",
            saved ? "text-[#262626] dark:text-white fill-current" : "text-[#262626] dark:text-white"
          )} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-3">
        <p className="text-sm font-semibold text-[#262626] dark:text-white">{liked ? '3.457' : '3.456'} lượt thích</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 pt-1">
        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-[#efefef] dark:bg-[#262626] rounded w-full" />
            <div className="h-3 bg-[#efefef] dark:bg-[#262626] rounded w-4/5" />
          </div>
        ) : (
          <p className="text-sm text-[#262626] dark:text-white">
            <span className="font-semibold mr-1 hover:opacity-60 cursor-pointer transition-opacity">{username}</span>
            <span className="whitespace-pre-wrap">{content}</span>
          </p>
        )}
        <p className="text-[10px] text-[#8e8e8e] uppercase mt-2 tracking-wide">2 GIỜ TRƯỚC</p>
      </div>
    </div>
  );
}

// TikTok Post Mockup - Match official TikTok design
function TikTokMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  
  return (
    <div className="bg-black rounded-xl shadow-lg overflow-hidden relative aspect-[9/16] max-h-[450px] font-['TikTokFont','Proxima_Nova',sans-serif]">
      {/* Video background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:bg-white/30 active:scale-95">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>
      
      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        {/* Profile */}
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-white cursor-pointer transition-transform duration-200 hover:scale-105">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] text-white font-bold">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button 
            onClick={() => setFollowing(!following)}
            className={cn(
              "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 active:scale-90",
              following 
                ? "bg-[#25f4ee] text-black scale-100" 
                : "bg-[#fe2c55] text-white hover:scale-110"
            )}
          >
            {following ? '✓' : '+'}
          </button>
        </div>
        
        {/* Like */}
        <button 
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center group"
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90",
            liked ? "bg-[#fe2c55]/20" : "bg-[#252525]/80 group-hover:bg-[#353535]/80"
          )}>
            <Heart className={cn(
              "w-6 h-6 transition-all duration-300 group-hover:scale-110",
              liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs mt-1 font-medium">{liked ? '12.6K' : '12.5K'}</span>
        </button>
        
        {/* Comment */}
        <button className="flex flex-col items-center group">
          <div className="w-11 h-11 rounded-full bg-[#252525]/80 flex items-center justify-center transition-all duration-200 group-hover:bg-[#353535]/80 group-hover:scale-105 active:scale-95">
            <MessageCircle className="w-6 h-6 text-white -scale-x-100" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">456</span>
        </button>
        
        {/* Bookmark */}
        <button 
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center group"
        >
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90",
            saved ? "bg-[#f7d835]/20" : "bg-[#252525]/80 group-hover:bg-[#353535]/80"
          )}>
            <Bookmark className={cn(
              "w-6 h-6 transition-all duration-300 group-hover:scale-110",
              saved ? "text-[#f7d835] fill-[#f7d835]" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs mt-1 font-medium">{saved ? '235' : '234'}</span>
        </button>
        
        {/* Share */}
        <button className="flex flex-col items-center group">
          <div className="w-11 h-11 rounded-full bg-[#252525]/80 flex items-center justify-center transition-all duration-200 group-hover:bg-[#353535]/80 group-hover:scale-105 active:scale-95">
            <Share2 className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-12" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">Share</span>
        </button>
        
        {/* Music disc */}
        <div className="w-11 h-11 rounded-full border-2 border-[#252525] animate-spin-slow overflow-hidden cursor-pointer hover:animate-none transition-transform hover:scale-105">
          <div className="w-full h-full bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-black" />
          </div>
        </div>
      </div>
      
      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-16 p-4 text-white">
        {/* Username */}
        <div className="flex items-center gap-2 mb-2">
          <p className="font-bold text-base hover:opacity-80 cursor-pointer transition-opacity">@{username}</p>
          <span className="text-xs text-white/70">· 2 giờ</span>
        </div>

        {/* Caption */}
        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-white/30 rounded w-full" />
            <div className="h-3 bg-white/30 rounded w-3/4" />
          </div>
        ) : (
          <p className="text-sm mb-3 line-clamp-2 leading-[1.3]">{content}</p>
        )}

        {/* Music */}
        <div className="flex items-center gap-2 text-sm">
          <Music2 className="w-4 h-4 animate-bounce-subtle" />
          <div className="overflow-hidden">
            <p className="whitespace-nowrap animate-marquee">🎵 Original Sound - {brandName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Email Mockup - Modern email client design
function EmailMockup({ content, brandName, logoUrl, isGenerating }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const [starred, setStarred] = useState(false);
  
  // Parse email content if it has subject
  const emailSubject = content.includes('Subject:') 
    ? content.split('\n')[0].replace('📧 Subject:', '').replace('Subject:', '').trim()
    : `Thông báo từ ${brandName}`;
  const emailBody = content.includes('Subject:')
    ? content.split('\n').slice(2).join('\n')
    : content;

  return (
    <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg border border-[#e5e5e5] dark:border-[#3c3c3c] overflow-hidden font-['Segoe_UI',system-ui,sans-serif]">
      {/* Email client header */}
      <div className="bg-[#f6f6f6] dark:bg-[#2d2d2d] px-4 py-2.5 border-b border-[#e5e5e5] dark:border-[#3c3c3c] flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-110" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-sm cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-110" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-110" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="px-4 py-1 bg-white dark:bg-[#1f1f1f] rounded-md border border-[#e5e5e5] dark:border-[#3c3c3c] text-xs text-[#666] dark:text-[#999]">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Hộp thư đến
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-[#e5e5e5] dark:border-[#3c3c3c] flex items-center gap-2">
        <button className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] rounded transition-all duration-200 hover:scale-110 active:scale-95">
          <Reply className="w-4 h-4 text-[#666] dark:text-[#999]" />
        </button>
        <button className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] rounded transition-all duration-200 hover:scale-110 active:scale-95">
          <Forward className="w-4 h-4 text-[#666] dark:text-[#999]" />
        </button>
        <div className="w-px h-4 bg-[#e5e5e5] dark:bg-[#3c3c3c]" />
        <button 
          onClick={() => setStarred(!starred)}
          className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] rounded transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Star className={cn(
            "w-4 h-4 transition-all duration-300",
            starred ? "text-[#f7b928] fill-[#f7b928]" : "text-[#666] dark:text-[#999]"
          )} />
        </button>
        <button className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] rounded transition-all duration-200 hover:scale-110 active:scale-95 hover:text-[#ff5f57]">
          <Trash2 className="w-4 h-4 text-[#666] dark:text-[#999]" />
        </button>
        <div className="flex-1" />
        <button className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] rounded transition-all duration-200 hover:scale-110 active:scale-95">
          <MoreVertical className="w-4 h-4 text-[#666] dark:text-[#999]" />
        </button>
      </div>

      {/* Email header */}
      <div className="p-4 border-b border-[#e5e5e5] dark:border-[#3c3c3c]">
        <h2 className="font-semibold text-lg text-[#1a1a1a] dark:text-white mb-3 leading-tight">{emailSubject}</h2>
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 transition-transform duration-200 hover:scale-105 cursor-pointer">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-[#0066ff] to-[#5c6bc0] text-white font-bold text-sm">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-[#1a1a1a] dark:text-white hover:text-[#0066ff] cursor-pointer transition-colors">{brandName}</p>
                <p className="text-xs text-[#666] dark:text-[#999]">noreply@{brandName.toLowerCase().replace(/\s+/g, '')}.com</p>
              </div>
              <span className="text-xs text-[#666] dark:text-[#999]">10:30 SA</span>
            </div>
            <p className="text-xs text-[#666] dark:text-[#999] mt-1">
              Đến: <span className="text-[#1a1a1a] dark:text-white hover:text-[#0066ff] cursor-pointer transition-colors">you@email.com</span>
            </p>
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="p-4 min-h-[120px]">
        {isGenerating ? (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-4 bg-[#f0f0f0] dark:bg-[#3c3c3c] rounded w-full" />
            <div className="h-4 bg-[#f0f0f0] dark:bg-[#3c3c3c] rounded w-full" />
            <div className="h-4 bg-[#f0f0f0] dark:bg-[#3c3c3c] rounded w-5/6" />
            <div className="h-4 bg-[#f0f0f0] dark:bg-[#3c3c3c] rounded w-3/4" />
          </div>
        ) : (
          <div className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] whitespace-pre-wrap leading-relaxed">
            {emailBody}
          </div>
        )}
      </div>

      {/* Email signature area */}
      <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#2a2a2a] border-t border-[#e5e5e5] dark:border-[#3c3c3c]">
        <div className="flex items-center gap-2 text-xs text-[#666] dark:text-[#999]">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#1f1f1f] rounded border border-[#e5e5e5] dark:border-[#3c3c3c] hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] transition-all duration-200 hover:scale-105 active:scale-95">
            <Reply className="w-3 h-3" />
            <span>Trả lời</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#1f1f1f] rounded border border-[#e5e5e5] dark:border-[#3c3c3c] hover:bg-[#f0f0f0] dark:hover:bg-[#3c3c3c] transition-all duration-200 hover:scale-105 active:scale-95">
            <Forward className="w-3 h-3" />
            <span>Chuyển tiếp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Website/Blog Mockup - Modern browser with article preview
function WebsiteMockup({ content, brandName, logoUrl, primaryColor, isGenerating }: Omit<ChannelMockupFrameProps, 'channel'>) {
  const [liked, setLiked] = useState(false);
  const domain = brandName.toLowerCase().replace(/\s+/g, '') + '.com';
  const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
  const themeColor = primaryColor || '#3b82f6';
  
  return (
    <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#d2d2d7] dark:border-[#3d3d3f] font-['Inter',system-ui,sans-serif]">
      {/* Browser Chrome */}
      <div className="bg-gradient-to-b from-[#e8e8ed] to-[#dedee3] dark:from-[#3d3d3f] dark:to-[#2c2c2e] px-3 py-2.5 flex items-center gap-3">
        {/* Traffic lights */}
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition cursor-pointer shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition cursor-pointer shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition cursor-pointer shadow-sm" />
        </div>
        
        {/* URL Bar */}
        <div className="flex-1 bg-white/90 dark:bg-[#1c1c1e]/90 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs shadow-inner border border-[#c5c5c7] dark:border-[#4a4a4c]">
          <div className="flex items-center gap-1.5 text-[#28c840]">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-[#1d1d1f] dark:text-white font-medium">{domain}</span>
          <span className="text-[#86868b]">/blog/article</span>
        </div>
        
        {/* Browser actions */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors">
            <Share2 className="w-3.5 h-3.5 text-[#86868b]" />
          </button>
          <button className="p-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5 text-[#86868b]" />
          </button>
        </div>
      </div>
      
      {/* Website Content */}
      <div className="bg-white dark:bg-[#1c1c1e] max-h-[450px] overflow-y-auto">
        {/* Website Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-sm border-b border-[#e5e5e7] dark:border-[#3d3d3f] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: themeColor }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">{brandName}</span>
          </div>
          <nav className="hidden sm:flex items-center gap-4 text-xs text-[#86868b]">
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Trang chủ</span>
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors font-medium" style={{ color: themeColor }}>Blog</span>
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Giới thiệu</span>
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Liên hệ</span>
          </nav>
        </div>
        
        {/* Featured Image */}
        <div 
          className="h-32 sm:h-40 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${themeColor}20 0%, ${themeColor}40 50%, ${themeColor}20 100%)`
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-10 h-10 mx-auto opacity-30" style={{ color: themeColor }} />
              <p className="text-xs mt-1 opacity-40" style={{ color: themeColor }}>Featured Image</p>
            </div>
          </div>
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-20 h-20 rounded-full border-2" style={{ borderColor: themeColor }} />
            <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2" style={{ borderColor: themeColor }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border" style={{ borderColor: themeColor }} />
          </div>
        </div>
        
        {/* Article Content */}
        <div className="px-4 sm:px-6 py-4">
          {/* Article Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868b] mb-3">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              2 Jan, 2026
            </span>
            <span className="w-1 h-1 rounded-full bg-[#86868b]" />
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {readTime} phút đọc
            </span>
            <span className="w-1 h-1 rounded-full bg-[#86868b]" />
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {brandName}
            </span>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#e5e5e7] dark:via-[#3d3d3f] to-transparent mb-4" />
          
          {/* Content */}
          {isGenerating ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-lg w-3/4" />
              <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-full" />
              <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-full" />
              <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-5/6" />
              <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-4/5" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          )}
        </div>
        
        {/* Engagement Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#e5e5e7] dark:border-[#3d3d3f] bg-[#fafafa] dark:bg-[#2c2c2e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLiked(!liked)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                  liked 
                    ? "bg-red-50 dark:bg-red-900/30 text-red-500" 
                    : "bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b] hover:bg-[#e5e5e7] dark:hover:bg-[#4a4a4c]"
                )}
              >
                <Heart className={cn("w-3.5 h-3.5 transition-all", liked && "fill-current")} />
                <span>{liked ? '235' : '234'}</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b] hover:bg-[#e5e5e7] dark:hover:bg-[#4a4a4c] transition-all duration-200 hover:scale-105 active:scale-95">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>56</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b] hover:bg-[#e5e5e7] dark:hover:bg-[#4a4a4c] transition-all duration-200 hover:scale-105 active:scale-95">
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ</span>
              </button>
            </div>
            <button 
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
              style={{ backgroundColor: themeColor }}
            >
              Đọc tiếp →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChannelMockupFrame(props: ChannelMockupFrameProps) {
  const { channel, ...rest } = props;

  switch (channel) {
    case 'facebook':
      return <FacebookMockup {...rest} />;
    case 'linkedin':
      return <LinkedInMockup {...rest} />;
    case 'instagram':
      return <InstagramMockup {...rest} />;
    case 'tiktok':
      return <TikTokMockup {...rest} />;
    case 'email':
      return <EmailMockup {...rest} />;
    case 'general':
      return <WebsiteMockup {...rest} />;
    default:
      return null;
  }
}
