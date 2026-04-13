// ============================================
// PersonalizedWelcome Component
// Animated welcome message with smart suggestions
// ============================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  
  const getWelcomeMessage = () => {
    if (data.brandName) {
      return t('chatbot.personalized.withBrand', { brandName: data.brandName });
    }
    return t('chatbot.personalized.noBrand');
  };
  
  const getSkillTip = () => {
    switch (data.skillLevel) {
      case 'beginner':
        return t('chatbot.personalized.tipBeginner');
      case 'intermediate':
        return t('chatbot.personalized.tipIntermediate');
      case 'expert':
        return t('chatbot.personalized.tipExpert');
      default:
        return t('chatbot.personalized.tipDefault');
    }
  };

  if (data.isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-64 rounded-lg skeleton-shimmer" />
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-28 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Greeting Header */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex items-start gap-3.5"
          >
            <div className="shrink-0 relative ai-avatar-pulse">
              <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div className="space-y-1.5 pt-0.5">
              <motion.h3 
                className="text-base font-bold text-foreground flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {data.greeting}
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </motion.span>
              </motion.h3>
              <motion.p 
                className="text-sm text-muted-foreground leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
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
          {t('chatbot.personalized.activityHint', { count: data.totalTopicsGenerated })}
        </motion.p>
      )}
    </div>
  );
}
