import React from 'react';
import { TopicAngle, TOPIC_ANGLE_LABELS } from '@/types/script';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Sparkles, GraduationCap, BrainCircuit, Zap, ShieldAlert, BarChart3, LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap, BrainCircuit, Zap, ShieldAlert, BarChart3,
};

interface TopicAnglePreviewProps {
  angle: TopicAngle;
  topic?: string;
}

const ANGLE_SAMPLE_SCRIPTS: Record<TopicAngle, { intro: string; body: string }> = {
  beginner: {
    intro: "Bạn mới bắt đầu? Đừng lo, mình sẽ giải thích từ A đến Z...",
    body: "Đầu tiên, hãy hiểu khái niệm cơ bản nhất. Đây là những gì bạn cần biết trước khi đi sâu hơn..."
  },
  expert: {
    intro: "Nếu bạn đã có kinh nghiệm, đây là insight chuyên sâu mà ít ai chia sẻ...",
    body: "Dựa trên dữ liệu từ 500+ case study, chiến lược này đạt hiệu quả cao nhất khi áp dụng đúng thời điểm..."
  },
  quick_tips: {
    intro: "3 tips cực nhanh mà bạn có thể áp dụng ngay hôm nay...",
    body: "Tip 1: Thay đổi nhỏ này tạo ra khác biệt lớn. Tip 2: Đây là cách làm hiệu quả nhất..."
  },
  myth_busting: {
    intro: "90% mọi người vẫn tin điều này, nhưng sự thật hoàn toàn khác...",
    body: "Điều mọi người thường nghĩ là đúng, thực ra lại gây hại. Đây là lý do tại sao..."
  },
  data_driven: {
    intro: "Theo nghiên cứu mới nhất từ 2024, con số này sẽ khiến bạn bất ngờ...",
    body: "73% doanh nghiệp áp dụng phương pháp này đã tăng trưởng 2x. Dữ liệu cho thấy..."
  }
};

export function TopicAnglePreview({ angle, topic }: TopicAnglePreviewProps) {
  const config = TOPIC_ANGLE_LABELS[angle];
  const sample = ANGLE_SAMPLE_SCRIPTS[angle];

  if (!config || !sample) return null;

  return (
    <Card className="mt-3 border-primary/20 bg-primary/5 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
            <Eye className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Preview: {config.icon} {config.label}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="p-2.5 rounded-md bg-background/80 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Hook mở đầu:</p>
            <p className="text-foreground italic">"{sample.intro}"</p>
          </div>
          
          <div className="p-2.5 rounded-md bg-background/80 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Nội dung chính:</p>
            <p className="text-foreground italic">"{sample.body}"</p>
          </div>
        </div>

        {topic && (
          <p className="mt-3 text-xs text-muted-foreground">
            Script của bạn về "{topic.slice(0, 50)}{topic.length > 50 ? '...' : ''}" sẽ theo phong cách này.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
