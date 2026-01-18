import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Network, BookOpen, Database, Globe } from 'lucide-react';

export type FunctionTag = 'knowledge-graph' | 'regulation' | 'embedding' | 'crawl';

const TAG_CONFIG: Record<FunctionTag, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  'knowledge-graph': { 
    label: 'Knowledge Graph', 
    icon: Network, 
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/30 dark:text-violet-400' 
  },
  'regulation': { 
    label: 'Quy định', 
    icon: BookOpen, 
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' 
  },
  'embedding': { 
    label: 'Embedding', 
    icon: Database, 
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/30 dark:text-sky-400' 
  },
  'crawl': { 
    label: 'Crawl', 
    icon: Globe, 
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400' 
  },
};

interface FunctionTagBadgesProps {
  tags?: FunctionTag[];
  compact?: boolean;
}

export function FunctionTagBadges({ tags, compact = false }: FunctionTagBadgesProps) {
  if (!tags?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => {
        const config = TAG_CONFIG[tag];
        if (!config) return null;
        const Icon = config.icon;
        
        if (compact) {
          // Show only icon for compact mode
          return (
            <Badge 
              key={tag} 
              variant="outline" 
              className={cn("p-0.5", config.className)}
              title={config.label}
            >
              <Icon className="h-2.5 w-2.5" />
            </Badge>
          );
        }
        
        return (
          <Badge 
            key={tag} 
            variant="outline" 
            className={cn("text-[9px] py-0 px-1.5 gap-0.5", config.className)}
          >
            <Icon className="h-2.5 w-2.5" />
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}

// Helper to check if a function has knowledge graph tag
export function hasKnowledgeGraphTag(tags?: FunctionTag[]): boolean {
  return tags?.includes('knowledge-graph') ?? false;
}

// Count functions by tag
export function countByTag(functions: { tags?: FunctionTag[] }[], tag: FunctionTag): number {
  return functions.filter(f => f.tags?.includes(tag)).length;
}
