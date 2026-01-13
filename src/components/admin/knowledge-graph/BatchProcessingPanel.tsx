/**
 * BatchProcessingPanel - Dashboard for batch operations on Knowledge Graph
 * Parse queues, embedding pipelines, quality cleanup jobs
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  FileText,
  Sparkles,
  Database,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useReparseRegulations } from '@/hooks/useReparseRegulations';
import { useBatchEmbeddings } from '@/hooks/useBatchEmbeddings';

interface QueueStats {
  parse_pending: number;
  parse_failed: number;
  embed_missing: number;
  quality_low: number;
  total_regulations: number;
}

interface BatchJob {
  id: string;
  job_type: 'parse' | 'embed' | 'quality_cleanup' | 'full_crawl';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  failed_items: number;
  progress: number;
  current_item_name: string | null;
  error_log: unknown;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion: string | null;
  created_at: string;
}

interface QualityStats {
  quality_level: string;
  node_count: number;
  percentage: number;
}

const JOB_TYPE_CONFIG = {
  parse: { icon: FileText, label: 'Parse Documents', color: 'text-blue-500' },
  embed: { icon: Database, label: 'Generate Embeddings', color: 'text-purple-500' },
  quality_cleanup: { icon: Sparkles, label: 'AI Quality Cleanup', color: 'text-amber-500' },
  full_crawl: { icon: RefreshCw, label: 'Full Re-crawl', color: 'text-green-500' },
};

const STATUS_CONFIG = {
  pending: { label: 'Chờ', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  running: { label: 'Đang chạy', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  paused: { label: 'Tạm dừng', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  failed: { label: 'Thất bại', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export function BatchProcessingPanel() {
  const queryClient = useQueryClient();
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [batchSize, setBatchSize] = useState<number>(10);

  const { isReparsing, reparseNodes } = useReparseRegulations();
  const { 
    isProcessing: isEmbedding, 
    runFullBatch: runEmbeddingBatch,
    progress: embedProgress,
    status: embedStatus,
  } = useBatchEmbeddings();

  // Fetch queue statistics
  const { data: queueStats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['batch-queue-stats'],
    queryFn: async (): Promise<QueueStats> => {
      // Get parse status counts
      const { data: parseData, error: parseError } = await supabase
        .from('industry_knowledge_nodes')
        .select('parse_status, embedding', { count: 'exact' })
        .eq('node_type', 'regulation');
      
      if (parseError) throw parseError;

      const nodes = parseData || [];
      const parsePending = nodes.filter(n => n.parse_status === 'pending' || n.parse_status === null).length;
      const parseFailed = nodes.filter(n => n.parse_status === 'failed').length;
      const embedMissing = nodes.filter(n => !n.embedding).length;
      
      // Get quality score counts
      const { data: qualityData } = await supabase
        .from('industry_knowledge_nodes')
        .select('content_quality_score')
        .eq('node_type', 'regulation')
        .not('full_text', 'is', null);
      
      const qualityLow = (qualityData || []).filter(n => 
        n.content_quality_score !== null && n.content_quality_score < 70
      ).length;

      return {
        parse_pending: parsePending,
        parse_failed: parseFailed,
        embed_missing: embedMissing,
        quality_low: qualityLow,
        total_regulations: nodes.length,
      };
    },
    refetchInterval: 10000, // Refresh every 10s
  });

  // Fetch quality statistics
  const { data: qualityStats = [] } = useQuery({
    queryKey: ['content-quality-stats'],
    queryFn: async (): Promise<QualityStats[]> => {
      const { data, error } = await supabase.rpc('get_content_quality_stats');
      if (error) {
        console.error('Quality stats error:', error);
        return [];
      }
      return (data || []) as QualityStats[];
    },
  });

  // Fetch recent batch jobs
  const { data: recentJobs = [], isLoading: loadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['batch-jobs', selectedJobType],
    queryFn: async (): Promise<BatchJob[]> => {
      let query = supabase
        .from('batch_processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (selectedJobType !== 'all') {
        query = query.eq('job_type', selectedJobType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BatchJob[];
    },
  });

  // Start parse batch job
  const handleStartParseBatch = async () => {
    try {
      // Get pending nodes
      const { data: pendingNodes } = await supabase
        .from('industry_knowledge_nodes')
        .select('id')
        .eq('node_type', 'regulation')
        .or('parse_status.eq.pending,parse_status.is.null')
        .limit(batchSize);

      if (!pendingNodes || pendingNodes.length === 0) {
        toast.info('Không có văn bản nào cần parse');
        return;
      }

      const ids = pendingNodes.map(n => n.id);
      toast.info(`Bắt đầu parse ${ids.length} văn bản...`);
      
      await reparseNodes(ids);
      
      refetchStats();
      refetchJobs();
    } catch (error) {
      console.error('Parse batch error:', error);
      toast.error('Lỗi khi chạy batch parse');
    }
  };

  // Start embedding batch job
  const handleStartEmbedBatch = async () => {
    try {
      toast.info('Bắt đầu tạo embeddings...');
      await runEmbeddingBatch(batchSize);
      refetchStats();
      refetchJobs();
    } catch (error) {
      console.error('Embedding batch error:', error);
      toast.error('Lỗi khi chạy batch embeddings');
    }
  };

  // Calculate quality distribution for chart
  const qualityDistribution = useMemo(() => {
    const levels = ['excellent', 'good', 'acceptable', 'poor', 'unscored'];
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      acceptable: 'bg-amber-500',
      poor: 'bg-red-500',
      unscored: 'bg-gray-400',
    };
    
    return levels.map(level => {
      const stat = qualityStats.find(s => s.quality_level === level);
      return {
        level,
        count: stat?.node_count || 0,
        percentage: stat?.percentage || 0,
        color: colors[level as keyof typeof colors],
      };
    });
  }, [qualityStats]);

  const getQualityLabel = (level: string) => {
    const labels: Record<string, string> = {
      excellent: 'Xuất sắc (90+)',
      good: 'Tốt (70-89)',
      acceptable: 'Chấp nhận được (50-69)',
      poor: 'Kém (<50)',
      unscored: 'Chưa chấm điểm',
    };
    return labels[level] || level;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Batch Processing Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Quản lý parse, embeddings và quality cleanup hàng loạt
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { refetchStats(); refetchJobs(); }}
          disabled={loadingStats || loadingJobs}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${(loadingStats || loadingJobs) ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Parse Queue */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{queueStats?.parse_pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Parse Queue</p>
                </div>
              </div>
              {(queueStats?.parse_failed ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {queueStats?.parse_failed} failed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Embedding Queue */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{queueStats?.embed_missing || 0}</p>
                  <p className="text-xs text-muted-foreground">Missing Embeddings</p>
                </div>
              </div>
              {embedStatus?.nodes_with_embeddings && embedStatus.nodes_with_embeddings > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {embedStatus.nodes_with_embeddings} done
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Score */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{queueStats?.quality_low || 0}</p>
                  <p className="text-xs text-muted-foreground">Low Quality</p>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Nodes với quality score &lt; 70</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Total Regulations */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{queueStats?.total_regulations || 0}</p>
                <p className="text-xs text-muted-foreground">Total Regulations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
          <CardDescription>Khởi chạy batch job nhanh</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Batch size:</span>
              <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(parseInt(v))}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleStartParseBatch}
              disabled={isReparsing || !queueStats?.parse_pending}
            >
              {isReparsing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-1" />
              )}
              Parse ({queueStats?.parse_pending || 0})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEmbedBatch}
              disabled={isEmbedding || !queueStats?.embed_missing}
            >
              {isEmbedding ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-1" />
              )}
              Embed ({queueStats?.embed_missing || 0})
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={true} // Coming soon
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI Cleanup ({queueStats?.quality_low || 0})
              <Badge variant="secondary" className="ml-2 text-[10px]">Soon</Badge>
            </Button>
          </div>

          {/* Progress indicators */}
          {isReparsing && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Đang parse văn bản...</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          {isEmbedding && embedProgress && (
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-sm font-medium">Đang tạo embeddings...</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {embedProgress.processedNodes}/{embedProgress.totalNodes}
                </span>
              </div>
              <Progress value={Math.round((embedProgress.processedNodes / embedProgress.totalNodes) * 100)} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Content Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {qualityDistribution.map(({ level, count, percentage, color }) => (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{getQualityLabel(level)}</span>
                  <span className="font-medium">{count} ({percentage}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Jobs
            </CardTitle>
            <Select value={selectedJobType} onValueChange={setSelectedJobType}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="parse">Parse</SelectItem>
                <SelectItem value="embed">Embeddings</SelectItem>
                <SelectItem value="quality_cleanup">Quality Cleanup</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có job nào được chạy</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {recentJobs.map((job) => {
                  const config = JOB_TYPE_CONFIG[job.job_type];
                  const statusConfig = STATUS_CONFIG[job.status];
                  const Icon = config.icon;

                  return (
                    <div 
                      key={job.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${config.color} bg-opacity-10`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: vi })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                          {job.status === 'running' && (
                            <span className="text-xs font-mono">{job.progress}%</span>
                          )}
                        </div>
                      </div>

                      {job.status === 'running' && (
                        <div className="mt-2">
                          <Progress value={job.progress} className="h-1.5" />
                          {job.current_item_name && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {job.current_item_name}
                            </p>
                          )}
                        </div>
                      )}

                      {(job.status === 'completed' || job.status === 'failed') && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {job.processed_items} processed
                          </span>
                          {job.failed_items > 0 && (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />
                              {job.failed_items} failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
