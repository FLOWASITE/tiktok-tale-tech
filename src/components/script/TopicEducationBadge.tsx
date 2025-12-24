import React from 'react';
import { Info, Target, TrendingUp, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const SCORE_EXPLANATIONS = [
  {
    key: 'brandFit',
    icon: Target,
    label: 'Brand Fit',
    description: 'Mức độ phù hợp với thương hiệu đã chọn. Điểm cao = nội dung sẽ nhất quán với tone và style của brand.',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    key: 'trend',
    icon: TrendingUp,
    label: 'Trending',
    description: 'Mức độ "hot" hiện tại trên mạng xã hội. Điểm cao = đang được nhiều người quan tâm.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    key: 'competition',
    icon: BarChart3,
    label: 'Cạnh tranh',
    description: 'Độ cạnh tranh thấp = dễ nổi bật. Điểm cao = ít đối thủ làm về chủ đề này.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'engagement',
    icon: Users,
    label: 'Tương tác',
    description: 'Tiềm năng nhận được like, comment, share. Điểm cao = khán giả thường tương tác nhiều với dạng nội dung này.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

export function TopicEducationBadge() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          <Info className="w-3 h-3" />
          Hướng dẫn
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="bottom" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Cách đọc điểm đánh giá</h4>
            <p className="text-xs text-muted-foreground">
              Mỗi chủ đề được AI đánh giá theo 4 tiêu chí. Điểm càng cao càng tốt.
            </p>
          </div>

          <div className="space-y-3">
            {SCORE_EXPLANATIONS.map(({ key, icon: Icon, label, description, color, bgColor }) => (
              <div key={key} className="flex gap-3">
                <div className={cn('p-1.5 rounded-md shrink-0', bgColor)}>
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                </div>
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">Điểm tổng hợp:</span>
              <span className="text-muted-foreground">
                = 30% Brand + 20% Trend + 20% Cạnh tranh + 30% Tương tác
              </span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-[11px] text-muted-foreground">
              💡 <strong>Mẹo:</strong> Ưu tiên chọn chủ đề có điểm tổng ≥60 để đảm bảo hiệu quả content.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
