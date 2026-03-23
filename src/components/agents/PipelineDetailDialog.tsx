import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Circle, AlertTriangle, Flag, Trash2, ArrowRight, Clock, Zap, DollarSign, Activity, Search, Trophy, Lightbulb, TrendingUp } from 'lucide-react';
import { AgentPipeline, AgentPipelineStage, PIPELINE_STAGES } from '@/types/agent';
import { useAgentPipelineLogs } from '@/hooks/useAgentPipelineLogs';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PipelineDetailDialogProps {
  pipeline: AgentPipeline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (id: string, stage: AgentPipelineStage) => void;
  onFlagToggle?: (id: string, flagged: boolean, reason?: string) => void;
  onDelete?: (id: string) => void;
}

const STAGE_ORDER = PIPELINE_STAGES.map(s => s.id);

function StageTimeline({ currentStage, pipelineState }: { currentStage: AgentPipelineStage; pipelineState: Record<string, any> }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map((stage, idx) => {
        const stageData = pipelineState?.stages?.[stage.id];
        const isCompleted = idx < currentIdx || stageData?.status === 'completed';
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;

        return (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                isCompleted && 'bg-primary border-primary text-primary-foreground',
                isCurrent && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30',
                isPending && 'border-border/40 bg-muted/30 text-muted-foreground/40',
              )}>
                {isCompleted ? <Check className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />}
              </div>
              <span className={cn(
                'text-[9px] mt-1 text-center leading-tight',
                isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground/60',
              )}>
                {stage.label}
              </span>
            </div>
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className={cn(
                'w-4 h-0.5 -mt-3',
                isCompleted ? 'bg-primary' : 'bg-border/30',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResearchOutputTab({ pipelineState }: { pipelineState: Record<string, any> }) {
  const researchData = pipelineState?.stages?.research;
  const output = researchData?.output;

  if (!researchData || researchData.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Search className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">Research chưa bắt đầu</p>
      </div>
    );
  }

  if (researchData.status === 'in_progress') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Search className="w-8 h-8 mb-2 animate-pulse" />
        <p className="text-xs">Đang nghiên cứu...</p>
      </div>
    );
  }

  const bestTopic = output?.best_topic || output?.bestTopic;
  const otherTopics = output?.other_topics || output?.otherTopics || [];
  const insights = output?.insights || output?.key_insights || [];
  const recommendations = output?.recommendations || [];
  const rawText = output?.raw_text || output?.rawText || output?.brief;

  return (
    <ScrollArea className="h-[280px]">
      <div className="space-y-3 pr-3">
        {/* Best Topic */}
        {bestTopic && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-primary">Topic được chọn</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {typeof bestTopic === 'string' ? bestTopic : bestTopic.name || bestTopic.title || bestTopic.topic}
              </p>
              {typeof bestTopic === 'object' && bestTopic.score != null && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-[9px]">Score: {bestTopic.score}</Badge>
                  {bestTopic.category && <Badge variant="outline" className="text-[9px]">{bestTopic.category}</Badge>}
                  {bestTopic.trending && <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">TRENDING</Badge>}
                </div>
              )}
              {typeof bestTopic === 'object' && bestTopic.reason && (
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{bestTopic.reason}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Other Topics */}
        {otherTopics.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Các topic khác
            </p>
            <div className="space-y-1">
              {otherTopics.map((topic: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 border border-border/20">
                  <span className="text-[10px] text-muted-foreground/60 w-4">{i + 1}.</span>
                  <span className="text-[11px] flex-1">
                    {typeof topic === 'string' ? topic : topic.name || topic.title || topic.topic}
                  </span>
                  {typeof topic === 'object' && topic.score != null && (
                    <Badge variant="outline" className="text-[9px] h-4">{topic.score}</Badge>
                  )}
                  {typeof topic === 'object' && topic.trending && (
                    <Badge className="text-[9px] h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">🔥</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Key Insights
            </p>
            <div className="space-y-1">
              {insights.map((insight: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-foreground/80">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">📊 Recommendations</p>
            <div className="space-y-1">
              {recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-foreground/80">
                  <span className="text-primary mt-0.5">→</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw text fallback */}
        {!bestTopic && !otherTopics.length && rawText && (
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
            <p className="text-[11px] whitespace-pre-wrap text-foreground/80 leading-relaxed">{rawText}</p>
          </div>
        )}

        {/* No output at all */}
        {!bestTopic && !otherTopics.length && !rawText && !insights.length && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs">Research hoàn thành nhưng không có output chi tiết</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export function PipelineDetailDialog({ pipeline, open, onOpenChange, onStageChange, onFlagToggle, onDelete }: PipelineDetailDialogProps) {
  const { logs, isLoading: logsLoading } = useAgentPipelineLogs(pipeline?.id || null);
  const [newStage, setNewStage] = useState<string>('');

  if (!pipeline) return null;

  const scores = pipeline.pipeline_state?.scores || {};
  const hasSeo = scores.seo_score != null;
  const hasGeo = scores.geo_score != null;
  const hasCompliance = scores.compliance_status != null;

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/10 text-red-600 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    normal: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    low: 'bg-muted text-muted-foreground border-border',
  };

  const autonomyLabels: Record<string, string> = {
    human_in_loop: 'Human-in-the-loop',
    human_on_loop: 'Human-on-the-loop',
    full_auto: 'Tự động hoàn toàn',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {pipeline.content_title}
            {pipeline.is_flagged && <AlertTriangle className="w-4 h-4 text-destructive" />}
          </DialogTitle>
          <DialogDescription className="sr-only">Chi tiết pipeline</DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className={cn('text-[10px]', priorityColors[pipeline.priority])}>
              {pipeline.priority}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {autonomyLabels[pipeline.autonomy_level] || pipeline.autonomy_level}
            </Badge>
            {pipeline.content_topic && (
              <span className="text-[11px] text-muted-foreground">{pipeline.content_topic}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
            <span>Tạo: {format(new Date(pipeline.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
            {pipeline.estimated_completion && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA: {formatDistanceToNow(new Date(pipeline.estimated_completion), { locale: vi, addSuffix: true })}
              </span>
            )}
            {pipeline.completed_at && (
              <span className="text-primary">✓ Hoàn thành: {format(new Date(pipeline.completed_at), 'dd/MM HH:mm')}</span>
            )}
          </div>
        </DialogHeader>

        {/* Stage Timeline */}
        <div className="py-2 border-y border-border/30">
          <StageTimeline currentStage={pipeline.current_stage} pipelineState={pipeline.pipeline_state} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="research" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="research" className="text-xs">Research</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs ({logs.length})</TabsTrigger>
            <TabsTrigger value="scores" className="text-xs">Scores</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="flex-1 overflow-hidden mt-2">
            <ResearchOutputTab pipelineState={pipeline.pipeline_state} />
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[280px]">
              {logsLoading ? (
                <p className="text-xs text-muted-foreground text-center py-8">Đang tải...</p>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Chưa có log nào</p>
              ) : (
                <div className="space-y-1.5 pr-3">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/20">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium">{log.agent_name}</span>
                          <Badge variant={log.error_message ? 'destructive' : 'secondary'} className="text-[9px] h-4 px-1.5">
                            {log.action}
                          </Badge>
                        </div>
                        {log.output_summary && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{log.output_summary}</p>
                        )}
                        {log.error_message && (
                          <p className="text-[10px] text-destructive mt-0.5">{log.error_message}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/60">
                          {log.duration_ms > 0 && (
                            <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{(log.duration_ms / 1000).toFixed(1)}s</span>
                          )}
                          {log.tokens_used > 0 && (
                            <span>{log.tokens_used.toLocaleString()} tokens</span>
                          )}
                          {log.cost_usd > 0 && (
                            <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />${log.cost_usd.toFixed(4)}</span>
                          )}
                          <span>{format(new Date(log.created_at), 'HH:mm:ss dd/MM')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="scores" className="mt-2">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[11px] font-medium">SEO Score</p>
                  {hasSeo ? (
                    <>
                      <p className="text-2xl font-bold text-primary">{scores.seo_score}</p>
                      <Progress value={scores.seo_score} className="h-1.5" />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Chưa có</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[11px] font-medium">GEO Score</p>
                  {hasGeo ? (
                    <>
                      <p className="text-2xl font-bold text-primary">{scores.geo_score}</p>
                      <Progress value={scores.geo_score} className="h-1.5" />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Chưa có</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 space-y-2">
                  <p className="text-[11px] font-medium">Compliance</p>
                  {hasCompliance ? (
                    <Badge variant={scores.compliance_status === 'pass' ? 'default' : 'destructive'} className="text-xs">
                      {scores.compliance_status}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Chưa có</p>
                  )}
                </CardContent>
              </Card>
            </div>
            {pipeline.is_flagged && pipeline.flag_reason && (
              <div className="mt-3 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-[11px] text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {pipeline.flag_reason}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-2 space-y-4">
            {/* Change Stage */}
            <div className="space-y-2">
              <p className="text-xs font-medium">Chuyển stage</p>
              <div className="flex gap-2">
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Chọn stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.filter(s => s.id !== pipeline.current_stage).map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!newStage}
                  onClick={() => {
                    if (newStage && onStageChange) {
                      onStageChange(pipeline.id, newStage as AgentPipelineStage);
                      setNewStage('');
                    }
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Flag toggle */}
            <div className="flex gap-2">
              <Button
                variant={pipeline.is_flagged ? 'default' : 'outline'}
                size="sm"
                className="text-xs flex-1"
                onClick={() => onFlagToggle?.(pipeline.id, !pipeline.is_flagged)}
              >
                <Flag className="w-3.5 h-3.5 mr-1.5" />
                {pipeline.is_flagged ? 'Bỏ flag' : 'Đánh flag'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (confirm('Xóa pipeline này?')) onDelete?.(pipeline.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Xóa
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
