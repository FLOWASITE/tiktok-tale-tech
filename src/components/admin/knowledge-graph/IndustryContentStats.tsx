/**
 * IndustryContentStats - Stats cards for Industry Pack knowledge content
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  BookOpen, 
  Lightbulb, 
  Users, 
  Factory, 
  Globe,
  Database,
  Sparkles
} from "lucide-react";
import type { KnowledgeStats, IndustryPackInfo } from "@/hooks/useIndustryPackKnowledge";
import { cn } from "@/lib/utils";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";

interface IndustryContentStatsProps {
  packInfo: IndustryPackInfo;
  stats: KnowledgeStats;
  activeFilter: KnowledgeNodeType | null;
  onFilterChange: (type: KnowledgeNodeType | null) => void;
}

const STAT_CARDS: {
  key: keyof KnowledgeStats;
  nodeType: KnowledgeNodeType | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}[] = [
  { 
    key: 'regulations', 
    nodeType: 'regulation',
    label: 'Quy định', 
    icon: FileText, 
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30'
  },
  { 
    key: 'terms', 
    nodeType: 'term',
    label: 'Thuật ngữ', 
    icon: BookOpen, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  { 
    key: 'concepts', 
    nodeType: 'concept',
    label: 'Khái niệm', 
    icon: Lightbulb, 
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30'
  },
  { 
    key: 'personas', 
    nodeType: 'persona',
    label: 'Persona', 
    icon: Users, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30'
  },
  { 
    key: 'industries', 
    nodeType: 'industry',
    label: 'Ngành con', 
    icon: Factory, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30'
  },
  { 
    key: 'jurisdictions', 
    nodeType: 'jurisdiction',
    label: 'Khu vực', 
    icon: Globe, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
];

export function IndustryContentStats({ 
  packInfo, 
  stats, 
  activeFilter, 
  onFilterChange 
}: IndustryContentStatsProps) {
  const embeddingPercent = stats.total > 0 
    ? Math.round((stats.withEmbedding / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Pack Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{packInfo.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {packInfo.industryCode}
              </code>
              <Badge variant="secondary" className="text-[10px]">
                v{packInfo.version}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {packInfo.targetAudience}
              </Badge>
            </div>
          </div>
        </div>

        {/* Total & Embedding Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-lg">{stats.total}</span>
            </div>
            <span className="text-xs text-muted-foreground">Tổng nodes</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-lg">{embeddingPercent}%</span>
            </div>
            <span className="text-xs text-muted-foreground">Có embedding</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, nodeType, label, icon: Icon, color, bgColor }) => {
          const count = stats[key] as number;
          const isActive = activeFilter === nodeType;
          
          return (
            <Card 
              key={key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => onFilterChange(isActive ? null : nodeType)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", bgColor)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Đang lọc:</span>
          <Badge variant="secondary" className="gap-1">
            {STAT_CARDS.find(s => s.nodeType === activeFilter)?.label}
            <button 
              onClick={() => onFilterChange(null)}
              className="ml-1 hover:text-foreground"
            >
              ×
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}
