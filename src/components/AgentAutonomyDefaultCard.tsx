import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Check, FileText, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOrganizationSettings, type DefaultAutonomyLevel } from '@/hooks/useOrganizationSettings';

interface Props {
  canEdit: boolean;
}

const OPTIONS: { value: DefaultAutonomyLevel; label: string; description: string; icon: typeof ShieldCheck }[] = [
  { value: 'human_in_loop', label: 'Duyệt từng bài', description: 'AI tạo từng bài, bạn duyệt mỗi bài trước khi đăng', icon: ShieldCheck },
  { value: 'human_on_loop', label: 'Duyệt kế hoạch', description: 'Duyệt toàn bộ plan, AI tự chạy theo kế hoạch đã duyệt', icon: FileText },
  { value: 'full_auto', label: 'Tự động hoàn toàn', description: 'AI tự lên kế hoạch, tạo và đăng bài tự động', icon: Sparkles },
];

export function AgentAutonomyDefaultCard({ canEdit }: Props) {
  const { defaultAutonomyLevel, loading, updating, updateDefaultAutonomyLevel } = useOrganizationSettings();

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Agent — Mức tự động mặc định
        </CardTitle>
        <CardDescription>
          Áp dụng cho mọi campaign mới do AI Agent tạo. Bạn vẫn có thể đổi riêng cho từng campaign khi cần.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {OPTIONS.map(opt => {
          const isSelected = defaultAutonomyLevel === opt.value;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.value}
              type="button"
              disabled={!canEdit || updating}
              onClick={() => updateDefaultAutonomyLevel(opt.value)}
              whileTap={canEdit ? { scale: 0.985 } : undefined}
              className={cn(
                'w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-primary/40 bg-primary/[0.04] shadow-sm shadow-primary/5 ring-1 ring-primary/20'
                  : 'border-border/60 bg-background hover:border-muted-foreground/20 hover:bg-muted/30',
                (!canEdit || updating) && 'opacity-70 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors duration-200',
                isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', isSelected && 'text-foreground')}>{opt.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.description}</p>
              </div>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
              )}>
                {updating && isSelected ? (
                  <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                ) : isSelected ? (
                  <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                ) : null}
              </div>
            </motion.button>
          );
        })}
        {!canEdit && (
          <p className="text-[11px] text-muted-foreground italic">Chỉ Chủ sở hữu / Quản trị viên mới có thể thay đổi cài đặt này.</p>
        )}
      </CardContent>
    </Card>
  );
}
