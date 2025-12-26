import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, CheckCircle2, FileText, Send, 
  ArrowRight, TrendingUp, ChevronRight,
  Sparkles, Play, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { cn } from '@/lib/utils';

interface ContentPipelineViewProps {
  brandTemplateId?: string;
  contentGoal?: string;
}

interface PipelineColumn {
  id: string;
  title: string;
  icon: typeof Lightbulb;
  color: string;
  bgColor: string;
  items: PipelineItem[];
}

interface PipelineItem {
  id: string;
  topic: string;
  pillar?: string;
  status: string;
  contentType?: string;
  contentTitle?: string;
  createdAt?: string;
}

export function ContentPipelineView({ brandTemplateId, contentGoal }: ContentPipelineViewProps) {
  const navigate = useNavigate();
  
  const { history, drafts, isLoading } = useTopicHistory({
    brandTemplateId,
    contentGoal: contentGoal as any,
    enabled: true,
  });

  const { links: contentLinks } = useTopicContentLinks({ enabled: true });

  // Organize topics into pipeline columns
  const columns: PipelineColumn[] = useMemo(() => {
    // Suggestions/Drafts
    const suggestionsItems: PipelineItem[] = drafts.map((d) => ({
      id: d.id,
      topic: d.topic,
      pillar: d.pillar || undefined,
      status: 'draft',
      createdAt: d.createdAt,
    }));

    // Selected (suggested status, not yet used)
    const selectedItems: PipelineItem[] = history
      .filter((h) => h.usageStatus === 'suggested' && !h.wasUsed)
      .map((h) => ({
        id: h.id,
        topic: h.topic,
        pillar: h.pillar || undefined,
        status: 'selected',
        createdAt: h.createdAt,
      }));

    // Created (used but not published)
    const createdItems: PipelineItem[] = history
      .filter((h) => h.wasUsed && h.usageStatus !== 'published')
      .map((h) => {
        const link = contentLinks.find((l) => l.topicHistoryId === h.id);
        return {
          id: h.id,
          topic: h.topic,
          pillar: h.pillar || undefined,
          status: 'created',
          contentType: link?.contentType,
          contentTitle: link?.contentTitle || undefined,
          createdAt: h.usedAt || h.createdAt,
        };
      });

    // Published
    const publishedItems: PipelineItem[] = history
      .filter((h) => h.usageStatus === 'published')
      .map((h) => {
        const link = contentLinks.find((l) => l.topicHistoryId === h.id);
        return {
          id: h.id,
          topic: h.topic,
          pillar: h.pillar || undefined,
          status: 'published',
          contentType: link?.contentType,
          contentTitle: link?.contentTitle || undefined,
          createdAt: h.publishedAt || h.createdAt,
        };
      });

    return [
      {
        id: 'suggestions',
        title: 'Gợi ý',
        icon: Lightbulb,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        items: suggestionsItems.slice(0, 10),
      },
      {
        id: 'selected',
        title: 'Đã chọn',
        icon: CheckCircle2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        items: selectedItems.slice(0, 10),
      },
      {
        id: 'created',
        title: 'Đã tạo',
        icon: FileText,
        color: 'text-violet-500',
        bgColor: 'bg-violet-500/10',
        items: createdItems.slice(0, 10),
      },
      {
        id: 'published',
        title: 'Đã xuất bản',
        icon: Send,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        items: publishedItems.slice(0, 10),
      },
    ];
  }, [drafts, history, contentLinks]);

  // Pipeline stats
  const stats = useMemo(() => {
    const total = columns.reduce((sum, col) => sum + col.items.length, 0);
    const suggestions = columns[0].items.length;
    const selected = columns[1].items.length;
    const created = columns[2].items.length;
    const published = columns[3].items.length;

    const selectionRate = suggestions > 0 ? Math.round((selected / suggestions) * 100) : 0;
    const creationRate = selected > 0 ? Math.round((created / selected) * 100) : 0;
    const publishRate = created > 0 ? Math.round((published / created) * 100) : 0;

    return { total, suggestions, selected, created, published, selectionRate, creationRate, publishRate };
  }, [columns]);

  const handleSelectTopic = (item: PipelineItem) => {
    navigate('/multichannel', {
      state: {
        prefillTopic: item.topic,
        prefillGoal: contentGoal,
        topicHistoryId: item.id,
        fromTopics: true,
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Đang tải pipeline...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Stats Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Content Pipeline</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.total} topics trong hệ thống
                </p>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <p className="font-bold text-amber-500">{stats.suggestions}</p>
                <p className="text-[10px] text-muted-foreground">Gợi ý</p>
              </div>
              <div className="flex flex-col items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stats.selectionRate}%</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-blue-500">{stats.selected}</p>
                <p className="text-[10px] text-muted-foreground">Đã chọn</p>
              </div>
              <div className="flex flex-col items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stats.creationRate}%</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-violet-500">{stats.created}</p>
                <p className="text-[10px] text-muted-foreground">Đã tạo</p>
              </div>
              <div className="flex flex-col items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stats.publishRate}%</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-500">{stats.published}</p>
                <p className="text-[10px] text-muted-foreground">Đã xuất bản</p>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Tiến độ tổng thể</span>
              <span>{stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}% đã xuất bản</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div className="bg-amber-500" style={{ width: `${stats.total > 0 ? (stats.suggestions / stats.total) * 100 : 0}%` }} />
              <div className="bg-blue-500" style={{ width: `${stats.total > 0 ? (stats.selected / stats.total) * 100 : 0}%` }} />
              <div className="bg-violet-500" style={{ width: `${stats.total > 0 ? (stats.created / stats.total) * 100 : 0}%` }} />
              <div className="bg-emerald-500" style={{ width: `${stats.total > 0 ? (stats.published / stats.total) * 100 : 0}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Columns */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {columns.map((column) => {
            const Icon = column.icon;
            return (
              <div key={column.id} className="w-[280px] shrink-0">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-lg', column.bgColor)}>
                          <Icon className={cn('w-4 h-4', column.color)} />
                        </div>
                        {column.title}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {column.items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {column.items.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        Chưa có topic
                      </div>
                    ) : (
                      column.items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-2 rounded-lg border border-border/50 bg-muted/30',
                            'hover:bg-muted/50 hover:border-border transition-colors',
                            'cursor-pointer group'
                          )}
                          onClick={() => handleSelectTopic(item)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium line-clamp-2 flex-1">
                              {item.topic}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectTopic(item);
                                    }}
                                  >
                                    <Play className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Sử dụng topic</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          {item.pillar && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 mt-1">
                              {item.pillar}
                            </Badge>
                          )}

                          {item.contentType && (
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              <span className="capitalize">{item.contentType}</span>
                              {item.contentTitle && (
                                <span className="truncate max-w-[120px]">• {item.contentTitle}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {column.items.length >= 10 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        Xem thêm...
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
