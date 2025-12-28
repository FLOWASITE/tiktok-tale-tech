import { useState } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Book, Link2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GLOSSARY_CATEGORIES } from '@/types/industryGlossary';
import type { IndustryGlossaryTermWithTranslation } from '@/types/industryGlossary';

interface GlossaryTermTooltipProps {
  term: IndustryGlossaryTermWithTranslation;
  children: React.ReactNode;
  className?: string;
}

export function GlossaryTermTooltip({
  term,
  children,
  className,
}: GlossaryTermTooltipProps) {
  const categoryInfo = GLOSSARY_CATEGORIES.find(c => c.value === term.category);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'cursor-help border-b border-dashed border-blue-400/50 hover:border-blue-500',
            className
          )}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{term.term}</span>
              {term.abbreviation && (
                <Badge variant="outline" className="text-xs">
                  {term.abbreviation}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {categoryInfo?.icon} {categoryInfo?.label}
            </Badge>
          </div>

          {/* Definition */}
          <p className="text-sm text-muted-foreground">{term.definition}</p>

          {/* Example usage */}
          {term.example_usage && (
            <div className="bg-muted/50 rounded-md p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <Lightbulb className="h-3 w-3" />
                Ví dụ
              </div>
              <p className="text-xs italic">{term.example_usage}</p>
            </div>
          )}

          {/* Related terms */}
          {term.related_terms && term.related_terms.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Link2 className="h-3 w-3" />
                Thuật ngữ liên quan
              </div>
              <div className="flex flex-wrap gap-1">
                {term.related_terms.map((rt, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {rt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {term.notes && (
            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              {term.notes}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
