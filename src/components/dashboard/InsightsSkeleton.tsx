import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function InsightsSkeleton() {
  return (
    <Card className="relative overflow-hidden gradient-card border-border/50">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              AI Insights
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Content shimmer */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-muted/50 animate-pulse">
            <div className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/50 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-full" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-4/5" />
          </div>
        </div>

        {/* Action shimmer */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 bg-muted/40 rounded animate-pulse" />
          <div className="h-6 w-16 bg-muted/20 rounded animate-pulse" />
        </div>
      </CardContent>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
    </Card>
  );
}
