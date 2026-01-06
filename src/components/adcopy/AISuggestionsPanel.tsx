import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AD_PLATFORMS, 
  AD_OBJECTIVES, 
  FUNNEL_STAGES,
  type AdPlatform, 
  type AdObjective, 
  type AdFunnelStage 
} from '@/types/adCopy';

interface AISuggestion {
  platform: AdPlatform;
  objective: AdObjective;
  funnelStage: AdFunnelStage;
  confidence: number;
  reason: string;
}

interface AISuggestionsPanelProps {
  topic: string;
  currentPlatform: AdPlatform;
  currentObjective: AdObjective;
  currentFunnelStage: AdFunnelStage;
  onApplySuggestion: (suggestion: Partial<AISuggestion>) => void;
  onDismiss: () => void;
}

// Simple heuristic-based suggestions (no API call needed)
function generateSuggestions(topic: string): AISuggestion | null {
  if (!topic || topic.length < 10) return null;
  
  const topicLower = topic.toLowerCase();
  
  // E-commerce keywords
  const ecommerceKeywords = ['giảm', 'sale', 'mua', 'sản phẩm', 'giá', 'khuyến mãi', 'đặt hàng', 'freeship', 'shop'];
  const isEcommerce = ecommerceKeywords.some(k => topicLower.includes(k));
  
  // Education keywords
  const educationKeywords = ['khóa học', 'học', 'webinar', 'workshop', 'đào tạo', 'chứng chỉ', 'kỹ năng'];
  const isEducation = educationKeywords.some(k => topicLower.includes(k));
  
  // Event keywords
  const eventKeywords = ['sự kiện', 'event', 'hội thảo', 'tham gia', 'đăng ký'];
  const isEvent = eventKeywords.some(k => topicLower.includes(k));
  
  // B2B keywords
  const b2bKeywords = ['doanh nghiệp', 'công ty', 'giải pháp', 'dịch vụ', 'tư vấn', 'hợp tác'];
  const isB2B = b2bKeywords.some(k => topicLower.includes(k));
  
  // Video/content keywords
  const videoKeywords = ['video', 'clip', 'xem', 'trend', 'viral'];
  const isVideo = videoKeywords.some(k => topicLower.includes(k));
  
  // Urgency keywords
  const urgencyKeywords = ['chỉ còn', 'hôm nay', '24h', 'cuối cùng', 'nhanh'];
  const hasUrgency = urgencyKeywords.some(k => topicLower.includes(k));
  
  if (isEcommerce && hasUrgency) {
    return {
      platform: 'instagram_story',
      objective: 'conversions',
      funnelStage: 'conversion',
      confidence: 0.85,
      reason: 'Nội dung bán hàng với tính urgency phù hợp Story format',
    };
  }
  
  if (isEcommerce) {
    return {
      platform: 'facebook_feed',
      objective: 'conversions',
      funnelStage: 'consideration',
      confidence: 0.8,
      reason: 'Nội dung e-commerce tối ưu cho Facebook với mục tiêu chuyển đổi',
    };
  }
  
  if (isEducation) {
    return {
      platform: 'facebook_feed',
      objective: 'leads',
      funnelStage: 'consideration',
      confidence: 0.82,
      reason: 'Khóa học phù hợp lead generation để thu thập đăng ký',
    };
  }
  
  if (isB2B) {
    return {
      platform: 'linkedin',
      objective: 'leads',
      funnelStage: 'consideration',
      confidence: 0.88,
      reason: 'Nội dung B2B chuyên nghiệp tối ưu cho LinkedIn',
    };
  }
  
  if (isEvent) {
    return {
      platform: 'facebook_feed',
      objective: 'engagement',
      funnelStage: 'awareness',
      confidence: 0.75,
      reason: 'Sự kiện cần tương tác và lan tỏa trên Facebook',
    };
  }
  
  if (isVideo) {
    return {
      platform: 'instagram_reels',
      objective: 'engagement',
      funnelStage: 'awareness',
      confidence: 0.78,
      reason: 'Nội dung video ngắn phù hợp Reels để viral',
    };
  }
  
  // Default suggestion
  return {
    platform: 'facebook_feed',
    objective: 'traffic',
    funnelStage: 'awareness',
    confidence: 0.6,
    reason: 'Đề xuất mặc định cho nội dung đa mục đích',
  };
}

export function AISuggestionsPanel({
  topic,
  currentPlatform,
  currentObjective,
  currentFunnelStage,
  onApplySuggestion,
  onDismiss,
}: AISuggestionsPanelProps) {
  const suggestion = React.useMemo(() => generateSuggestions(topic), [topic]);
  
  if (!suggestion) return null;
  
  // Check if any suggestion differs from current values
  const hasDifferentPlatform = suggestion.platform !== currentPlatform;
  const hasDifferentObjective = suggestion.objective !== currentObjective;
  const hasDifferentFunnel = suggestion.funnelStage !== currentFunnelStage;
  
  if (!hasDifferentPlatform && !hasDifferentObjective && !hasDifferentFunnel) return null;
  
  const platformConfig = AD_PLATFORMS.find(p => p.value === suggestion.platform);
  const objectiveConfig = AD_OBJECTIVES.find(o => o.value === suggestion.objective);
  const funnelConfig = FUNNEL_STAGES.find(f => f.value === suggestion.funnelStage);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/30">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm text-amber-900 dark:text-amber-100">
                Gợi ý từ AI
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 border-amber-400 text-amber-700 bg-amber-100">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                {Math.round(suggestion.confidence * 100)}% confident
              </Badge>
            </div>
            
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              {suggestion.reason}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {hasDifferentPlatform && platformConfig && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-white dark:bg-gray-800 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => onApplySuggestion({ platform: suggestion.platform })}
                >
                  {platformConfig.icon} {platformConfig.label}
                </Badge>
              )}
              {hasDifferentObjective && objectiveConfig && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-white dark:bg-gray-800 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => onApplySuggestion({ objective: suggestion.objective })}
                >
                  {objectiveConfig.icon} {objectiveConfig.label}
                </Badge>
              )}
              {hasDifferentFunnel && funnelConfig && (
                <Badge 
                  variant="secondary" 
                  className={cn("gap-1 bg-white dark:bg-gray-800 cursor-pointer hover:bg-primary/10 transition-colors")}
                  onClick={() => onApplySuggestion({ funnelStage: suggestion.funnelStage })}
                >
                  {funnelConfig.label}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700"
                onClick={() => onApplySuggestion(suggestion)}
              >
                <Check className="h-3 w-3" />
                Áp dụng tất cả
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
                Bỏ qua
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
