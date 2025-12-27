import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Gift, Shuffle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiscoveryChipsProps {
  onChipClick: (prompt: string) => void;
  isTyping?: boolean;
  isLoading?: boolean;
  className?: string;
}

// Haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
}

const DISCOVERY_CHIPS = [
  {
    id: 'hot',
    label: 'Hot',
    icon: Flame,
    prompt: 'Cho tôi những topic đang hot nhất trong tuần này',
    color: 'text-orange-500 hover:bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: TrendingUp,
    prompt: 'Xu hướng content nào đang được quan tâm nhiều nhất?',
    color: 'text-blue-500 hover:bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'event',
    label: 'Sự kiện',
    icon: Gift,
    prompt: 'Những sự kiện nào sắp tới mà tôi nên tận dụng để tạo content?',
    color: 'text-green-500 hover:bg-green-500/10 border-green-500/30',
  },
  {
    id: 'random',
    label: 'Ngẫu nhiên',
    icon: Shuffle,
    prompt: 'Gợi ý cho tôi một topic sáng tạo và bất ngờ',
    color: 'text-violet-500 hover:bg-violet-500/10 border-violet-500/30',
  },
];

// Random prompts for the surprise button
const RANDOM_PROMPTS = [
  'Gợi ý topic viral tiềm năng cho tuần này',
  'Content nào sẽ tạo nhiều tương tác nhất?',
  'Ý tưởng content giúp tăng nhận diện thương hiệu',
  'Topic nào phù hợp để tạo carousel?',
  'Gợi ý script video ngắn hấp dẫn',
  'Content storytelling cho thương hiệu',
  'Topic educational phù hợp với ngành của tôi',
  'Ý tưởng content behind-the-scenes',
];

export function DiscoveryChips({
  onChipClick,
  isTyping = false,
  isLoading = false,
  className,
}: DiscoveryChipsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  
  // Auto-collapse when typing
  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isTyping]);
  
  const handleChipClick = (chip: typeof DISCOVERY_CHIPS[0]) => {
    triggerHaptic('medium');
    setSelectedChip(chip.id);
    
    // For random, pick a random prompt
    const prompt = chip.id === 'random' 
      ? RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
      : chip.prompt;
    
    onChipClick(prompt);
    
    // Reset selection after animation
    setTimeout(() => setSelectedChip(null), 300);
  };
  
  if (!isVisible || isLoading) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-1 py-1 overflow-x-auto scrollbar-hide",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />
      
      {DISCOVERY_CHIPS.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.id}
            variant="outline"
            size="sm"
            onClick={() => handleChipClick(chip)}
            disabled={isLoading}
            className={cn(
              "h-6 text-[10px] gap-1 px-2 shrink-0 border transition-all duration-150",
              chip.color,
              selectedChip === chip.id && "scale-95 opacity-70"
            )}
          >
            <Icon className="w-3 h-3" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
