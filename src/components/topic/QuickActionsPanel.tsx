import { useState, useMemo } from 'react';
import { 
  Package, Rocket, Gift, Lightbulb, Heart, Users, 
  TrendingUp, BookOpen, Crown, Target, Megaphone, Sparkles,
  AlertTriangle, HelpCircle, Camera, Vote, Flame, Zap,
  Microscope, FileBarChart, Star, Dices, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';
import { QUICK_START_TEMPLATES, QuickStartTemplate } from '@/types/quickStartTemplates';

interface QuickActionsPanelProps {
  contentGoal?: ContentGoal;
  onAction: (prompt: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Icon mapping for quick actions
const iconMap: Record<string, React.ElementType> = {
  Package, Rocket, Gift, Lightbulb, Heart, Users, 
  TrendingUp, BookOpen, Crown, Target, Megaphone, Sparkles,
  AlertTriangle, HelpCircle, Camera, Vote, Flame, Zap,
  Microscope, FileBarChart, Star
};

// Category labels and colors
const CATEGORY_CONFIG: Record<ContentGoal, { label: string; emoji: string; gradient: string; bgColor: string }> = {
  education: { 
    label: 'Giáo dục', 
    emoji: '📚', 
    gradient: 'from-blue-500/20 to-cyan-500/20',
    bgColor: 'hover:bg-blue-500/10 border-blue-500/30'
  },
  awareness: { 
    label: 'Nhận thức', 
    emoji: '💫', 
    gradient: 'from-pink-500/20 to-rose-500/20',
    bgColor: 'hover:bg-pink-500/10 border-pink-500/30'
  },
  engagement: { 
    label: 'Tương tác', 
    emoji: '🔥', 
    gradient: 'from-orange-500/20 to-amber-500/20',
    bgColor: 'hover:bg-orange-500/10 border-orange-500/30'
  },
  expertise: { 
    label: 'Chuyên gia', 
    emoji: '🧠', 
    gradient: 'from-purple-500/20 to-violet-500/20',
    bgColor: 'hover:bg-purple-500/10 border-purple-500/30'
  },
  conversion: { 
    label: 'Chuyển đổi', 
    emoji: '🎯', 
    gradient: 'from-green-500/20 to-emerald-500/20',
    bgColor: 'hover:bg-green-500/10 border-green-500/30'
  },
};

// Quick prompt templates
const QUICK_PROMPTS = [
  { label: '5 topic viral cho tuần này', icon: Flame, prompt: 'Gợi ý 5 topic có tiềm năng viral cho tuần này, dựa trên xu hướng hiện tại' },
  { label: 'Content theo trend', icon: TrendingUp, prompt: 'Gợi ý các topic content theo trending topics đang hot' },
  { label: 'Content mùa lễ hội', icon: Gift, prompt: 'Gợi ý các topic content phù hợp với mùa lễ hội sắp tới' },
  { label: 'So sánh A vs B', icon: Zap, prompt: 'Gợi ý các topic dạng so sánh "A vs B" để tạo content thu hút tranh luận' },
];

export function QuickActionsPanel({
  contentGoal,
  onAction,
  isLoading = false,
  className,
}: QuickActionsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<ContentGoal | null>(contentGoal || null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get all templates for the selected category or all if none selected
  const templates = useMemo(() => {
    if (selectedCategory) {
      return QUICK_START_TEMPLATES[selectedCategory] || [];
    }
    // Return a mix from all categories when none selected
    return Object.values(QUICK_START_TEMPLATES).flatMap(t => t.slice(0, 2));
  }, [selectedCategory]);

  // Control how many to show
  const visibleTemplates = isExpanded ? templates : templates.slice(0, 4);
  const hasMore = templates.length > 4;

  // Get random template for inspiration
  const handleRandomInspiration = () => {
    const allTemplates = Object.values(QUICK_START_TEMPLATES).flat();
    const randomIndex = Math.floor(Math.random() * allTemplates.length);
    const randomTemplate = allTemplates[randomIndex];
    const prompt = `Hãy gợi ý các topic về "${randomTemplate.description}". ${randomTemplate.suggestedTopicTemplate}`;
    onAction(prompt);
  };

  const handleTemplateClick = (template: QuickStartTemplate) => {
    const prompt = `Tôi muốn tạo content với mục đích "${template.label}". ${template.description}. Gợi ý format: ${template.suggestedTopicTemplate}`;
    onAction(prompt);
  };

  const handleQuickPrompt = (prompt: string) => {
    onAction(prompt);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Category Pills */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Chọn mục tiêu content:</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const isSelected = selectedCategory === key;
            return (
              <Button
                key={key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs gap-1 transition-all',
                  !isSelected && config.bgColor
                )}
                onClick={() => setSelectedCategory(isSelected ? null : (key as ContentGoal))}
                disabled={isLoading}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

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
                onClick={() => handleQuickPrompt(prompt.prompt)}
                disabled={isLoading}
              >
                <IconComponent className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{prompt.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Template Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            Gợi ý theo mẫu:
            {selectedCategory && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4">
                {CATEGORY_CONFIG[selectedCategory].emoji} {CATEGORY_CONFIG[selectedCategory].label}
              </Badge>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-primary hover:text-primary"
            onClick={handleRandomInspiration}
            disabled={isLoading}
          >
            <Dices className="w-3.5 h-3.5" />
            Ngẫu nhiên
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visibleTemplates.map((template, index) => {
            const IconComponent = iconMap[template.icon] || Sparkles;
            const category = Object.entries(QUICK_START_TEMPLATES).find(([_, templates]) => 
              templates.includes(template)
            )?.[0] as ContentGoal | undefined;
            const categoryConfig = category ? CATEGORY_CONFIG[category] : null;

            return (
              <button
                key={`${template.id}-${index}`}
                className={cn(
                  'group relative p-3 rounded-xl border text-left transition-all duration-200',
                  'bg-gradient-to-br hover:shadow-md hover:scale-[1.02]',
                  categoryConfig?.gradient || 'from-primary/10 to-violet-500/10',
                  'border-border/50 hover:border-primary/30'
                )}
                onClick={() => handleTemplateClick(template)}
                disabled={isLoading}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-violet-500/5 transition-all" />
                
                <div className="relative space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-lg bg-background/80 shrink-0 group-hover:bg-background transition-colors">
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">
                        {template.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isLoading}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Xem thêm ({templates.length - 4})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
