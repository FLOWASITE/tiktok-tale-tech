import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        AI đang kiểm tra brief...
      </div>
    );
  }

  if (understanding) {
    return (
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/15">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{understanding}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <MessageSquareMore className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium">AI cần xác nhận {questions.length} điểm</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onSkip} className="h-6 text-[10px] text-muted-foreground px-2">
          Bỏ qua, dùng mặc định
        </Button>
      </div>

      {questions.map((q, idx) => (
        <div key={idx} className="space-y-1.5">
          <Label className="text-[11px] font-medium leading-snug">{q.question}</Label>
          <div className="flex flex-wrap gap-1">
            {q.suggestions.map((s, si) => (
              <button
                key={si}
                onClick={() => selectAnswer(idx, s)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] border transition-all",
                  answers[idx] === s && !customInputs[idx]
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40 bg-background"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={customInputs[idx] || ''}
            onChange={e => setCustom(idx, e.target.value)}
            placeholder="Câu trả lời khác..."
            className="text-[11px] h-7"
          />
        </div>
      ))}

      <Button size="sm" onClick={handleSubmit} disabled={!allAnswered} className="text-xs w-full h-8">
        Xác nhận & Khởi chạy
      </Button>
    </div>
  );
}
