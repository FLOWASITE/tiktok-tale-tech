import { 
  Calendar, TrendingUp, Sparkles, Lightbulb, BookOpen, 
  ArrowRight, BarChart3, Target, Star, Brain
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ILLUSTRATION_MAP } from './TopicEmptyStateIllustrations';

export type EmptyStateType = 
  | 'seasonal'
  | 'success-topics'
  | 'ai-suggestions'
  | 'topic-bank'
  | 'analytics'
  | 'weekly-plan'
  | 'conflict-checker'
  | 'no-brand-selected';

interface TopicEmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  className?: string;
  /** Show animated illustration instead of emoji */
  animated?: boolean;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: typeof Calendar;
  iconGradient: string;
  iconBg: string;
  title: string;
  description: string;
  actionLabel?: string;
  illustration?: string;
}> = {
  seasonal: {
    icon: Calendar,
    iconGradient: 'from-red-500 to-pink-500',
    iconBg: 'bg-red-500/10',
    title: 'Không có sự kiện sắp tới',
    description: 'Các gợi ý theo mùa sẽ xuất hiện khi có sự kiện đặc biệt trong 60 ngày tới.',
    illustration: '📅',
  },
  'success-topics': {
    icon: TrendingUp,
    iconGradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-500/10',
    title: 'Chưa có dữ liệu hiệu suất',
    description: 'Tạo và theo dõi content để xem những topics thành công nhất!',
    actionLabel: 'Tạo nội dung đầu tiên',
    illustration: '📊',
  },
  'ai-suggestions': {
    icon: Sparkles,
    iconGradient: 'from-primary to-violet-500',
    iconBg: 'bg-primary/10',
    title: 'Chưa có gợi ý AI',
    description: 'Chọn Brand Template để nhận gợi ý AI tùy chỉnh theo thương hiệu của bạn.',
    actionLabel: 'Quản lý Brand',
    illustration: '🤖',
  },
  'topic-bank': {
    icon: BookOpen,
    iconGradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-500/10',
    title: 'Ngân hàng ý tưởng trống',
    description: 'Lưu các topic yêu thích từ gợi ý AI hoặc tự thêm ý tưởng của bạn.',
    actionLabel: 'Khám phá ý tưởng',
    illustration: '💡',
  },
  analytics: {
    icon: BarChart3,
    iconGradient: 'from-violet-500 to-purple-500',
    iconBg: 'bg-violet-500/10',
    title: 'Chưa có dữ liệu phân tích',
    description: 'Sử dụng topics để tạo content và xem hiệu suất của chúng ở đây.',
    actionLabel: 'Bắt đầu tạo content',
    illustration: '📈',
  },
  'weekly-plan': {
    icon: Target,
    iconGradient: 'from-cyan-500 to-blue-500',
    iconBg: 'bg-cyan-500/10',
    title: 'Chưa có kế hoạch tuần',
    description: 'Bấm "Tạo kế hoạch" để AI gợi ý lịch content cho 7 ngày tới.',
    actionLabel: 'Tạo kế hoạch',
    illustration: '🗓️',
  },
  'conflict-checker': {
    icon: Brain,
    iconGradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-500/10',
    title: 'Không có topic để kiểm tra',
    description: 'Lưu ít nhất 2 topics vào ngân hàng để kiểm tra trùng lặp.',
    actionLabel: 'Thêm topics',
    illustration: '🔍',
  },
  'no-brand-selected': {
    icon: Target,
    iconGradient: 'from-primary to-violet-500',
    iconBg: 'bg-primary/10',
    title: 'Chọn Brand để cá nhân hóa',
    description: 'AI sẽ tạo gợi ý phù hợp với định vị, tone of voice và content pillars của thương hiệu bạn.',
    actionLabel: 'Chọn Brand',
    illustration: '🎯',
  },
};

export function TopicEmptyState({ type, onAction, className, animated = true }: TopicEmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  const IllustrationComponent = ILLUSTRATION_MAP[type];

  return (
    <Card className={cn('gradient-card border-border/50 border-dashed overflow-hidden', className)}>
      <CardContent className="py-8 text-center relative">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-tr-full" />
        </div>

        {/* Illustration - animated or emoji */}
        <div className="mb-4 flex justify-center relative z-10">
          {animated && IllustrationComponent ? (
            <IllustrationComponent />
          ) : (
            <div className="text-5xl opacity-80 animate-bounce" style={{ animationDuration: '2s' }}>
              {config.illustration}
            </div>
          )}
        </div>
        
        {/* Icon */}
        <div className={cn(
          'mx-auto mb-4 p-3 rounded-xl w-fit relative z-10',
          'bg-gradient-to-br',
          config.iconGradient
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Text */}
        <h4 className="font-medium text-foreground mb-2 relative z-10">{config.title}</h4>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4 relative z-10">
          {config.description}
        </p>

        {/* Action button */}
        {config.actionLabel && onAction && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAction} 
            className="gap-2 relative z-10 hover:scale-105 transition-transform"
          >
            {config.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
