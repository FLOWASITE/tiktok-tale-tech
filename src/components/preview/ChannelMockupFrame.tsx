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

// Instagram caption with "thêm" truncation
function InstagramCaption({ content, username }: { content: string; username: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 100;
  
  return (
    <div className="text-sm text-[#262626] dark:text-white">
      <span className="font-semibold mr-1 hover:opacity-60 cursor-pointer transition-opacity">{username}</span>
      {isLong && !expanded ? (
        <>
          <span className="line-clamp-2 inline">
            <ReactMarkdown components={{
              p: ({ children }) => <span className="inline">{children}</span>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            }}>{content.slice(0, 80)}</ReactMarkdown>
          </span>
          <span className="text-[#8e8e8e] cursor-pointer" onClick={() => setExpanded(true)}>... thêm</span>
        </>
      ) : (
        <ReactMarkdown components={{
          p: ({ children }) => <span className="inline">{children}</span>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        }}>{content}</ReactMarkdown>
      )}
    </div>
  );
}

// Instagram Carousel Slider - with IG-style dots
function InstagramCarouselSlider({
  images,
  totalSlides,
}: {
  images: string[];
  totalSlides: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideCount = Math.max(totalSlides, images.length, 1);
  
  const goNext = useCallback(() => setCurrentIndex(i => Math.min(slideCount - 1, i + 1)), [slideCount]);
  const goPrev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), []);

  return (
    <div className="relative">
      <div className="aspect-[4/5] w-full overflow-hidden relative bg-[#efefef] dark:bg-[#1a1a1a]">
        {images[currentIndex] ? (
          <img 
            src={images[currentIndex]} 
            alt={`Slide ${currentIndex + 1}`} 
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10">
            <ImageIcon className="w-10 h-10 text-[#262626]/20 dark:text-white/20" />
            <span className="text-xs text-[#262626]/40 dark:text-white/40 mt-2">Slide {currentIndex + 1}</span>
          </div>
        )}
        
        {/* Navigation arrows */}
        {slideCount > 1 && (
          <>
            <button 
              onClick={goPrev}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-95",
                currentIndex === 0 && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="w-4 h-4 text-[#262626] dark:text-white" />
            </button>
            <button 
              onClick={goNext}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-95",
                currentIndex === slideCount - 1 && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronRight className="w-4 h-4 text-[#262626] dark:text-white" />
            </button>
          </>
        )}
      </div>
      
      {/* Instagram-style dots below image */}
      {slideCount > 1 && slideCount <= 12 && (
        <div className="flex items-center justify-center gap-1 py-2">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "rounded-full transition-all duration-200",
                i === currentIndex 
                  ? "w-[6px] h-[6px] bg-[#0095f6]" 
                  : "w-[5px] h-[5px] bg-[#c7c7c7] dark:bg-[#4d4d4d]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Instagram Post Mockup - Match official IG design with carousel support
function InstagramMockup({ content, brandName, logoUrl, isGenerating, channelImage, channelImages, slideTitles }: Omit<ChannelMockupFrameProps, 'channel' | 'primaryColor'>) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const allImages = channelImages?.length ? channelImages : channelImage ? [channelImage] : [];
  const isCarousel = allImages.length > 1 || (channelImages !== undefined);
  
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

      {/* Carousel or Single Image */}
      {isCarousel ? (
        <div onDoubleClick={handleDoubleClick} className="relative cursor-pointer select-none">
          <InstagramCarouselSlider 
            images={allImages} 
            totalSlides={Math.max(allImages.length, 1)} 
          />
          {/* Heart animation */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300",
            showHeart ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}>
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
          </div>
        </div>
      ) : (
        <div 
          className="aspect-[4/5] bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 dark:from-[#833ab4]/30 dark:via-[#fd1d1d]/30 dark:to-[#fcb045]/30 flex items-center justify-center relative cursor-pointer select-none overflow-hidden"
          onDoubleClick={handleDoubleClick}
        >
          {allImages[0] ? (
            <img src={allImages[0]} alt="Post" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Instagram className="w-16 h-16 text-[#262626]/20 dark:text-white/20 mx-auto" />
              <p className="text-sm text-[#262626]/40 dark:text-white/40 mt-2">Nhấp đúp để thích</p>
            </div>
          )}
          {/* Heart animation */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300",
            showHeart ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}>
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
          </div>
        </div>
      )}

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

      {/* Caption with truncation */}
      <div className="px-3 pb-3 pt-1">
        {isGenerating ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 bg-[#efefef] dark:bg-[#262626] rounded w-full" />
            <div className="h-3 bg-[#efefef] dark:bg-[#262626] rounded w-4/5" />
          </div>
        ) : (
          <InstagramCaption content={content} username={username} />
        )}
        <p className="text-[10px] text-[#8e8e8e] uppercase mt-2 tracking-wide">2 GIỜ TRƯỚC</p>
      </div>
    </div>
  );
}
