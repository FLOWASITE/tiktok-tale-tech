import { motion } from 'framer-motion';
import { Award, TrendingUp, Palette, Shield, Sparkles, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReviewScores } from './types';
import { useConfetti } from '@/hooks/useConfetti';
import { useEffect, useRef } from 'react';

interface ReviewScoreCardProps {
  scores: ReviewScores;
  onRequestImprove?: () => void;
  className?: string;
}

const SCORE_ITEMS = [
  { key: 'relevance' as const, label: 'Relevance', icon: TrendingUp },
  { key: 'creativity' as const, label: 'Creativity', icon: Palette },
  { key: 'brandAlignment' as const, label: 'Brand Fit', icon: Shield },
  { key: 'platformFit' as const, label: 'Platform', icon: Sparkles },
];

function getGrade(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 90) return { label: 'Xuất sắc', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' };
  if (score >= 70) return { label: 'Tốt', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' };
  return { label: 'Cần cải thiện', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' };
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ReviewScoreCard({ scores, onRequestImprove, className }: ReviewScoreCardProps) {
  const { fireConfetti } = useConfetti();
  const confettiFired = useRef(false);
  const grade = getGrade(scores.overall);

  useEffect(() => {
    if (scores.approved && scores.overall >= 85 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => fireConfetti(), 300);
    }
  }, [scores.approved, scores.overall, fireConfetti]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3 space-y-2.5',
        grade.bgColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Award className={cn('w-3.5 h-3.5', grade.color)} />
          <span className="text-[11px] font-semibold">Review Score</span>
        </div>
        <div className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', grade.bgColor, grade.color)}>
          {scores.overall}/100 · {grade.label}
        </div>
      </div>

      {/* Score bars - 2x2 grid on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SCORE_ITEMS.map(({ key, label, icon: Icon }) => {
          const value = scores[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-1">
                <Icon className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] font-medium ml-auto">{value}</span>
              </div>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', getBarColor(value))}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback & improve button */}
      {scores.feedback && (
        <p className="text-[10px] text-muted-foreground italic">"{scores.feedback}"</p>
      )}
      
      {scores.overall < 70 && onRequestImprove && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 w-full"
          onClick={onRequestImprove}
        >
          <ArrowUp className="w-2.5 h-2.5" />
          Yêu cầu AI cải thiện
        </Button>
      )}
    </motion.div>
  );
}
