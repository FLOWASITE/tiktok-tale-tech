import { useState } from 'react';
import { 
  Layers, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  Hash, TrendingUp, ArrowRight, Folder, FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTopicIntelligence, TopicCluster } from '@/hooks/useTopicIntelligence';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface TopicClusterViewProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string) => void;
}

const clusterColors = [
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500',
];

export function TopicClusterView({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: TopicClusterViewProps) {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  
  const { 
    clusters: clusterData, 
    analyzeClusters, 
    isLoading 
  } = useTopicIntelligence({ brandTemplateId, contentGoal });

  const toggleClusterExpanded = (clusterId: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    await analyzeClusters();
  };

  const getColorByIndex = (index: number) => clusterColors[index % clusterColors.length];

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Topic Clustering</CardTitle>
              <CardDescription className="text-xs">
                Nhóm topics theo nội dung tương tự
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {clusterData ? 'Phân cụm lại' : 'Phân cụm'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !clusterData ? (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Phân cụm topics theo semantic similarity
            </p>
            <p className="text-xs text-muted-foreground">
              AI sẽ nhóm các topics có nội dung tương tự
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{clusterData.clusters.length}</p>
                <p className="text-xs text-muted-foreground">Clusters</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">
                  {clusterData.clusters.reduce((sum, c) => sum + c.topics.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Topics nhóm</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {clusterData.unclustered?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Chưa nhóm</p>
              </div>
            </div>

            {/* Summary */}
            {clusterData.summary && (
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                {clusterData.summary}
              </p>
            )}

            {/* Clusters */}
            <div className="space-y-3">
              {clusterData.clusters.map((cluster, index) => {
                const isExpanded = expandedClusters.has(cluster.clusterId);
                const colorGradient = getColorByIndex(index);

                return (
                  <Collapsible 
                    key={cluster.clusterId} 
                    open={isExpanded}
                    onOpenChange={() => toggleClusterExpanded(cluster.clusterId)}
                  >
                    <div 
                      className={cn(
                        'rounded-lg border border-border/50 overflow-hidden transition-all',
                        isExpanded && 'ring-1 ring-primary/20'
                      )}
                    >
                      {/* Gradient accent */}
                      <div className={cn('h-1 bg-gradient-to-r', colorGradient)} />
                      
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          {isExpanded ? (
                            <FolderOpen className="w-5 h-5 text-primary" />
                          ) : (
                            <Folder className="w-5 h-5 text-muted-foreground" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{cluster.clusterName}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {cluster.topics.length} topics
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {cluster.topKeywords.slice(0, 3).map((kw, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                  <Hash className="w-2.5 h-2.5 mr-0.5" />
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {cluster.avgPerformance > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{cluster.avgPerformance}</span>
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50">
                          {cluster.topics.map((topic, i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-2 p-2 rounded-md bg-background/50 hover:bg-background transition-colors group cursor-pointer mt-2"
                              onClick={() => onSelectTopic(topic)}
                            >
                              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                {i + 1}
                              </span>
                              <span className="flex-1 text-sm truncate">{topic}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>

            {/* Unclustered */}
            {clusterData.unclustered && clusterData.unclustered.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5" />
                  Topics chưa nhóm ({clusterData.unclustered.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {clusterData.unclustered.slice(0, 5).map((topic, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="text-xs cursor-pointer hover:bg-muted"
                      onClick={() => onSelectTopic(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                  {clusterData.unclustered.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{clusterData.unclustered.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
