import React, { useState } from 'react';
import { 
  HelpCircle, ChevronDown, Brain, BarChart3, Sparkles, 
  CheckCircle2, Lightbulb, Search, Database, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TopicSystemExplainerProps {
  className?: string;
}

export function TopicSystemExplainer({ className }: TopicSystemExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: Search,
      title: 'Thu thập ngữ cảnh',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      items: [
        'Brand Voice & Positioning từ Brand Template',
        'Quy tắc ngành từ Industry Memory Pack',
        'Lịch sử topics đã perform tốt',
        'Content Pillars đã cấu hình',
      ],
    },
    {
      icon: Brain,
      title: 'AI phân tích',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      items: [
        'Chain-of-Thought: Suy nghĩ từng bước logic',
        'Few-Shot Learning: Học từ ví dụ tốt',
        'Self-Correction: Tự kiểm tra trước khi đề xuất',
      ],
    },
    {
      icon: BarChart3,
      title: 'Chấm điểm 4 tiêu chí',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      items: [
        'Brand Fit: Phù hợp định vị thương hiệu (0-100)',
        'Trend: Mức độ hot/trending hiện tại (0-100)',
        'Competition: Ít cạnh tranh = điểm cao (0-100)',
        'Engagement: Tiềm năng tương tác dự kiến (0-100)',
      ],
    },
  ];

  const tips = [
    { icon: Database, text: 'Thêm Brand Template để có gợi ý cá nhân hóa' },
    { icon: TrendingUp, text: 'Chọn Industry Pack để áp dụng quy tắc ngành' },
    { icon: Sparkles, text: 'Điểm ≥80 là xuất sắc, ≥60 là tốt' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground",
            isOpen && "bg-muted/50"
          )}
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hệ thống tạo chủ đề như thế nào?</span>
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="animate-accordion-down">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-2 space-y-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                {/* Step number and icon */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    step.bgColor
                  )}>
                    <step.icon className={cn("w-4 h-4", step.color)} />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-px h-full bg-border/50 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Bước {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  <ul className="space-y-1">
                    {step.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium">Mẹo cải thiện gợi ý</span>
            </div>
            <div className="grid gap-1.5">
              {tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5"
                >
                  <tip.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
