import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, MessageSquareMore } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClarificationQuestion {
  question: string;
  why: string;
  suggestions: string[];
}

interface ClarificationStepProps {
  questions: ClarificationQuestion[];
  understanding?: string;
  onSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function ClarificationStep({ questions, understanding, onSubmit, onSkip, isLoading }: ClarificationStepProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});

  const selectAnswer = (idx: number, value: string) => {
    setAnswers(prev => ({ ...prev, [idx]: value }));
    setCustomInputs(prev => ({ ...prev, [idx]: '' }));
  };

  const setCustom = (idx: number, value: string) => {
    setCustomInputs(prev => ({ ...prev, [idx]: value }));
    setAnswers(prev => ({ ...prev, [idx]: value }));
  };

  const allAnswered = questions.every((_, i) => answers[i]?.trim());

  const handleSubmit = () => {
    const result: Record<string, string> = {};
    questions.forEach((q, i) => {
      result[q.question] = answers[i] || '';
    });
    onSubmit(result);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI đang phân tích campaign...</p>
      </div>
    );
  }

  if (understanding) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">AI đã hiểu mục tiêu</p>
            <p className="text-xs text-muted-foreground mt-1">{understanding}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <MessageSquareMore className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">AI cần thêm thông tin</span> để tạo nội dung chất lượng cao hơn.
        </p>
      </div>

      {questions.map((q, idx) => (
        <div key={idx} className="space-y-2">
          <Label className="text-xs font-medium">{q.question}</Label>
          <p className="text-[10px] text-muted-foreground italic">{q.why}</p>
          <div className="flex flex-wrap gap-1.5">
            {q.suggestions.map((s, si) => (
              <button
                key={si}
                onClick={() => selectAnswer(idx, s)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs border transition-all",
                  answers[idx] === s && !customInputs[idx]
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={customInputs[idx] || ''}
            onChange={e => setCustom(idx, e.target.value)}
            placeholder="Hoặc nhập câu trả lời khác..."
            className="text-xs h-8"
          />
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={handleSubmit} disabled={!allAnswered} className="text-xs flex-1">
          Xác nhận & Bắt đầu
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} className="text-xs text-muted-foreground">
          Bỏ qua
        </Button>
      </div>
    </div>
  );
}
