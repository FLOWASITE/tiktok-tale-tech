import { MessageSquare, Video, Images, ArrowRight, Sparkles, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface TopicFormatSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  contentGoal?: ContentGoal;
  onSelectFormat: (format: 'multichannel' | 'script' | 'carousel') => void;
}

const formatOptions = [
  {
    id: 'multichannel' as const,
    name: 'Multi-channel',
    description: 'Tạo nội dung cho nhiều kênh social media cùng lúc',
    icon: MessageSquare,
    color: 'from-primary to-blue-600',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30 hover:border-primary',
    features: ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', '...'],
    bestFor: 'Phủ sóng đa nền tảng',
  },
  {
    id: 'script' as const,
    name: 'Video Script',
    description: 'Tạo kịch bản video ngắn với hook, body, CTA',
    icon: Video,
    color: 'from-violet-600 to-purple-600',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30 hover:border-violet-500',
    features: ['15s', '30s', '60s', 'Storyboard'],
    bestFor: 'TikTok, Reels, Shorts',
  },
  {
    id: 'carousel' as const,
    name: 'Carousel',
    description: 'Tạo slide carousel với nội dung hấp dẫn',
    icon: Images,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30 hover:border-orange-500',
    features: ['5-10 slides', 'Cover + CTA', 'Prompt hình ảnh'],
    bestFor: 'Instagram, LinkedIn',
  },
];

const goalLabels: Record<ContentGoal, string> = {
  engagement: 'Tăng tương tác',
  awareness: 'Nâng cao nhận diện',
  conversion: 'Chuyển đổi',
  education: 'Giáo dục',
  expertise: 'Xây chuyên gia',
};

export function TopicFormatSelector({
  open,
  onOpenChange,
  topic,
  contentGoal,
  onSelectFormat,
}: TopicFormatSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Chọn định dạng content
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Bạn muốn tạo nội dung gì với topic này?</p>
            <div className="p-3 rounded-lg bg-muted/50 border border-border mt-2">
              <p className="font-medium text-foreground line-clamp-2">{topic}</p>
              {contentGoal && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Mục tiêu: {goalLabels[contentGoal]}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {formatOptions.map((format, index) => {
            const Icon = format.icon;
            
            // Haptic feedback helper
            const triggerHaptic = () => {
              if ('vibrate' in navigator) {
                navigator.vibrate(15);
              }
            };
            
            return (
              <button
                key={format.id}
                className={cn(
                  'group relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200',
                  format.borderColor,
                  'hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]',
                  'animate-fade-in'
                )}
                style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
                onClick={() => {
                  triggerHaptic();
                  onSelectFormat(format.id);
                }}
              >
                {/* Icon */}
                <div className={cn('shrink-0 p-3 rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-200 group-active:scale-95', format.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {format.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {format.bestFor}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {format.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {format.features.map((feature) => (
                      <span
                        key={feature}
                        className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', format.bgColor)}
                      >
                        <Check className="w-3 h-3" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="shrink-0 self-center p-2 rounded-full bg-muted group-hover:bg-primary group-active:scale-90 transition-all duration-150">
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
