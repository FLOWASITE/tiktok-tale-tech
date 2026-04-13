// ============================================
// BrandContextCard Component
// Compact brand context summary display
// ============================================

import { forwardRef } from 'react';
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

export const BrandContextCard = forwardRef<HTMLDivElement, BrandContextCardProps>(
  function BrandContextCard({
    brandName,
    brandLogo,
    industry,
    pillars,
    recentTopicsCount,
    topCategory,
    className
  }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 rounded-2xl welcome-gradient-border relative overflow-hidden',
          'bg-muted/30',
          'shadow-sm',
          className
        )}
      >
        {/* Subtle background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-muted-foreground/10 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-muted-foreground/10 to-transparent rounded-full blur-2xl" />
        </div>
        
        <div className="relative flex items-start gap-3.5">
          {/* Brand Logo or Icon */}
          <div className="shrink-0">
            {brandLogo ? (
              <img 
                src={brandLogo} 
                alt={brandName}
                className="w-12 h-12 rounded-xl object-cover shadow-lg ring-2 ring-background"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Brand Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground truncate">
                {brandName}
              </h4>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
            </div>
            
            {/* Industry Tags */}
            {industry && industry.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {industry.slice(0, 2).map((ind, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-background/80 rounded-md text-muted-foreground shadow-sm border border-border/50"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            )}
            
            {/* Stats Row */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              {pillars && pillars.length > 0 && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  {pillars.length} pillars
                </span>
              )}
              {topCategory && (
                <span className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  Top: {topCategory}
                </span>
              )}
              {recentTopicsCount !== undefined && recentTopicsCount > 0 && (
                <span className="text-muted-foreground/60 font-medium">
                  {recentTopicsCount} topics gần đây
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Content Pillars Preview */}
        {pillars && pillars.length > 0 && (
          <div className="relative mt-3 pt-3 border-t border-border/30">
            <div className="flex flex-wrap gap-1.5">
              {pillars.slice(0, 4).map((pillar, i) => (
                <span 
                  key={i}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-semibold rounded-lg',
                    'bg-muted text-foreground border border-border',
                    'context-badge-shimmer'
                  )}
                >
                  {pillar.name}
                </span>
              ))}
              {pillars.length > 4 && (
                <span className="px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
                  +{pillars.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
