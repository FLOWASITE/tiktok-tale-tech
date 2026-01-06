import { useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Send, ThumbsUp, MessageSquare, Repeat2, Music2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AdCopyVariation, CTA_BUTTONS } from '@/types/adCopy';

interface MockupProps {
  variation: AdCopyVariation;
  brandName?: string;
  logoUrl?: string;
}

// Facebook Feed Mockup - Desktop style
export function FacebookFeedMockup({ variation, brandName = 'Brand', logoUrl }: MockupProps) {
  const [liked, setLiked] = useState(false);
  
  return (
    <div className="bg-background rounded-xl border max-w-[420px] mx-auto overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
          ) : (
            brandName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{brandName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Được tài trợ · <span className="text-[10px]">🌐</span>
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>
      
      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-sm whitespace-pre-wrap">{variation.primary_text || 'Primary text...'}</p>
      </div>
      
      {/* Image placeholder */}
      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        <span className="text-4xl opacity-30">🖼️</span>
      </div>
      
      {/* Link preview */}
      <div className="border-t bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">example.com</p>
        <p className="font-semibold text-sm">{variation.headline || 'Headline...'}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{variation.description || 'Description...'}</p>
      </div>
      
      {/* Reactions bar */}
      <div className="px-3 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-sm">👍❤️</span>
          <span>123</span>
        </div>
        <div className="flex gap-4">
          <span>45 bình luận</span>
          <span>12 chia sẻ</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-3 py-2 border-t flex items-center justify-around">
        <button 
          className={cn("flex items-center gap-2 text-sm py-2 px-4 rounded-md hover:bg-muted transition-colors", liked && "text-blue-600")}
          onClick={() => setLiked(!liked)}
        >
          <ThumbsUp className={cn("h-5 w-5", liked && "fill-blue-600")} />
          Thích
        </button>
        <button className="flex items-center gap-2 text-sm py-2 px-4 rounded-md hover:bg-muted transition-colors">
          <MessageSquare className="h-5 w-5" />
          Bình luận
        </button>
        <button className="flex items-center gap-2 text-sm py-2 px-4 rounded-md hover:bg-muted transition-colors">
          <Share className="h-5 w-5" />
          Chia sẻ
        </button>
      </div>
      
      {/* CTA Button */}
      {variation.cta_button && (
        <div className="px-3 pb-3">
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Tìm hiểu thêm'}
          </button>
        </div>
      )}
    </div>
  );
}

// Facebook Story Mockup - 9:16 vertical
export function FacebookStoryMockup({ variation, brandName = 'Brand', logoUrl }: MockupProps) {
  return (
    <div className="bg-black rounded-2xl max-w-[260px] mx-auto aspect-[9/16] relative overflow-hidden shadow-lg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-black/80" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold border-2 border-blue-500 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
          ) : (
            brandName.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-medium">{brandName}</p>
          <p className="text-white/60 text-[10px]">Được tài trợ</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-white/80" />
      </div>
      
      {/* Image placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl opacity-20">🖼️</span>
      </div>
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-white text-sm mb-2 drop-shadow-lg line-clamp-3">
          {variation.primary_text || 'Primary text...'}
        </p>
        <p className="text-white font-bold text-base drop-shadow-lg">
          {variation.headline || 'Headline...'}
        </p>
        
        {/* Swipe up CTA */}
        <div className="mt-4 flex flex-col items-center">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <span className="text-white text-xs">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Vuốt lên'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Instagram Feed Mockup - Square style
export function InstagramFeedMockup({ variation, brandName = 'Brand', logoUrl }: MockupProps) {
  const [liked, setLiked] = useState(false);
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  
  return (
    <div className="bg-background rounded-xl border max-w-[380px] mx-auto overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-0.5">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{brandName.charAt(0)}</span>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{username}</p>
          <p className="text-[10px] text-muted-foreground">Được tài trợ</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>
      
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        <span className="text-6xl opacity-30">🖼️</span>
      </div>
      
      {/* Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)}>
            <Heart className={cn("h-6 w-6 transition-all", liked ? "fill-red-500 text-red-500 scale-110" : "hover:text-muted-foreground")} />
          </button>
          <MessageCircle className="h-6 w-6 hover:text-muted-foreground cursor-pointer" />
          <Send className="h-6 w-6 hover:text-muted-foreground cursor-pointer" />
        </div>
        <Bookmark className="h-6 w-6 hover:text-muted-foreground cursor-pointer" />
      </div>
      
      {/* Likes */}
      <div className="px-3">
        <p className="font-semibold text-sm">1,234 lượt thích</p>
      </div>
      
      {/* Caption */}
      <div className="px-3 py-2">
        <p className="text-sm">
          <span className="font-semibold">{username}</span>{' '}
          <span className="whitespace-pre-wrap">{variation.primary_text || 'Caption...'}</span>
        </p>
        {variation.headline && (
          <p className="text-sm font-medium mt-1">{variation.headline}</p>
        )}
      </div>
      
      {/* CTA */}
      {variation.cta_button && (
        <div className="px-3 pb-3">
          <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Tìm hiểu thêm'}
          </button>
        </div>
      )}
    </div>
  );
}

// Instagram Story Mockup - 9:16 vertical
export function InstagramStoryMockup({ variation, brandName = 'Brand', logoUrl }: MockupProps) {
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  
  return (
    <div className="bg-black rounded-2xl max-w-[260px] mx-auto aspect-[9/16] relative overflow-hidden shadow-lg">
      {/* Progress bar */}
      <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/30 rounded-full overflow-hidden z-20">
        <div className="h-full w-1/3 bg-white rounded-full" />
      </div>
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 px-3 flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-0.5">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{brandName.charAt(0)}</span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-medium">{username}</p>
        </div>
        <span className="text-white/60 text-[10px] bg-white/10 px-2 py-0.5 rounded">Được tài trợ</span>
      </div>
      
      {/* Image placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl opacity-20">🖼️</span>
      </div>
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-white text-sm mb-2 drop-shadow-lg line-clamp-3">
          {variation.primary_text || 'Story text...'}
        </p>
        <p className="text-white font-bold text-base drop-shadow-lg">
          {variation.headline || 'Headline...'}
        </p>
        
        {/* Swipe up CTA */}
        <div className="mt-4 flex flex-col items-center">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Xem thêm'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Instagram Reels Mockup - TikTok-like vertical
export function InstagramReelsMockup({ variation, brandName = 'Brand', logoUrl }: MockupProps) {
  const [liked, setLiked] = useState(false);
  const username = brandName.toLowerCase().replace(/\s+/g, '');
  
  return (
    <div className="bg-black rounded-2xl max-w-[260px] mx-auto aspect-[9/16] relative overflow-hidden shadow-lg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      {/* Image placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl opacity-20">🎬</span>
      </div>
      
      {/* Right sidebar */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center">
          <Heart className={cn("h-7 w-7 transition-all", liked ? "fill-red-500 text-red-500" : "text-white")} />
          <span className="text-white text-xs mt-1">12K</span>
        </button>
        <div className="flex flex-col items-center">
          <MessageCircle className="h-7 w-7 text-white" />
          <span className="text-white text-xs mt-1">234</span>
        </div>
        <div className="flex flex-col items-center">
          <Send className="h-7 w-7 text-white" />
          <span className="text-white text-xs mt-1">56</span>
        </div>
        <MoreHorizontal className="h-7 w-7 text-white" />
      </div>
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-12 p-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-0.5">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{brandName.charAt(0)}</span>
              )}
            </div>
          </div>
          <p className="text-white text-sm font-medium">{username}</p>
          <span className="text-white/60 text-[10px] bg-white/20 px-2 py-0.5 rounded">Được tài trợ</span>
        </div>
        <p className="text-white text-sm drop-shadow-lg line-clamp-2">
          {variation.primary_text || 'Caption...'}
        </p>
        {variation.headline && (
          <p className="text-white font-bold text-sm mt-1 drop-shadow-lg">
            {variation.headline}
          </p>
        )}
        
        {/* Music */}
        <div className="flex items-center gap-2 mt-2">
          <Music2 className="h-3 w-3 text-white" />
          <p className="text-white text-xs truncate">Original audio • {brandName}</p>
        </div>
      </div>
      
      {/* CTA */}
      {variation.cta_button && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <button className="w-full py-2 bg-white text-black rounded-lg text-sm font-medium">
            {CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Xem thêm'}
          </button>
        </div>
      )}
    </div>
  );
}
