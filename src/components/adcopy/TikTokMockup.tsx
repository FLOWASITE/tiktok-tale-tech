import React from 'react';
import { AdCopyVariation } from '@/types/adCopy';
import { Heart, MessageCircle, Bookmark, Share2, Music, Plus, Home, Search, Users, User } from 'lucide-react';

interface TikTokMockupProps {
  variation: AdCopyVariation;
  brandName: string;
  logoUrl?: string;
}

export const TikTokAdMockup: React.FC<TikTokMockupProps> = ({ variation, brandName, logoUrl }) => {
  const primaryText = variation.primary_text || 'Your engaging caption goes here ✨';
  const ctaButton = variation.cta_button || 'Shop Now';
  
  // Extract hashtags from primary text
  const hashtagRegex = /#\w+/g;
  const hashtags = primaryText.match(hashtagRegex) || ['#ad', '#sponsored'];
  const captionWithoutHashtags = primaryText.replace(hashtagRegex, '').trim();

  return (
    <div className="max-w-[280px] mx-auto">
      {/* TikTok Phone Frame */}
      <div className="relative bg-black rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ aspectRatio: '9/19.5' }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />
        
        {/* Status Bar */}
        <div className="absolute top-1.5 left-0 right-0 flex justify-between items-center px-6 z-10 text-white text-[10px] font-medium">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              <div className="w-1 h-2 bg-white rounded-sm" />
              <div className="w-1 h-2.5 bg-white rounded-sm" />
              <div className="w-1 h-3 bg-white rounded-sm" />
              <div className="w-1 h-3.5 bg-white rounded-sm" />
            </div>
            <span>5G</span>
            <div className="w-5 h-2.5 border border-white rounded-sm relative">
              <div className="absolute inset-0.5 right-1 bg-white rounded-sm" />
            </div>
          </div>
        </div>

        {/* Video Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black">
          {/* Simulated video content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20" />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="absolute top-10 left-0 right-0 flex justify-center gap-1 z-10">
          <div className="w-8 h-1 bg-white rounded-full" />
          <div className="w-8 h-1 bg-white/40 rounded-full" />
          <div className="w-8 h-1 bg-white/40 rounded-full" />
          <div className="w-8 h-1 bg-white/40 rounded-full" />
        </div>

        {/* Top Nav */}
        <div className="absolute top-14 left-0 right-0 flex justify-center items-center gap-6 z-10">
          <span className="text-white/60 text-sm font-medium">Đang Follow</span>
          <span className="text-white text-sm font-semibold border-b-2 border-white pb-0.5">Dành cho bạn</span>
        </div>

        {/* Right Sidebar */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
          {/* Profile */}
          <div className="relative">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-11 h-11 rounded-full border-2 border-white object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-white">
                {brandName.charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Like */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <Heart className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium">12.5K</span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium">234</span>
          </div>

          {/* Bookmark */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <Bookmark className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium">89</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium">56</span>
          </div>

          {/* Music Disc */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-400" />
            )}
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-20 left-3 right-16 z-10 space-y-2">
          {/* Sponsored Badge */}
          <div className="flex items-center gap-2">
            <span className="bg-gray-800/80 text-white text-[10px] px-2 py-0.5 rounded font-medium">
              Được tài trợ
            </span>
          </div>

          {/* Username */}
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</span>
          </div>

          {/* Caption */}
          <p className="text-white text-xs leading-relaxed line-clamp-2">
            {captionWithoutHashtags}
          </p>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1">
            {hashtags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-white text-xs font-medium">{tag}</span>
            ))}
          </div>

          {/* Sound */}
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3 text-white" />
            <div className="bg-gray-800/60 rounded-full px-2 py-0.5">
              <span className="text-white text-[10px]">Âm thanh gốc - {brandName}</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="absolute bottom-20 right-3 z-10">
          <button className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-sm shadow-lg">
            {ctaButton}
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-black py-2 z-10">
          <div className="flex justify-around items-center">
            <div className="flex flex-col items-center gap-0.5">
              <Home className="w-5 h-5 text-white" />
              <span className="text-white text-[9px]">Trang chủ</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Search className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-[9px]">Khám phá</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-7 bg-gradient-to-r from-cyan-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-black" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Users className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-[9px]">Hộp thư</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <User className="w-5 h-5 text-white/60" />
              <span className="text-white/60 text-[9px]">Hồ sơ</span>
            </div>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/50 rounded-full z-20" />
      </div>

      {/* Footer */}
      <div className="mt-3 text-[10px] text-gray-400 text-center">
        Xem trước TikTok In-Feed Ad
      </div>
    </div>
  );
};
