import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';

interface GEOIssue {
  severity: 'critical' | 'important' | 'improvement';
  factor: string;
  title: string;
  description: string;
  suggestion: string;
}

interface GEOIssuesListProps {
  issues: GEOIssue[];
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    label: 'Nghiêm trọng',
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
    badgeVariant: 'destructive' as const,
  },
  important: {
    icon: AlertTriangle,
    label: 'Quan trọng',
    className: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
    badgeVariant: 'outline' as const,
  },
  improvement: {
    icon: Lightbulb,
    label: 'Gợi ý',
    className: 'bg-primary/5 border-primary/20 text-primary',
    badgeVariant: 'secondary' as const,
  },
};

export function GEOIssuesList({ issues }: GEOIssuesListProps) {
  const sortedIssues = [...issues].sort((a, b) => {
    const order = { critical: 0, important: 1, improvement: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Issues ({issues.length})
      </p>
      {sortedIssues.map((issue, i) => {
        const config = severityConfig[issue.severity];
        const Icon = config.icon;
        return (
          <div key={i} className={`p-3 rounded-lg border ${config.className}`}>
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{issue.title}</span>
                  <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs mt-1 opacity-80">{issue.description}</p>
                {issue.suggestion && (
                  <p className="text-xs mt-1.5 font-medium">💡 {issue.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
