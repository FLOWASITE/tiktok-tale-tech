import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Network, Link2, Brain, AlertTriangle } from "lucide-react";
import { useGraphStatistics } from "@/hooks/useGraphVisualization";

export function ExplorerStatsBar() {
  const { data: stats, isLoading } = useGraphStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-24" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const embeddingPercent = stats.embeddingCoverage || 0;

  const items = [
    { 
      icon: Network, 
      label: "nodes", 
      value: stats.totalNodes,
      color: "text-blue-500"
    },
    { 
      icon: Link2, 
      label: "edges", 
      value: stats.totalEdges,
      color: "text-green-500"
    },
    { 
      icon: Brain, 
      label: "embeddings", 
      value: `${Math.round(embeddingPercent)}%`,
      color: embeddingPercent >= 80 ? "text-emerald-500" : "text-amber-500"
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Badge 
            key={item.label} 
            variant="secondary" 
            className="gap-1.5 font-normal"
          >
            <Icon className={`h-3 w-3 ${item.color}`} />
            <span className="font-medium">{item.value}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
