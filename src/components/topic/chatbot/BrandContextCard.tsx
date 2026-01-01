// ============================================
// BrandContextCard Component
// Compact brand context summary display
// ============================================

import { Building2, Layers, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandContextCardProps {
  brandName: string;
  brandLogo?: string;
  industry?: string[];
  pillars?: { name: string }[];
  recentTopicsCount?: number;
  topCategory?: string;
  className?: string;
}

export function BrandContextCard({
  brandName,
  brandLogo,
  industry,
  pillars,
  recentTopicsCount,
  topCategory,
  className
}: BrandContextCardProps) {
  return (
    <div className={cn(
      'p-3 rounded-xl bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5',
      'border border-primary/10 shadow-sm',
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Brand Logo or Icon */}
        <div className="shrink-0">
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={brandName}
              className="w-10 h-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
        
        {/* Brand Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {brandName}
            </h4>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          </div>
          
          {/* Industry Tags */}
          {industry && industry.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {industry.slice(0, 2).map((ind, i) => (
                <span 
                  key={i}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded text-muted-foreground"
                >
                  {ind}
                </span>
              ))}
            </div>
          )}
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {pillars && pillars.length > 0 && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {pillars.length} pillars
              </span>
            )}
            {topCategory && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Top: {topCategory}
              </span>
            )}
            {recentTopicsCount !== undefined && recentTopicsCount > 0 && (
              <span className="text-muted-foreground/70">
                {recentTopicsCount} topics gần đây
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content Pillars Preview */}
      {pillars && pillars.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex flex-wrap gap-1">
            {pillars.slice(0, 4).map((pillar, i) => (
              <span 
                key={i}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-medium rounded-full',
                  'bg-primary/5 text-primary/80 border border-primary/10'
                )}
              >
                {pillar.name}
              </span>
            ))}
            {pillars.length > 4 && (
              <span className="px-2 py-0.5 text-[10px] text-muted-foreground">
                +{pillars.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
