import React from 'react';
import { AdCopyVariation } from '@/types/adCopy';
import { Globe, ExternalLink } from 'lucide-react';

interface MockupProps {
  variation: AdCopyVariation;
  brandName: string;
  logoUrl?: string;
}

// Google RSA Search Result Mockup
export const GoogleRSAMockup: React.FC<MockupProps> = ({ variation, brandName }) => {
  const headlines = variation.headlines as string[] | undefined;
  const descriptions = variation.descriptions as string[] | undefined;
  
  const displayHeadline = headlines?.[0] || variation.headline || 'Your Headline Here';
  const displayHeadline2 = headlines?.[1] || '';
  const displayDescription = descriptions?.[0] || variation.description || 'Your description text appears here.';
  const displayDescription2 = descriptions?.[1] || '';
  
  const displayUrl = `www.${brandName.toLowerCase().replace(/\s+/g, '')}.com`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[400px] mx-auto shadow-sm">
      {/* Google Search Bar */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-bold text-xl">G</span>
            <span className="text-red-500 font-bold text-xl">o</span>
            <span className="text-yellow-500 font-bold text-xl">o</span>
            <span className="text-blue-500 font-bold text-xl">g</span>
            <span className="text-green-500 font-bold text-xl">l</span>
            <span className="text-red-500 font-bold text-xl">e</span>
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            {brandName.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Ad Result */}
      <div className="p-4 space-y-2">
        {/* Sponsored Badge + URL */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            Quảng cáo
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Globe className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-600 dark:text-gray-400">{displayUrl}</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h3 className="text-lg font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-tight">
          {displayHeadline}
          {displayHeadline2 && ` | ${displayHeadline2}`}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {displayDescription}
          {displayDescription2 && ` ${displayDescription2}`}
        </p>

        {/* Sitelinks (optional display) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
          <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Tìm hiểu thêm</span>
          <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Liên hệ</span>
          <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Bảng giá</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] text-gray-400 text-center">
        Xem trước Google Search Ads
      </div>
    </div>
  );
};

// Google Display Banner Mockup
export const GoogleDisplayMockup: React.FC<MockupProps> = ({ variation, brandName, logoUrl }) => {
  const headline = variation.headline || 'Your Headline';
  const description = variation.description || 'Your compelling ad description goes here.';
  const ctaButton = variation.cta_button || 'Learn More';

  return (
    <div className="max-w-[336px] mx-auto">
      {/* 300x250 Medium Rectangle Banner */}
      <div className="relative w-[300px] h-[250px] mx-auto rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-4 text-white">
          {/* Top: Logo */}
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-full object-cover bg-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {brandName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium opacity-90">{brandName}</span>
          </div>

          {/* Middle: Text */}
          <div className="space-y-2">
            <h4 className="text-xl font-bold leading-tight drop-shadow-sm">
              {headline}
            </h4>
            <p className="text-sm opacity-90 leading-snug line-clamp-2">
              {description}
            </p>
          </div>

          {/* Bottom: CTA */}
          <div className="flex items-center justify-between">
            <button className="bg-white text-blue-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-1">
              {ctaButton}
              <ExternalLink className="w-3 h-3" />
            </button>
            
            {/* AdChoices */}
            <div className="flex items-center gap-1 text-[10px] opacity-60">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 19h20L12 2zm0 3.8L18.5 17H5.5L12 5.8zM11 10v4h2v-4h-2zm0 5v2h2v-2h-2z"/>
              </svg>
              <span>Ad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 text-[10px] text-gray-400 text-center">
        Google Display Network • 300×250
      </div>
    </div>
  );
};
