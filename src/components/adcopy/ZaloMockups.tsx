import { Button } from '@/components/ui/button';
import { CTA_BUTTONS, type AdCopyVariation } from '@/types/adCopy';

interface ZaloMockupProps {
  variation: AdCopyVariation;
}

// Zalo OA Post Mockup (existing enhanced)
export function ZaloOAMockup({ variation }: ZaloMockupProps) {
  const ctaLabel = CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Tìm hiểu thêm';
  
  return (
    <div className="bg-background rounded-xl border max-w-[320px] mx-auto overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-[#0068ff] text-white p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
          OA
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Official Account</p>
          <p className="text-xs opacity-80">Được tài trợ</p>
        </div>
        <div className="text-xs opacity-60">•••</div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm leading-relaxed">{variation.primary_text || 'Nội dung quảng cáo...'}</p>
        
        {/* Link Preview Card */}
        <div className="bg-muted rounded-lg overflow-hidden border">
          <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <span className="text-4xl">🖼️</span>
          </div>
          <div className="p-3">
            <p className="font-medium text-sm line-clamp-2">{variation.headline || 'Tiêu đề...'}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{variation.description || 'Mô tả...'}</p>
          </div>
        </div>
        
        <Button size="sm" className="w-full bg-[#0068ff] hover:bg-[#0055dd]">
          {ctaLabel}
        </Button>
      </div>
      
      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>❤️ Thích</span>
        <span>💬 Bình luận</span>
        <span>↗️ Chia sẻ</span>
      </div>
    </div>
  );
}

// Zalo Message Ad Mockup (NEW)
export function ZaloMessageMockup({ variation }: ZaloMockupProps) {
  const ctaLabel = CTA_BUTTONS.find(c => c.value === variation.cta_button)?.label || 'Gửi tin nhắn';
  
  return (
    <div className="bg-[#e5efff] rounded-xl max-w-[320px] mx-auto overflow-hidden p-4">
      {/* Chat bubble from OA */}
      <div className="flex gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#0068ff] flex items-center justify-center text-white text-xs font-bold shrink-0">
          OA
        </div>
        <div className="flex-1">
          <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm">
            <p className="text-sm">{variation.primary_text || 'Xin chào! Bạn cần hỗ trợ gì?'}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 ml-1">Được tài trợ</p>
        </div>
      </div>
      
      {/* Action Card */}
      <div className="ml-10 bg-white rounded-xl overflow-hidden shadow-sm border">
        <div className="p-3 space-y-2">
          <p className="font-medium text-sm">{variation.headline || 'Tiêu đề ưu đãi'}</p>
          <p className="text-xs text-muted-foreground">{variation.description || 'Mô tả ngắn...'}</p>
        </div>
        <div className="border-t">
          <button className="w-full py-2.5 text-sm font-medium text-[#0068ff] hover:bg-muted/50 transition-colors">
            {ctaLabel}
          </button>
        </div>
      </div>
      
      {/* Quick Reply Buttons */}
      <div className="mt-3 flex gap-2 ml-10">
        <button className="px-3 py-1.5 text-xs bg-white rounded-full border hover:bg-muted/50 transition-colors">
          Quan tâm 👍
        </button>
        <button className="px-3 py-1.5 text-xs bg-white rounded-full border hover:bg-muted/50 transition-colors">
          Tư vấn ngay
        </button>
      </div>
    </div>
  );
}

// Zalo Article Card Mockup (NEW)
export function ZaloArticleMockup({ variation }: ZaloMockupProps) {
  return (
    <div className="bg-background rounded-xl border max-w-[320px] mx-auto overflow-hidden shadow-sm">
      {/* Article Image */}
      <div className="aspect-[16/9] bg-gradient-to-br from-[#0068ff]/10 to-[#0068ff]/5 flex items-center justify-center relative">
        <span className="text-5xl">📰</span>
        <div className="absolute top-2 left-2">
          <span className="text-[10px] bg-[#0068ff] text-white px-1.5 py-0.5 rounded">Bài viết</span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">Tài trợ</span>
        </div>
      </div>
      
      {/* Article Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-base line-clamp-2 leading-tight">
          {variation.headline || 'Tiêu đề bài viết hấp dẫn sẽ hiển thị ở đây...'}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {variation.primary_text || 'Nội dung tóm tắt bài viết sẽ hiển thị ở đây. Đây là phần giới thiệu ngắn gọn để thu hút người đọc click vào xem chi tiết...'}
        </p>
      </div>
      
      {/* Footer */}
      <div className="border-t px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0068ff] flex items-center justify-center text-white text-[10px] font-bold">
            OA
          </div>
          <span className="text-xs text-muted-foreground">Official Account</span>
        </div>
        <span className="text-xs text-muted-foreground">5 phút đọc</span>
      </div>
    </div>
  );
}

// Combined renderer based on platform type
export function ZaloAdMockup({ variation, subtype = 'oa' }: ZaloMockupProps & { subtype?: 'oa' | 'message' | 'article' }) {
  switch (subtype) {
    case 'message':
      return <ZaloMessageMockup variation={variation} />;
    case 'article':
      return <ZaloArticleMockup variation={variation} />;
    default:
      return <ZaloOAMockup variation={variation} />;
  }
}
