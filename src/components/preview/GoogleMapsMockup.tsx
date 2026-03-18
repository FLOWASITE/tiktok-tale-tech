import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  MapPin, Phone, Globe, Clock, Star, Navigation, Share2, 
  Bookmark, MoreVertical, ChevronRight, MessageCircle, 
  ThumbsUp, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface GoogleMapsMockupProps {
  content: string;
  brandName: string;
  logoUrl?: string;
  isGenerating?: boolean;
  channelImage?: string;
}

const mockupMarkdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children: React.ReactNode }) => <ul className="list-none my-1.5 space-y-1">{children}</ul>,
  li: ({ children }: { children: React.ReactNode }) => <li className="flex items-start gap-1">{children}</li>,
  br: () => <br className="block" />,
};

export function GoogleMapsMockup({ content, brandName, logoUrl, isGenerating, channelImage }: GoogleMapsMockupProps) {
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);

  const displayUrl = `www.${brandName.toLowerCase().replace(/\s+/g, '')}.com`;
  const rating = 4.6;
  const reviewCount = 328;

  return (
    <div className="bg-white dark:bg-[#202124] rounded-xl border border-[#dadce0] dark:border-[#3c4043] overflow-hidden font-['Google_Sans',Roboto,Arial,sans-serif] shadow-sm max-w-[420px] mx-auto">
      
      {/* Map Header - Simulated map area */}
      <div className="relative h-[140px] bg-[#e8f0e8] dark:bg-[#1a3a1a] overflow-hidden">
        {/* Simulated map tiles */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#aad3aa] dark:bg-[#1e4d1e] opacity-30" />
          {/* Roads */}
          <div className="absolute top-1/3 left-0 right-0 h-[3px] bg-white/60 dark:bg-white/20" />
          <div className="absolute top-0 bottom-0 left-1/4 w-[3px] bg-white/60 dark:bg-white/20" />
          <div className="absolute top-0 bottom-0 right-1/3 w-[2px] bg-white/40 dark:bg-white/15" />
          <div className="absolute bottom-1/4 left-0 right-0 h-[2px] bg-white/40 dark:bg-white/15" />
          {/* Buildings/blocks */}
          <div className="absolute top-[15%] left-[10%] w-[60px] h-[40px] bg-[#d4e4d4] dark:bg-[#2a5a2a] rounded-sm opacity-60" />
          <div className="absolute top-[55%] right-[15%] w-[50px] h-[35px] bg-[#d4e4d4] dark:bg-[#2a5a2a] rounded-sm opacity-60" />
          <div className="absolute bottom-[10%] left-[40%] w-[70px] h-[30px] bg-[#d4e4d4] dark:bg-[#2a5a2a] rounded-sm opacity-50" />
        </div>
        
        {/* Location Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10">
          <div className="relative">
            <div className="w-8 h-8 bg-[#ea4335] rounded-full border-[3px] border-white shadow-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#ea4335]" />
          </div>
        </div>

        {/* Map controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button className="w-7 h-7 bg-white dark:bg-[#3c4043] rounded shadow-md flex items-center justify-center text-[#5f6368] dark:text-[#e8eaed] text-xs font-bold hover:bg-gray-50">+</button>
          <button className="w-7 h-7 bg-white dark:bg-[#3c4043] rounded shadow-md flex items-center justify-center text-[#5f6368] dark:text-[#e8eaed] text-xs font-bold hover:bg-gray-50">−</button>
        </div>
        
        {/* View larger map link */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] text-[#1a73e8] bg-white/90 dark:bg-[#202124]/90 px-1.5 py-0.5 rounded shadow-sm cursor-pointer hover:underline">
            Xem bản đồ lớn hơn
          </span>
        </div>
      </div>

      {/* Business Profile Card */}
      <div className="p-4">
        {/* Business Name + Actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-11 w-11 shrink-0 border border-[#dadce0] dark:border-[#3c4043]">
              {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
              <AvatarFallback className="bg-[#1a73e8] text-white font-bold text-sm">
                {brandName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-[#202124] dark:text-[#e8eaed] leading-tight">{brandName}</h3>
              <p className="text-xs text-[#70757a] dark:text-[#9aa0a6] mt-0.5">Dịch vụ Marketing</p>
            </div>
          </div>
          <button className="p-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-full transition-colors">
            <MoreVertical className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]" />
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{rating}</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star} 
                className={cn(
                  "w-3.5 h-3.5",
                  star <= Math.floor(rating)
                    ? "text-[#fbbc04] fill-[#fbbc04]"
                    : star <= rating + 0.5
                      ? "text-[#fbbc04] fill-[#fbbc04]/50"
                      : "text-[#dadce0] dark:text-[#5f6368]"
                )} 
              />
            ))}
          </div>
          <span className="text-xs text-[#70757a] dark:text-[#9aa0a6]">({reviewCount.toLocaleString()} đánh giá)</span>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: <Navigation className="w-4 h-4" />, label: 'Chỉ đường', color: 'text-[#1a73e8]' },
            { icon: <Phone className="w-4 h-4" />, label: 'Gọi', color: 'text-[#1a73e8]' },
            { icon: <Bookmark className={cn("w-4 h-4", saved && "fill-[#1a73e8]")}, label: 'Lưu', color: saved ? 'text-[#1a73e8]' : 'text-[#1a73e8]', onClick: () => setSaved(!saved) },
            { icon: <Share2 className="w-4 h-4" />, label: 'Chia sẻ', color: 'text-[#1a73e8]' },
          ].map((action, i) => (
            <button 
              key={i} 
              onClick={action.onClick}
              className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
            >
              <div className={cn("transition-colors", action.color)}>{action.icon}</div>
              <span className="text-[10px] font-medium text-[#1a73e8]">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Business Info */}
        <div className="space-y-2.5 pb-3 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#70757a] dark:text-[#9aa0a6] mt-0.5 shrink-0" />
            <span className="text-sm text-[#202124] dark:text-[#e8eaed]">123 Nguyễn Huệ, Quận 1, TP.HCM</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#70757a] dark:text-[#9aa0a6] mt-0.5 shrink-0" />
            <div>
              <span className="text-sm text-[#188038] font-medium">Đang mở cửa</span>
              <span className="text-sm text-[#202124] dark:text-[#e8eaed]"> · Đóng cửa lúc 18:00</span>
              <ChevronRight className="w-3 h-3 text-[#70757a] inline ml-0.5" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-[#70757a] dark:text-[#9aa0a6] mt-0.5 shrink-0" />
            <span className="text-sm text-[#1a73e8] hover:underline cursor-pointer">028 1234 5678</span>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-[#70757a] dark:text-[#9aa0a6] mt-0.5 shrink-0" />
            <span className="text-sm text-[#1a73e8] hover:underline cursor-pointer">{displayUrl}</span>
          </div>
        </div>
      </div>

      {/* Updates / Posts Section - THIS IS WHERE THE CONTENT GOES */}
      <div className="border-t border-[#dadce0] dark:border-[#3c4043]">
        <div className="px-4 pt-3 pb-2">
          <h4 className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]" />
            Bài đăng mới nhất
          </h4>
        </div>
        
        <div className="px-4 pb-4">
          <div className="bg-[#f8f9fa] dark:bg-[#303134] rounded-lg overflow-hidden border border-[#dadce0] dark:border-[#3c4043]">
            {/* Post image */}
            {channelImage && (
              <div className="w-full aspect-[16/9] bg-[#e8eaed] dark:bg-[#3c4043]">
                <img src={channelImage} alt="Post" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Post content */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  {logoUrl ? <AvatarImage src={logoUrl} alt={brandName} /> : null}
                  <AvatarFallback className="bg-[#1a73e8] text-white text-[9px] font-bold">
                    {brandName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">{brandName}</span>
                  <span className="text-[10px] text-[#70757a] dark:text-[#9aa0a6] ml-2">2 giờ trước</span>
                </div>
              </div>

              {isGenerating ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-[#dadce0] dark:bg-[#5f6368] rounded w-full" />
                  <div className="h-3.5 bg-[#dadce0] dark:bg-[#5f6368] rounded w-5/6" />
                  <div className="h-3.5 bg-[#dadce0] dark:bg-[#5f6368] rounded w-4/6" />
                </div>
              ) : (
                <div className="text-[13px] text-[#202124] dark:text-[#e8eaed] leading-relaxed">
                  <ReactMarkdown components={mockupMarkdownComponents}>{content}</ReactMarkdown>
                </div>
              )}

              {/* Post actions */}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#dadce0] dark:border-[#3c4043]">
                <button 
                  onClick={() => setLiked(!liked)}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors",
                    liked ? "text-[#1a73e8]" : "text-[#70757a] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  )}
                >
                  <ThumbsUp className={cn("w-3.5 h-3.5", liked && "fill-[#1a73e8]")} />
                  <span>{liked ? '25' : '24'}</span>
                </button>
                <button className="flex items-center gap-1 text-xs text-[#70757a] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Chia sẻ</span>
                </button>
                <a href="#" className="flex items-center gap-1 text-xs text-[#1a73e8] ml-auto hover:underline">
                  <span>Xem thêm</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos Section */}
      <div className="border-t border-[#dadce0] dark:border-[#3c4043] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]" />
            Ảnh
          </h4>
          <span className="text-xs text-[#1a73e8] cursor-pointer hover:underline">Xem tất cả</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-[#e8eaed] dark:bg-[#3c4043] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              {channelImage && i === 0 ? (
                <img src={channelImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#9aa0a6]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#f8f9fa] dark:bg-[#303134] border-t border-[#dadce0] dark:border-[#3c4043] text-center">
        <span className="text-[10px] text-[#70757a] dark:text-[#9aa0a6]">Xem trước Google Business Profile</span>
      </div>
    </div>
  );
}
