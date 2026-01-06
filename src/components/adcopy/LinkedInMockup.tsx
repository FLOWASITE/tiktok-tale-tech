import React, { useState } from 'react';
import { AdCopyVariation } from '@/types/adCopy';
import { MoreHorizontal, ThumbsUp, MessageSquare, Repeat2, Send, Globe, Image as ImageIcon } from 'lucide-react';

interface LinkedInMockupProps {
  variation: AdCopyVariation;
  brandName: string;
  logoUrl?: string;
}

export const LinkedInSponsoredMockup: React.FC<LinkedInMockupProps> = ({ variation, brandName, logoUrl }) => {
  const [isLiked, setIsLiked] = useState(false);
  
  const primaryText = variation.primary_text || 'Your professional message goes here. Share insights, updates, or compelling content with your network.';
  const headline = variation.headline || 'Discover how we can help your business grow';
  const description = variation.description || 'Learn more about our solutions and services.';
  const ctaButton = variation.cta_button || 'Learn more';
  
  const displayUrl = `${brandName.toLowerCase().replace(/\s+/g, '')}.com`;

  // LinkedIn reaction icons
  const reactions = [
    { icon: '👍', color: 'bg-blue-500' },
    { icon: '❤️', color: 'bg-red-500' },
    { icon: '💡', color: 'bg-yellow-500' },
  ];

  return (
    <div className="max-w-[400px] mx-auto">
      {/* LinkedIn Post Card */}
      <div className="bg-white dark:bg-[#1B1F23] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          {/* Company Logo */}
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
              {brandName.charAt(0)}
            </div>
          )}
          
          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-white hover:underline cursor-pointer hover:text-blue-600">
                {brandName}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              12.345 người theo dõi
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Được tài trợ</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-600 dark:border-blue-400">
              + Theo dõi
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Primary Text */}
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {primaryText}
          </p>
          {primaryText.length > 150 && (
            <button className="text-gray-500 hover:text-blue-600 text-sm font-medium mt-1">
              ...xem thêm
            </button>
          )}
        </div>

        {/* Link Preview Card */}
        <div className="mx-3 mb-3 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
          {/* Image Placeholder */}
          <div className="aspect-[1.91/1] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <span className="text-xs text-gray-400">1200 × 627</span>
            </div>
          </div>
          
          {/* Link Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight">
              {headline}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {description}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {displayUrl}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mx-3 mb-3">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full text-sm transition-colors">
            {ctaButton}
          </button>
        </div>

        {/* Reactions Summary */}
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            {/* Reaction Icons */}
            <div className="flex -space-x-1">
              {reactions.map((r, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${r.color} flex items-center justify-center text-[8px] border border-white dark:border-gray-800`}>
                  {r.icon}
                </div>
              ))}
            </div>
            <span className="ml-1">Bạn và 1.234 người khác</span>
          </div>
          <div className="flex items-center gap-3">
            <span>89 bình luận</span>
            <span>23 lượt chia sẻ</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-1 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isLiked ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">Thích</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">Bình luận</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm font-medium">Đăng lại</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors">
            <Send className="w-5 h-5" />
            <span className="text-sm font-medium">Gửi</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 text-[10px] text-gray-400 text-center">
        Xem trước LinkedIn Sponsored Content
      </div>
    </div>
  );
};
