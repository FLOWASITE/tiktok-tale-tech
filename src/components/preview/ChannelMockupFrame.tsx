import { useState, useMemo, useRef, useCallback } from 'react';
import { ensureMarkdownFormat } from '@/utils/contentFormatter';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { WebsiteSEOData } from '@/types/multichannel';
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
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Shared markdown components for mockups
const mockupMarkdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => <p className="mb-2">{children}</p>,
  strong: ({ children }: { children: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children: React.ReactNode }) => <ul className="list-none my-2 space-y-1">{children}</ul>,
  li: ({ children }: { children: React.ReactNode }) => <li className="flex items-start gap-1">{children}</li>,
  br: () => <br className="block" />,
};

type ChannelType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'threads' | 'general';

interface ChannelMockupFrameProps {
  channel: ChannelType;
  content: string;
  brandName?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  isGenerating?: boolean;
  // Website-specific props
  seoData?: WebsiteSEOData;
  channelImage?: string;
  /** Multiple carousel images for slider mode */
  channelImages?: string[];
  /** Per-slide titles for carousel card overlays */
  slideTitles?: string[];
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

// Facebook caption with "Xem thêm" truncation
function FacebookCaption({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 150;
  
  return (
    <div className="text-[15px] text-[#050505] dark:text-[#e4e6eb] leading-[1.3333]">
      {isLong && !expanded ? (
        <>
          <div className="line-clamp-3">
            <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
          </div>
          <button 
            onClick={() => setExpanded(true)}
            className="text-[#65676b] dark:text-[#b0b3b8] text-[15px] font-normal hover:underline cursor-pointer mt-0.5"
          >
            Xem thêm
          </button>
        </>
      ) : (
        <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
      )}
    </div>
  );
}

// Carousel Image Slider - reusable across Facebook/TikTok mockups
function CarouselImageSlider({ 
  images, 
  totalSlides,
  aspectRatio = 'aspect-square',
  emptyGradient = 'from-muted/30 to-muted/50',
  slideTitles,
  brandDomain,
  showCardOverlay = false,
}: { 
  images: string[]; 
  totalSlides: number;
  aspectRatio?: string;
  emptyGradient?: string;
  slideTitles?: string[];
  brandDomain?: string;
  showCardOverlay?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideCount = Math.max(totalSlides, images.length, 1);
  
  const goNext = useCallback(() => setCurrentIndex(i => Math.min(slideCount - 1, i + 1)), [slideCount]);
  const goPrev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), []);

  return (
    <div className="relative group/slider">
      <div className={cn(aspectRatio, 'w-full overflow-hidden relative bg-muted/10')}>
        {images[currentIndex] ? (
          <img 
            src={images[currentIndex]} 
            alt={`Slide ${currentIndex + 1}`} 
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className={cn('w-full h-full flex flex-col items-center justify-center bg-gradient-to-br', emptyGradient)}>
            <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/50 mt-2">Slide {currentIndex + 1}</span>
          </div>
        )}
        
        {/* Counter badge */}
        <div className="absolute top-2.5 right-2.5 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          {currentIndex + 1}/{slideCount}
        </div>

        {/* Indicator dots inside image (for Facebook card overlay mode) */}
        {showCardOverlay && slideCount > 1 && slideCount <= 10 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === currentIndex 
                    ? "w-2 h-2 bg-[#1877f2]" 
                    : "w-1.5 h-1.5 bg-white/60 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}
        
        {/* Navigation arrows - always visible */}
        {slideCount > 1 && (
          <>
            <button 
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95",
                currentIndex === 0 && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="w-5 h-5 text-[#050505]" />
            </button>
            <button 
              onClick={goNext}
              disabled={currentIndex === slideCount - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-95",
                currentIndex === slideCount - 1 && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="w-5 h-5 text-[#050505]" />
            </button>
          </>
        )}
      </div>

      {/* Facebook-style card overlay below image */}
      {showCardOverlay && (
        <div className="bg-[#f0f2f5] dark:bg-[#3a3b3c] px-3 py-2.5 border-t border-[#dadde1] dark:border-[#3e4042]">
          {brandDomain && (
            <p className="text-[11px] text-[#65676b] dark:text-[#b0b3b8] uppercase tracking-wide mb-0.5">{brandDomain}</p>
          )}
          <p className="text-[14px] font-semibold text-[#050505] dark:text-[#e4e6eb] leading-tight line-clamp-2">
            {slideTitles?.[currentIndex] || `Slide ${currentIndex + 1}`}
          </p>
        </div>
      )}
      
      {/* Indicator dots outside (for non-Facebook mockups) */}
      {!showCardOverlay && slideCount > 1 && slideCount <= 10 && (
        <div className="flex items-center justify-center gap-1 py-2">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "rounded-full transition-all duration-200",
                i === currentIndex 
                  ? "w-1.5 h-1.5 bg-primary" 
                  : "w-1 h-1 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Facebook Post Mockup - Match official FB design
function FacebookMockup({ content, brandName, logoUrl, isGenerating, channelImage, channelImages, slideTitles }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const [liked, setLiked] = useState(false);
  const allImages = channelImages?.length ? channelImages : channelImage ? [channelImage] : [];
  const isCarousel = allImages.length > 1 || (!allImages.length && (channelImages !== undefined));
  
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
          <div className="flex items-center gap-1">
            <p className="font-semibold text-[15px] text-[#050505] dark:text-[#e4e6eb] leading-tight hover:underline cursor-pointer transition-colors">{brandName}</p>
            <div className="w-[15px] h-[15px] bg-[#1877f2] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          </div>
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

      {/* Content with "Xem thêm" truncation */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-full" />
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-5/6" />
            <div className="h-4 bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded w-4/6" />
          </div>
        ) : (
          <FacebookCaption content={content} />
        )}
      </div>

      {/* Carousel Image Slider or Single Image */}
      {isCarousel ? (
        <CarouselImageSlider 
          images={allImages} 
          totalSlides={Math.max(allImages.length, 1)}
          aspectRatio="aspect-square"
          emptyGradient="from-[#f0f2f5] to-[#e4e6eb]"
          slideTitles={slideTitles}
          brandDomain={brandName ? `${brandName.toLowerCase().replace(/\s+/g, '')}.com` : undefined}
          showCardOverlay={true}
        />
      ) : allImages.length === 1 ? (
        <div className="w-full aspect-video bg-[#f0f2f5] dark:bg-[#3a3b3c]">
          <img src={allImages[0]} alt="Post image" className="w-full h-full object-cover" />
        </div>
      ) : null}

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
              😂
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
function LinkedInMockup({ content, brandName, logoUrl, isGenerating, channelImage }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
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
          <div className="text-sm text-[#000000e6] dark:text-[#ffffffe6] leading-[1.42857]">
            <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Image - show if available */}
      {channelImage && (
        <div className="w-full aspect-[1.91/1] bg-[#00000014] dark:bg-[#ffffff14]">
          <img 
            src={channelImage} 
            alt="Article image" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
function InstagramMockup({ content, brandName, logoUrl, isGenerating, channelImage }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
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

      {/* Image */}
      <div 
        className="aspect-square bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 dark:from-[#833ab4]/30 dark:via-[#fd1d1d]/30 dark:to-[#fcb045]/30 flex items-center justify-center relative cursor-pointer select-none overflow-hidden"
        onDoubleClick={handleDoubleClick}
      >
        {channelImage ? (
          <img 
            src={channelImage} 
            alt="Post" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <Instagram className="w-16 h-16 text-[#262626]/20 dark:text-white/20 mx-auto" />
            <p className="text-sm text-[#262626]/40 dark:text-white/40 mt-2">Nhấp đúp để thích</p>
          </div>
        )}
        
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
          <div className="text-sm text-[#262626] dark:text-white">
            <span className="font-semibold mr-1 hover:opacity-60 cursor-pointer transition-opacity">{username}</span>
            <ReactMarkdown components={{
              p: ({ children }) => <span className="inline">{children}</span>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            }}>{content}</ReactMarkdown>
          </div>
        )}
        <p className="text-[10px] text-[#8e8e8e] uppercase mt-2 tracking-wide">2 GIỜ TRƯỚC</p>
      </div>
    </div>
  );
}

// TikTok Post Mockup - Match official TikTok design
function TikTokMockup({ content, brandName, logoUrl, isGenerating, channelImage, channelImages }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const allImages = channelImages?.length ? channelImages : channelImage ? [channelImage] : [];
  const isCarouselMode = channelImages !== undefined;
  
  // TikTok carousel uses 4:5 aspect ratio (not 9:16 video)
  if (isCarouselMode) {
    return (
      <div className="bg-black rounded-xl shadow-lg overflow-hidden font-['TikTokFont','Proxima_Nova',sans-serif]">
        {/* TikTok Header */}
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          <Avatar className="h-9 w-9 border border-white/20 cursor-pointer">
            {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] text-white font-bold text-xs">
              {brandName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">@{username}</p>
          </div>
          <button 
            onClick={() => setFollowing(!following)}
            className={cn(
              "px-4 py-1 rounded text-xs font-semibold transition-all",
              following 
                ? "bg-[#252525] text-white/70" 
                : "bg-[#fe2c55] text-white hover:bg-[#e0284e]"
            )}
          >
            {following ? 'Đang follow' : 'Follow'}
          </button>
        </div>

        {/* Caption - shown before carousel in TikTok carousel posts */}
        <div className="px-3 pb-2">
          {isGenerating ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-3 bg-white/20 rounded w-full" />
              <div className="h-3 bg-white/20 rounded w-3/4" />
            </div>
          ) : (
            <div className="text-sm text-white/90 leading-[1.4] line-clamp-3">
              <ReactMarkdown components={{
                p: ({ children }) => <span>{children}</span>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              }}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Carousel Slider - 4:5 aspect ratio */}
        <CarouselImageSlider 
          images={allImages} 
          totalSlides={Math.max(allImages.length, 1)}
          aspectRatio="aspect-[4/5]"
          emptyGradient="from-[#1a1a1a] to-[#2a2a2a]"
        />

        {/* Action bar */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5 group">
              <Heart className={cn("w-5 h-5 transition-all", liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white group-hover:scale-110")} />
              <span className="text-white text-xs">{liked ? '12.6K' : '12.5K'}</span>
            </button>
            <button className="flex items-center gap-1.5">
              <MessageCircle className="w-5 h-5 text-white -scale-x-100" />
              <span className="text-white text-xs">456</span>
            </button>
            <button onClick={() => setSaved(!saved)} className="flex items-center gap-1.5">
              <Bookmark className={cn("w-5 h-5", saved ? "text-[#f7d835] fill-[#f7d835]" : "text-white")} />
              <span className="text-white text-xs">{saved ? '235' : '234'}</span>
            </button>
            <button className="flex items-center gap-1.5">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Music disc */}
          <div className="w-7 h-7 rounded-full border border-[#252525] animate-spin-slow overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Default TikTok video layout (9:16)
  return (
    <div className="bg-black rounded-xl shadow-lg overflow-hidden relative aspect-[9/16] max-h-[450px] font-['TikTokFont','Proxima_Nova',sans-serif]">
      {/* Video background with image or gradient */}
      <div className="absolute inset-0">
        {channelImage ? (
          <img 
            src={channelImage} 
            alt="Video thumbnail" 
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:bg-white/30 active:scale-95">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>
      
      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
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
        
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center group">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90", liked ? "bg-[#fe2c55]/20" : "bg-[#252525]/80 group-hover:bg-[#353535]/80")}>
            <Heart className={cn("w-6 h-6 transition-all duration-300 group-hover:scale-110", liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white")} />
          </div>
          <span className="text-white text-xs mt-1 font-medium">{liked ? '12.6K' : '12.5K'}</span>
        </button>
        
        <button className="flex flex-col items-center group">
          <div className="w-11 h-11 rounded-full bg-[#252525]/80 flex items-center justify-center transition-all duration-200 group-hover:bg-[#353535]/80 group-hover:scale-105 active:scale-95">
            <MessageCircle className="w-6 h-6 text-white -scale-x-100" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">456</span>
        </button>
        
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center group">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90", saved ? "bg-[#f7d835]/20" : "bg-[#252525]/80 group-hover:bg-[#353535]/80")}>
            <Bookmark className={cn("w-6 h-6 transition-all duration-300 group-hover:scale-110", saved ? "text-[#f7d835] fill-[#f7d835]" : "text-white")} />
          </div>
          <span className="text-white text-xs mt-1 font-medium">{saved ? '235' : '234'}</span>
        </button>
        
        <button className="flex flex-col items-center group">
          <div className="w-11 h-11 rounded-full bg-[#252525]/80 flex items-center justify-center transition-all duration-200 group-hover:bg-[#353535]/80 group-hover:scale-105 active:scale-95">
            <Share2 className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-12" />
          </div>
          <span className="text-white text-xs mt-1 font-medium">Share</span>
        </button>
        
        <div className="w-11 h-11 rounded-full border-2 border-[#252525] animate-spin-slow overflow-hidden cursor-pointer hover:animate-none transition-transform hover:scale-105">
          <div className="w-full h-full bg-gradient-to-br from-[#25f4ee] to-[#fe2c55] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-black" />
          </div>
        </div>
      </div>
      
      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-16 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-bold text-base hover:opacity-80 cursor-pointer transition-opacity">@{username}</p>
          <span className="text-xs text-white/70">· 2 giờ</span>
        </div>

        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-white/30 rounded w-full" />
            <div className="h-3 bg-white/30 rounded w-3/4" />
          </div>
        ) : (
          <div className="text-sm mb-3 line-clamp-3 leading-[1.3]">
            <ReactMarkdown components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            }}>{content}</ReactMarkdown>
          </div>
        )}

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

// Twitter/X Post Mockup - Match official X design
function TwitterMockup({ content, brandName, logoUrl, isGenerating, channelImage }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  return (
    <div className="bg-white dark:bg-black rounded-xl border border-[#eff3f4] dark:border-[#2f3336] overflow-hidden font-['Segoe_UI',system-ui,sans-serif]">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 transition-transform duration-200 hover:scale-105 cursor-pointer">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-[#1d9bf0] text-white font-bold">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] text-[#0f1419] dark:text-[#e7e9ea] hover:underline cursor-pointer">{brandName}</span>
            <div className="w-[18px] h-[18px] bg-[#1d9bf0] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[15px] text-[#536471] dark:text-[#71767b]">@{username}</span>
        </div>
        <button className="p-2 -mt-1 -mr-2 hover:bg-[#1d9bf0]/10 rounded-full transition-all duration-200">
          <MoreHorizontal className="w-5 h-5 text-[#536471] dark:text-[#71767b]" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-[#eff3f4] dark:bg-[#2f3336] rounded w-full" />
            <div className="h-4 bg-[#eff3f4] dark:bg-[#2f3336] rounded w-5/6" />
            <div className="h-4 bg-[#eff3f4] dark:bg-[#2f3336] rounded w-4/6" />
          </div>
        ) : (
          <div className="text-[15px] text-[#0f1419] dark:text-[#e7e9ea] leading-[1.3125]">
            <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Image - show if available */}
      {channelImage && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-[#eff3f4] dark:border-[#2f3336]">
          <img 
            src={channelImage} 
            alt="Post image" 
            className="w-full aspect-video object-cover"
          />
        </div>
      )}

      {/* Time & Views */}
      <div className="px-4 pb-3 flex items-center gap-1 text-[15px] text-[#536471] dark:text-[#71767b]">
        <span>10:30 SA</span>
        <span>·</span>
        <span>3 Th1, 2026</span>
        <span>·</span>
        <span className="text-[#0f1419] dark:text-[#e7e9ea] font-semibold">125K</span>
        <span>Lượt xem</span>
      </div>

      {/* Engagement stats */}
      <div className="px-4 py-3 border-t border-[#eff3f4] dark:border-[#2f3336] flex items-center gap-5 text-[15px]">
        <span className="hover:underline cursor-pointer">
          <span className="font-bold text-[#0f1419] dark:text-[#e7e9ea]">{retweeted ? '1,3K' : '1,2K'}</span>
          <span className="text-[#536471] dark:text-[#71767b]"> Reposts</span>
        </span>
        <span className="hover:underline cursor-pointer">
          <span className="font-bold text-[#0f1419] dark:text-[#e7e9ea]">342</span>
          <span className="text-[#536471] dark:text-[#71767b]"> Trích dẫn</span>
        </span>
        <span className="hover:underline cursor-pointer">
          <span className="font-bold text-[#0f1419] dark:text-[#e7e9ea]">{liked ? '8,9K' : '8,8K'}</span>
          <span className="text-[#536471] dark:text-[#71767b]"> Lượt thích</span>
        </span>
        <span className="hover:underline cursor-pointer">
          <span className="font-bold text-[#0f1419] dark:text-[#e7e9ea]">{bookmarked ? '457' : '456'}</span>
          <span className="text-[#536471] dark:text-[#71767b]"> Lưu</span>
        </span>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2 border-t border-[#eff3f4] dark:border-[#2f3336] flex items-center justify-around">
        <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-all duration-200 group">
          <MessageCircle className="w-5 h-5 text-[#536471] dark:text-[#71767b] group-hover:text-[#1d9bf0] transition-colors" />
        </button>
        <button 
          onClick={() => setRetweeted(!retweeted)}
          className="p-2 hover:bg-[#00ba7c]/10 rounded-full transition-all duration-200 group"
        >
          <Repeat2 className={cn(
            "w-5 h-5 transition-all duration-300",
            retweeted ? "text-[#00ba7c]" : "text-[#536471] dark:text-[#71767b] group-hover:text-[#00ba7c]"
          )} />
        </button>
        <button 
          onClick={() => setLiked(!liked)}
          className="p-2 hover:bg-[#f91880]/10 rounded-full transition-all duration-200 group"
        >
          <Heart className={cn(
            "w-5 h-5 transition-all duration-300",
            liked ? "text-[#f91880] fill-[#f91880]" : "text-[#536471] dark:text-[#71767b] group-hover:text-[#f91880]"
          )} />
        </button>
        <button 
          onClick={() => setBookmarked(!bookmarked)}
          className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-all duration-200 group"
        >
          <Bookmark className={cn(
            "w-5 h-5 transition-all duration-300",
            bookmarked ? "text-[#1d9bf0] fill-[#1d9bf0]" : "text-[#536471] dark:text-[#71767b] group-hover:text-[#1d9bf0]"
          )} />
        </button>
        <button className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-all duration-200 group">
          <Share2 className="w-5 h-5 text-[#536471] dark:text-[#71767b] group-hover:text-[#1d9bf0] transition-colors" />
        </button>
      </div>
    </div>
  );
}

// Threads Post Mockup - Match official Threads design
function ThreadsMockup({ content, brandName, logoUrl, isGenerating, channelImage }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);

  return (
    <div className="bg-white dark:bg-[#101010] rounded-xl overflow-hidden font-['system-ui','-apple-system',sans-serif] border border-[#e0e0e0] dark:border-[#2e2e2e]">
      {/* Post header */}
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-[#000] to-[#333] text-white font-bold text-xs">
            {brandName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[#000] dark:text-white">{username}</span>
              <Check className="w-3.5 h-3.5 text-[#0095f6]" />
            </div>
            <div className="flex items-center gap-2 text-[#999]">
              <span className="text-xs">2 giờ</span>
              <MoreHorizontal className="w-5 h-5 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Content text */}
      <div className="px-4 pb-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3.5 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded w-full" />
            <div className="h-3.5 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded w-5/6" />
            <div className="h-3.5 bg-[#f0f0f0] dark:bg-[#2a2a2a] rounded w-3/4" />
          </div>
        ) : (
          <div className="text-[15px] text-[#000] dark:text-[#f5f5f5] leading-[1.4] whitespace-pre-wrap">
            <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Image - show if available */}
      {channelImage && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-[#e0e0e0] dark:border-[#2e2e2e]">
          <img 
            src={channelImage} 
            alt="Post image" 
            className="w-full aspect-square object-cover"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pb-3 flex items-center gap-5">
        <button 
          onClick={() => setLiked(!liked)}
          className="transition-all duration-200 hover:scale-110 active:scale-90"
        >
          <Heart className={cn(
            "w-5 h-5 transition-all duration-300",
            liked ? "text-[#ff3040] fill-[#ff3040]" : "text-[#000] dark:text-[#f5f5f5]"
          )} />
        </button>
        <button className="transition-all duration-200 hover:scale-110 active:scale-90">
          <MessageCircle className="w-5 h-5 text-[#000] dark:text-[#f5f5f5]" />
        </button>
        <button className="transition-all duration-200 hover:scale-110 active:scale-90">
          <Repeat2 className="w-5 h-5 text-[#000] dark:text-[#f5f5f5]" />
        </button>
        <button className="transition-all duration-200 hover:scale-110 active:scale-90">
          <Send className="w-5 h-5 text-[#000] dark:text-[#f5f5f5]" />
        </button>
      </div>

      {/* Engagement stats */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <div className="flex -space-x-1.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#833ab4] to-[#fd1d1d] border border-white dark:border-[#101010]" />
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0095f6] to-[#00d4ff] border border-white dark:border-[#101010]" />
        </div>
        <span className="text-xs text-[#999]">42 lượt thích · 8 trả lời</span>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] mx-4" />

      {/* Reply prompt */}
      <div className="px-4 py-3">
        <p className="text-sm text-[#999]">Trả lời {username}...</p>
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
          <div className="text-sm text-[#1a1a1a] dark:text-[#e0e0e0] leading-relaxed">
            <ReactMarkdown components={mockupMarkdownComponents}>{emailBody}</ReactMarkdown>
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

// Breadcrumb Component
function WebsiteBreadcrumb({ brandName, themeColor, category }: { brandName: string; themeColor: string; category?: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-[10px] text-[#86868b] px-4 sm:px-6 py-2 bg-[#fafafa] dark:bg-[#232326] border-b border-[#e5e5e7] dark:border-[#3d3d3f]">
      <span className="hover:underline cursor-pointer" style={{ color: themeColor }}>Trang chủ</span>
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
      <span className="hover:underline cursor-pointer" style={{ color: themeColor }}>Blog</span>
      {category && (
        <>
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          <span className="hover:underline cursor-pointer" style={{ color: themeColor }}>{category}</span>
        </>
      )}
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
      <span className="text-[#1d1d1f] dark:text-white truncate max-w-[120px]">Bài viết hiện tại</span>
    </nav>
  );
}

// Article TOC Component
function ArticleTOC({ headings, themeColor }: { headings: string[]; themeColor: string }) {
  if (!headings?.length) return null;
  
  return (
    <div className="bg-[#f8f8fa] dark:bg-[#2c2c2e] rounded-lg p-3 text-xs mb-4 border border-[#e5e5e7] dark:border-[#3d3d3f]">
      <h4 className="font-semibold mb-2 text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Mục lục bài viết
      </h4>
      <ol className="space-y-1.5 list-decimal list-inside text-[#86868b]">
        {headings.slice(0, 6).map((h, i) => (
          <li key={i} className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer truncate transition-colors">
            <span className="hover:underline">{h}</span>
          </li>
        ))}
        {headings.length > 6 && (
          <li className="italic" style={{ color: themeColor }}>+{headings.length - 6} mục khác...</li>
        )}
      </ol>
    </div>
  );
}

// SEO Score Badge Component  
function SEOScoreBadge({ score, themeColor }: { score: number; themeColor: string }) {
  const getScoreColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur rounded-full px-2 py-1 text-xs shadow-sm border border-[#e5e5e7] dark:border-[#3d3d3f]">
      <div className={cn("w-2 h-2 rounded-full", getScoreColor())} />
      <span className="font-medium text-[#1d1d1f] dark:text-white">SEO {score}</span>
    </div>
  );
}

// Related Posts Sidebar
function RelatedPostsSidebar({ brandName, themeColor }: { brandName: string; themeColor: string }) {
  const posts = [
    { title: 'Hướng dẫn tối ưu content hiệu quả', date: '28 Th12, 2025', views: '1.2K' },
    { title: 'Xu hướng marketing 2026 không thể bỏ qua', date: '15 Th12, 2025', views: '3.4K' },
    { title: '5 mẹo viết headline thu hút người đọc', date: '10 Th12, 2025', views: '856' },
  ];
  
  return (
    <div className="bg-[#f8f8fa] dark:bg-[#2c2c2e] rounded-lg p-3 text-xs border border-[#e5e5e7] dark:border-[#3d3d3f]">
      <h4 className="font-semibold mb-2.5 text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        Bài viết liên quan
      </h4>
      <div className="space-y-2.5">
        {posts.map((post, i) => (
          <div key={i} className="group cursor-pointer">
            <p className="font-medium text-[#1d1d1f] dark:text-white group-hover:underline line-clamp-2 leading-tight">{post.title}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#86868b]">
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.views} lượt xem</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Newsletter CTA
function NewsletterCTA({ themeColor }: { themeColor: string }) {
  return (
    <div className="rounded-lg p-3 text-xs border border-dashed" style={{ borderColor: themeColor + '60', backgroundColor: themeColor + '08' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Mail className="w-3.5 h-3.5" style={{ color: themeColor }} />
        <span className="font-semibold text-[#1d1d1f] dark:text-white">Nhận bài viết mới nhất</span>
      </div>
      <p className="text-[#86868b] mb-2 leading-relaxed">Đăng ký để không bỏ lỡ bài viết chất lượng mỗi tuần.</p>
      <div className="flex gap-1.5">
        <div className="flex-1 bg-white dark:bg-[#1c1c1e] rounded px-2 py-1.5 text-[#86868b] border border-[#e5e5e7] dark:border-[#3d3d3f]">email@example.com</div>
        <button className="px-2.5 py-1.5 rounded text-white font-medium shrink-0" style={{ backgroundColor: themeColor }}>Đăng ký</button>
      </div>
    </div>
  );
}

// Social Share Floating Bar
function SocialShareBar({ themeColor }: { themeColor: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-[#86868b] mb-3">
      <span className="mr-1 font-medium text-[#1d1d1f] dark:text-white">Chia sẻ:</span>
      {[
        { icon: '𝕏', label: 'Twitter' },
        { icon: 'f', label: 'Facebook' },
        { icon: 'in', label: 'LinkedIn' },
      ].map((s) => (
        <button key={s.label} className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white hover:opacity-80 transition-opacity" style={{ backgroundColor: themeColor }}>
          {s.icon}
        </button>
      ))}
      <button className="w-6 h-6 rounded-full flex items-center justify-center bg-[#f0f0f2] dark:bg-[#3d3d3f] hover:bg-[#e5e5e7] dark:hover:bg-[#4a4a4c] transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
      </button>
    </div>
  );
}

// FAQ Section in Website
function WebsiteFAQSection({ faqItems, themeColor }: { faqItems: Array<{ question: string; answer: string }>; themeColor: string }) {
  if (!faqItems?.length) return null;
  return (
    <div className="mt-4 pt-3 border-t border-[#e5e5e7] dark:border-[#3d3d3f]">
      <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-1.5">
        <svg className="w-4 h-4" style={{ color: themeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Câu hỏi thường gặp
      </h3>
      <div className="space-y-2">
        {faqItems.slice(0, 3).map((item, i) => (
          <details key={i} className="group bg-[#f8f8fa] dark:bg-[#2c2c2e] rounded-lg overflow-hidden border border-[#e5e5e7] dark:border-[#3d3d3f]">
            <summary className="px-3 py-2 text-xs font-medium text-[#1d1d1f] dark:text-white cursor-pointer hover:bg-[#f0f0f2] dark:hover:bg-[#3d3d3f] transition-colors list-none flex items-center justify-between">
              {item.question}
              <svg className="w-3 h-3 text-[#86868b] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="px-3 pb-2 text-[11px] text-[#86868b] leading-relaxed">{item.answer}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

// Tags Component
function ArticleTags({ keywords, themeColor }: { keywords?: string[]; focusKeyword?: string; themeColor: string }) {
  if (!keywords?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {keywords.slice(0, 5).map((kw, i) => (
        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity border" style={{ color: themeColor, borderColor: themeColor + '40', backgroundColor: themeColor + '08' }}>
          #{kw}
        </span>
      ))}
    </div>
  );
}

// Website Footer
function WebsiteFooter({ brandName, themeColor, logoUrl }: { brandName: string; themeColor: string; logoUrl?: string }) {
  return (
    <div className="bg-[#1d1d1f] dark:bg-[#0a0a0a] text-white px-4 sm:px-6 py-4">
      <div className="grid grid-cols-3 gap-3 text-[10px] mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-5 h-5 rounded object-cover" />
            ) : (
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: themeColor }}>
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-[11px]">{brandName}</span>
          </div>
          <p className="text-[#86868b] leading-relaxed">Nền tảng tạo content chuyên nghiệp.</p>
        </div>
        <div>
          <p className="font-semibold mb-1.5 text-[#86868b] uppercase tracking-wider">Liên kết</p>
          <div className="space-y-1 text-[#a1a1a6]">
            <p className="hover:text-white cursor-pointer transition-colors">Trang chủ</p>
            <p className="hover:text-white cursor-pointer transition-colors">Blog</p>
            <p className="hover:text-white cursor-pointer transition-colors">Sản phẩm</p>
            <p className="hover:text-white cursor-pointer transition-colors">Liên hệ</p>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-1.5 text-[#86868b] uppercase tracking-wider">Pháp lý</p>
          <div className="space-y-1 text-[#a1a1a6]">
            <p className="hover:text-white cursor-pointer transition-colors">Chính sách</p>
            <p className="hover:text-white cursor-pointer transition-colors">Điều khoản</p>
            <p className="hover:text-white cursor-pointer transition-colors">Cookie</p>
          </div>
        </div>
      </div>
      <div className="border-t border-[#3d3d3f] pt-2 flex items-center justify-between">
        <p className="text-[9px] text-[#86868b]">© 2026 {brandName}. All rights reserved.</p>
        <div className="flex items-center gap-2">
          {['𝕏', 'f', 'in'].map((s) => (
            <div key={s} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-[#86868b] hover:text-white border border-[#3d3d3f] hover:border-[#86868b] cursor-pointer transition-colors">
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Website/Blog Mockup - Modern browser with article preview
function WebsiteMockup({ content, brandName, logoUrl, primaryColor, isGenerating, seoData, channelImage }: Omit<ChannelMockupFrameProps, 'channel'>) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const domain = brandName.toLowerCase().replace(/\s+/g, '') + '.com';
  
  const formattedContent = useMemo(() => ensureMarkdownFormat(content), [content]);
  
  const wordCount = seoData?.word_count || formattedContent.split(/\s+/).length;
  const readTime = seoData?.reading_time_minutes || Math.max(1, Math.ceil(wordCount / 200));
  const themeColor = primaryColor || '#3b82f6';
  
  const seoScore = useMemo(() => {
    if (!seoData) return 0;
    let score = 0;
    if (seoData.seo_title && seoData.seo_title.length >= 30 && seoData.seo_title.length <= 60) score += 25;
    else if (seoData.seo_title) score += 15;
    if (seoData.meta_description && seoData.meta_description.length >= 120 && seoData.meta_description.length <= 160) score += 25;
    else if (seoData.meta_description) score += 15;
    if (seoData.focus_keyword) score += 15;
    if (seoData.heading_structure?.h1) score += 15;
    if (seoData.heading_structure?.h2s?.length) score += 10;
    if (wordCount >= 800) score += 10;
    return Math.min(100, score);
  }, [seoData, wordCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      const progress = (el.scrollTop / scrollHeight) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    }
  };
  
  return (
    <div className="bg-[#f5f5f7] dark:bg-[#1c1c1e] rounded-xl overflow-hidden shadow-2xl border border-[#d2d2d7] dark:border-[#3d3d3f] font-['Inter',system-ui,sans-serif]">
      {/* Browser Chrome with Tab */}
      <div className="bg-gradient-to-b from-[#e8e8ed] to-[#dedee3] dark:from-[#3d3d3f] dark:to-[#2c2c2e] px-3 py-2 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm" />
        </div>
        
        {/* Tab */}
        <div className="flex items-center gap-0.5 flex-1">
          <div className="bg-white/90 dark:bg-[#1c1c1e]/90 rounded-t-lg px-3 py-1.5 flex items-center gap-2 text-xs border border-b-0 border-[#c5c5c7] dark:border-[#4a4a4c] max-w-[200px]">
            <div className="w-3 h-3 rounded flex items-center justify-center text-white text-[6px] font-bold shrink-0" style={{ backgroundColor: themeColor }}>
              {brandName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[#1d1d1f] dark:text-white font-medium truncate text-[10px]">{seoData?.seo_title || `${brandName} Blog`}</span>
            <svg className="w-2.5 h-2.5 text-[#86868b] shrink-0 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <button className="w-5 h-5 rounded flex items-center justify-center text-[#86868b] hover:bg-white/50 text-xs">+</button>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-white/50 rounded transition-colors">
            <Share2 className="w-3.5 h-3.5 text-[#86868b]" />
          </button>
        </div>
      </div>
      
      {/* URL Bar */}
      <div className="bg-[#dedee3] dark:bg-[#2c2c2e] px-3 pb-2">
        <div className="bg-white/90 dark:bg-[#1c1c1e]/90 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs shadow-inner border border-[#c5c5c7] dark:border-[#4a4a4c]">
          <div className="flex items-center gap-1 text-[#86868b]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </div>
          <div className="flex-1 flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-[#28c840]">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[#1d1d1f] dark:text-white font-medium">{domain}</span>
            <span className="text-[#86868b]">{seoData?.slug_suggestion ? `/blog/${seoData.slug_suggestion}` : '/blog/article'}</span>
          </div>
          <Bookmark className={cn("w-3.5 h-3.5 cursor-pointer transition-colors", bookmarked ? "text-yellow-500 fill-yellow-500" : "text-[#86868b]")} onClick={() => setBookmarked(!bookmarked)} />
        </div>
      </div>
      
      {/* Reading Progress */}
      <div className="h-0.5 bg-[#e5e5e7] dark:bg-[#3d3d3f]">
        <motion.div 
          className="h-full"
          style={{ backgroundColor: themeColor }}
          initial={{ width: '0%' }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
      
      {/* Website Content */}
      <div 
        ref={scrollContainerRef}
        className="bg-white dark:bg-[#1c1c1e] max-h-[520px] overflow-y-auto relative"
        onScroll={handleScroll}
      >
        {seoData && seoScore > 0 && (
          <SEOScoreBadge score={seoScore} themeColor={themeColor} />
        )}
        
        {/* Site Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-sm border-b border-[#e5e5e7] dark:border-[#3d3d3f] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: themeColor }}>
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">{brandName}</span>
          </div>
          <nav className="hidden sm:flex items-center gap-4 text-xs text-[#86868b]">
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Trang chủ</span>
            <span className="cursor-pointer font-medium" style={{ color: themeColor }}>Blog</span>
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Sản phẩm</span>
            <span className="hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer transition-colors">Liên hệ</span>
          </nav>
          <button className="px-3 py-1 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>Bắt đầu</button>
        </div>
        
        {/* Breadcrumb */}
        <WebsiteBreadcrumb brandName={brandName} themeColor={themeColor} category={seoData?.focus_keyword} />
        
        {/* Featured Image */}
        <div className="h-36 sm:h-44 relative overflow-hidden" style={{ background: channelImage ? undefined : `linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}30 50%, ${themeColor}15 100%)` }}>
          {channelImage ? (
            <>
              <img src={channelImage} alt="Featured" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
              {seoData?.seo_title && (
                <div className="absolute bottom-3 left-4 right-4">
                  <h1 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-lg">{seoData.seo_title}</h1>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Globe className="w-10 h-10 mx-auto opacity-20" style={{ color: themeColor }} />
                <p className="text-xs mt-1 opacity-30 font-medium" style={{ color: themeColor }}>Featured Image</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Two Column Layout */}
        <div className="flex">
          {/* Article Main */}
          <div className="flex-1 px-4 sm:px-5 py-4 min-w-0">
            {seoData?.seo_title && !channelImage && (
              <h1 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white mb-2 leading-tight">{seoData.seo_title}</h1>
            )}
            
            {seoData?.meta_description && (
              <p className="text-xs text-[#86868b] italic mb-2 leading-relaxed line-clamp-2">{seoData.meta_description}</p>
            )}
            
            {/* Author Meta */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#86868b] mb-3">
              <div className="flex items-center gap-1.5">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: themeColor }}>
                    {brandName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-[#1d1d1f] dark:text-white">{brandName}</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-[#c5c5c7]" />
              <span>2 Jan, 2026</span>
              <span className="w-1 h-1 rounded-full bg-[#c5c5c7]" />
              <span>{readTime} phút đọc</span>
              {wordCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#c5c5c7]" />
                  <span>{wordCount.toLocaleString()} từ</span>
                </>
              )}
            </div>
            
            <SocialShareBar themeColor={themeColor} />
            
            {seoData?.focus_keyword && (
              <div className="mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>
                  🏷️ {seoData.focus_keyword}
                </span>
              </div>
            )}
            
            <div className="h-px bg-gradient-to-r from-transparent via-[#e5e5e7] dark:via-[#3d3d3f] to-transparent mb-4" />
            
            {seoData?.heading_structure?.h2s && seoData.heading_structure.h2s.length > 0 && (
              <ArticleTOC headings={seoData.heading_structure.h2s} themeColor={themeColor} />
            )}
            
            {isGenerating ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-5 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded-lg w-3/4" />
                <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-full" />
                <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-full" />
                <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-5/6" />
                <div className="h-4 bg-[#f0f0f2] dark:bg-[#2c2c2e] rounded w-4/5" />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed">
                <ReactMarkdown components={{
                  p: ({ children }) => <p className="mb-3 leading-relaxed text-[13px]">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-none space-y-2 my-3 pl-0">{children}</ul>,
                  li: ({ children }) => <li className="flex items-start gap-2 text-[13px]">{children}</li>,
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold mb-2 mt-5 pb-1.5 border-b border-[#e5e5e7] dark:border-[#3d3d3f] flex items-center gap-1.5">
                      <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: themeColor }} />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-3">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 pl-3 my-3 italic text-[#86868b]" style={{ borderColor: themeColor }}>{children}</blockquote>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} className="underline font-medium" style={{ color: themeColor }}>{children}</a>
                  ),
                  code: ({ children }) => (
                    <code className="bg-[#f0f0f2] dark:bg-[#2c2c2e] px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>
                  ),
                }}>{formattedContent}</ReactMarkdown>
              </div>
            )}
            
            <ArticleTags keywords={seoData?.secondary_keywords} themeColor={themeColor} />
            <WebsiteFAQSection faqItems={seoData?.faq_items} themeColor={themeColor} />
          </div>
          
          {/* Sidebar */}
          <div className="hidden sm:block w-[140px] shrink-0 px-2 py-4 space-y-3 border-l border-[#e5e5e7] dark:border-[#3d3d3f]">
            <RelatedPostsSidebar brandName={brandName} themeColor={themeColor} />
            <NewsletterCTA themeColor={themeColor} />
          </div>
        </div>
        
        {/* Author Card */}
        <div className="px-4 sm:px-5 py-4 bg-[#f8f8fa] dark:bg-[#2c2c2e] border-t border-[#e5e5e7] dark:border-[#3d3d3f]">
          <div className="flex items-start gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base" style={{ backgroundColor: themeColor }}>
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white">{brandName}</p>
                <Check className="w-3.5 h-3.5 text-white rounded-full p-0.5" style={{ backgroundColor: themeColor }} />
              </div>
              <p className="text-[11px] text-[#86868b] line-clamp-2 mt-0.5">Theo dõi để cập nhật nội dung chất lượng từ {brandName}.</p>
              <div className="flex items-center gap-2 mt-2">
                <button className="px-3 py-1 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>Theo dõi</button>
                <button className="px-3 py-1 rounded-full text-[10px] font-medium border border-[#e5e5e7] dark:border-[#3d3d3f] text-[#86868b]">Xem thêm</button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Engagement Bar */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#e5e5e7] dark:border-[#3d3d3f] bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLiked(!liked)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                  liked ? "text-red-500" : "text-[#86868b]"
                )}
                style={{ backgroundColor: liked ? 'rgb(239 68 68 / 0.1)' : '#f0f0f2' }}
              >
                <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
                <span>{liked ? '235' : '234'}</span>
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b]">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>56</span>
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b]">
                <Bookmark className={cn("w-3.5 h-3.5", bookmarked && "fill-current text-yellow-500")} />
                <span>Lưu</span>
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium bg-[#f0f0f2] dark:bg-[#3d3d3f] text-[#86868b]">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <button className="px-3 py-1.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>
              Đọc tiếp →
            </button>
          </div>
        </div>
        
        {/* Website Footer */}
        <WebsiteFooter brandName={brandName} themeColor={themeColor} logoUrl={logoUrl} />
      </div>
    </div>
  );
}

export function ChannelMockupFrame(props: ChannelMockupFrameProps) {
  const { channel, seoData, channelImage, channelImages, brandName: rawBrandName, ...rest } = props;
  
  const safeBrandName = typeof rawBrandName === 'string' && rawBrandName.trim() 
    ? rawBrandName.trim() 
    : 'Brand';

  switch (channel) {
    case 'facebook':
      return <FacebookMockup {...rest} brandName={safeBrandName} channelImage={channelImage} channelImages={channelImages} />;
    case 'linkedin':
      return <LinkedInMockup {...rest} brandName={safeBrandName} channelImage={channelImage} />;
    case 'instagram':
      return <InstagramMockup {...rest} brandName={safeBrandName} channelImage={channelImage} />;
    case 'tiktok':
      return <TikTokMockup {...rest} brandName={safeBrandName} channelImage={channelImage} channelImages={channelImages} />;
    case 'twitter':
      return <TwitterMockup {...rest} brandName={safeBrandName} channelImage={channelImage} />;
    case 'threads':
      return <ThreadsMockup {...rest} brandName={safeBrandName} channelImage={channelImage} />;
    case 'email':
      return <EmailMockup {...rest} brandName={safeBrandName} />;
    case 'general':
      return <WebsiteMockup {...rest} brandName={safeBrandName} seoData={seoData} channelImage={channelImage} />;
    default:
      return null;
  }
}
