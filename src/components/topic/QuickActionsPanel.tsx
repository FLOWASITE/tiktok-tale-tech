import { useState } from 'react';
import { 
  Flame, Gift, TrendingUp, Zap, Dices, ChevronUp, ChevronDown,
  BookOpen, Eye, Award, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';

interface QuickActionsPanelProps {
  contentGoal?: ContentGoal;
  onAction: (prompt: string) => void;
  isLoading?: boolean;
  className?: string;
  variant?: 'full' | 'compact';
}

// Category config - synced with CONTENT_GOALS in multichannel.ts
const CATEGORY_CONFIG: Record<ContentGoal, { label: string; emoji: string; icon: React.ElementType }> = {
  education: { label: 'Giáo dục', emoji: '📚', icon: BookOpen },
  awareness: { label: 'Nhận diện', emoji: '👁️', icon: Eye },
  engagement: { label: 'Tương tác', emoji: '🔥', icon: Flame },
  expertise: { label: 'Chuyên gia', emoji: '🧠', icon: Award },
  conversion: { label: 'Chuyển đổi', emoji: '🎯', icon: Target },
};

// Quick prompts - compact version
const QUICK_PROMPTS = [
  { label: 'Viral tuần này', icon: Flame, prompt: 'Gợi ý 5 topic có tiềm năng viral cho tuần này' },
  { label: 'Theo trend', icon: TrendingUp, prompt: 'Gợi ý các topic content theo trending topics đang hot' },
  { label: 'Mùa lễ hội', icon: Gift, prompt: 'Gợi ý các topic content phù hợp với mùa lễ hội sắp tới' },
  { label: 'So sánh A vs B', icon: Zap, prompt: 'Gợi ý các topic dạng so sánh để tạo content thu hút' },
];

// Content type prompts
const CONTENT_TYPES = [
  { label: 'Video Script', prompt: 'Gợi ý 3 ý tưởng video script viral' },
  { label: 'Carousel', prompt: 'Gợi ý 3 ý tưởng carousel thu hút' },
  { label: 'Bài viết', prompt: 'Gợi ý 3 ý tưởng bài viết chuyên sâu' },
];

export function QuickActionsPanel({
  contentGoal,
  onAction,
  isLoading = false,
  className,
  variant = 'full',
}: QuickActionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Random inspiration
  const handleRandomInspiration = () => {
    const prompts = [
      'Gợi ý một topic bất ngờ và sáng tạo cho content hôm nay',
      'Surprise me với một ý tưởng content độc đáo',
      'Gợi ý topic nào đó thú vị mà tôi chưa nghĩ tới',
    ];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    onAction(randomPrompt);
  };

  // Compact floating bar version - Responsive
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-1.5 sm:space-y-2', className)}>
        {/* Main row - always visible */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Quick prompts - show less on mobile */}
          {QUICK_PROMPTS.slice(0, isExpanded ? 4 : 2).map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-6 sm:h-7 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-background/80 hover:bg-primary hover:text-primary-foreground transition-all px-2 sm:px-3"
                onClick={() => onAction(item.prompt)}
                disabled={isLoading}
              >
                <IconComponent className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden xs:inline">{item.label}</span>
                <span className="xs:hidden">{item.label.split(' ')[0]}</span>
              </Button>
            );
          })}
          
          {/* Random button */}
          <Button
            variant="outline"
            size="sm"
            className="h-6 sm:h-7 text-[10px] sm:text-xs gap-1 sm:gap-1.5 bg-gradient-to-r from-violet-500/10 to-pink-500/10 border-violet-500/30 hover:from-violet-500/20 hover:to-pink-500/20 px-2 sm:px-3"
            onClick={handleRandomInspiration}
            disabled={isLoading}
          >
            <Dices className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="hidden xs:inline">Ngẫu nhiên</span>
            <span className="xs:hidden">🎲</span>
          </Button>

          {/* Expand toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </Button>
        </div>

        {/* Expanded row - content types - Responsive */}
        {isExpanded && (
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap animate-in slide-in-from-bottom-2 duration-200">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Format:</span>
            {CONTENT_TYPES.map((item, index) => (
              <Button
                key={index}
                variant="secondary"
                size="sm"
                className="h-5 sm:h-6 text-[9px] sm:text-[10px] px-1.5 sm:px-2"
                onClick={() => onAction(item.prompt)}
                disabled={isLoading}
              >
                {item.label}
              </Button>
            ))}
            
            {/* Goal selector - show all 5 goals */}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-1 sm:ml-2">Mục tiêu:</span>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={contentGoal === key ? 'default' : 'outline'}
                size="sm"
                className="h-5 sm:h-6 text-[9px] sm:text-[10px] px-1.5 sm:px-2 gap-0.5 sm:gap-1"
                onClick={() => onAction(`Gợi ý topic với mục tiêu ${config.label}`)}
                disabled={isLoading}
              >
                {config.emoji}
                <span className="hidden sm:inline">{config.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version (original)
  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick Prompt Templates */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Prompt nhanh:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PROMPTS.map((prompt, index) => {
            const IconComponent = prompt.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-8 text-xs justify-start gap-1.5 bg-muted/50 hover:bg-muted"
                onClick={() => onAction(prompt.prompt)}
                disabled={isLoading}
              >
                <IconComponent className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{prompt.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Category Pills */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Theo mục tiêu:</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const isSelected = contentGoal === key;
            return (
              <Button
                key={key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1 transition-all"
                onClick={() => onAction(`Gợi ý topic với mục tiêu "${config.label}"`)}
                disabled={isLoading}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Random Inspiration */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-gradient-to-r from-violet-500/10 to-pink-500/10 border-violet-500/30 hover:from-violet-500/20 hover:to-pink-500/20"
          onClick={handleRandomInspiration}
          disabled={isLoading}
        >
          <Dices className="w-4 h-4" />
          Gợi ý ngẫu nhiên
        </Button>
      </div>
    </div>
  );
}
