// ============================================
// PersonalizedWelcome Component
// Animated welcome message with smart suggestions
// ============================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';
import { SmartSuggestionsGrid } from './SmartSuggestionsGrid';
import { BrandContextCard } from './BrandContextCard';

interface PersonalizedWelcomeProps {
  data: PersonalizedWelcomeData;
  onSuggestionClick: (prompt: string) => void;
  className?: string;
}

export function PersonalizedWelcome({ 
  data, 
  onSuggestionClick,
  className 
}: PersonalizedWelcomeProps) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Staggered animation sequence
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setShowGreeting(true), 100));
    timers.push(setTimeout(() => setShowBrand(true), 400));
    timers.push(setTimeout(() => setShowSuggestions(true), 700));
    
    return () => timers.forEach(clearTimeout);
  }, []);
  
  // Build welcome message based on context
  const getWelcomeMessage = () => {
    if (data.brandName) {
      return `Tôi là AI Content Strategist của Flowa. Đã sẵn sàng hỗ trợ **${data.brandName}** với TikTok Scripts, Carousels, và Multi-channel content.`;
    }
    return 'Tôi là AI Content Strategist của Flowa. Chọn Brand Template để tôi hiểu rõ context thương hiệu của bạn nhé!';
  };
  
  const getSkillTip = () => {
    switch (data.skillLevel) {
      case 'beginner':
        return 'Mô tả sản phẩm hoặc chọn một gợi ý bên dưới để bắt đầu.';
      case 'intermediate':
        return 'Thử tính năng Discovery Tab hoặc yêu cầu AI search xu hướng mới!';
      case 'expert':
        return 'Sử dụng "/" để truy cập quick commands hoặc @mention để tag context.';
      default:
        return 'Bạn muốn tôi giúp gì hôm nay?';
    }
  };

  if (data.isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Greeting Header */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-start gap-3"
          >
            <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="space-y-1 pt-1">
              <motion.h3 
                className="text-base font-semibold text-foreground flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {data.greeting}
                <Sparkles className="w-4 h-4 text-amber-500" />
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {getWelcomeMessage()}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Brand Context Card */}
      <AnimatePresence>
        {showBrand && data.brandName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <BrandContextCard
              brandName={data.brandName}
              brandLogo={data.brandLogo}
              industry={data.industry}
              pillars={data.contentPillars}
              recentTopicsCount={data.recentTopics.length}
              topCategory={data.topPerformingCategory}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Smart Suggestions */}
      <AnimatePresence>
        {showSuggestions && data.suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3" />
              {getSkillTip()}
            </p>
            <SmartSuggestionsGrid
              suggestions={data.suggestions}
              onSelect={onSuggestionClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Activity hint for returning users */}
      {data.daysInactive > 3 && data.recentTopics.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="text-xs text-muted-foreground/70 italic"
        >
          Bạn đã tạo {data.totalTopicsGenerated} topics. Tiếp tục nhé!
        </motion.p>
      )}
    </div>
  );
}
