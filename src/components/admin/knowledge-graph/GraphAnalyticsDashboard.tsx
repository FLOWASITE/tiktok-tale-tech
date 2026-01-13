// ============================================
// Graph Analytics Dashboard
// Statistics, coverage metrics, and health checks
// ============================================

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Database,
  Network,
  Zap,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
  ArrowRight,
  Sparkles,
  Unlink,
  Clock,
  Activity,
} from "lucide-react";
import { useGraphStatistics } from "@/hooks/useGraphVisualization";
import { useGraphHealthSummary, useOrphanNodes, useQueryAnalytics } from "@/hooks/useGraphHealth";
import type { KnowledgeNodeType } from "@/types/knowledgeGraph";

// ============================================
// Constants
// ============================================

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  label: string;
}> = {
  industry: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-500", label: "Industries" },
  regulation: { icon: Scale, color: "text-red-600", bgColor: "bg-red-500", label: "Regulations" },
  term: { icon: FileText, color: "text-green-600", bgColor: "bg-green-500", label: "Terms" },
  concept: { icon: Lightbulb, color: "text-purple-600", bgColor: "bg-purple-500", label: "Concepts" },
  persona: { icon: Users, color: "text-amber-600", bgColor: "bg-amber-500", label: "Personas" },
  jurisdiction: { icon: Globe, color: "text-indigo-600", bgColor: "bg-indigo-500", label: "Jurisdictions" },
};

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
  color?: string;
}

function StatCard({ title, value, icon: Icon, description, trend, color = "text-primary" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 ${!trend.positive && 'rotate-180'}`} />
            <span>{trend.positive ? '+' : ''}{trend.value}% from last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Node Distribution Chart
// ============================================

interface NodeDistributionProps {
  nodesByType: Record<KnowledgeNodeType, number>;
  totalNodes: number;
}

function NodeDistribution({ nodesByType, totalNodes }: NodeDistributionProps) {
  const sortedTypes = Object.entries(nodesByType)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-4 w-4" />
          Node Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTypes.map(([type, count]) => {
          const config = NODE_TYPE_CONFIG[type as KnowledgeNodeType];
          const percentage = totalNodes > 0 ? (count / totalNodes) * 100 : 0;
          const Icon = config.icon;
          
          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span>{config.label}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {count.toLocaleString()} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bgColor} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {sortedTypes.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No nodes in the graph yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Edge Distribution Chart
// ============================================

interface EdgeDistributionProps {
  edgesByType: Record<string, number>;
  totalEdges: number;
}

function EdgeDistribution({ edgesByType, totalEdges }: EdgeDistributionProps) {
  const sortedTypes = Object.entries(edgesByType)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0);

  const edgeColors: Record<string, string> = {
    related_to: "bg-slate-500",
    parent_of: "bg-blue-500",
    regulated_by: "bg-red-500",
    uses_term: "bg-green-500",
    shares_audience: "bg-amber-500",
    competes_with: "bg-pink-500",
    requires_compliance: "bg-red-600",
    derived_from: "bg-purple-500",
    applies_to: "bg-indigo-500",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4" />
          Edge Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTypes.map(([type, count]) => {
          const percentage = totalEdges > 0 ? (count / totalEdges) * 100 : 0;
          const displayName = type.replace(/_/g, ' ');
          
          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{displayName}</span>
                <span className="font-medium tabular-nums">
                  {count.toLocaleString()} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${edgeColors[type] || 'bg-slate-400'} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {sortedTypes.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No edges in the graph yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Health Summary Panel (using RPC)
// ============================================

function HealthSummaryPanel() {
  const { data: health, isLoading, refetch, isRefetching } = useGraphHealthSummary();
  
  if (isLoading) {
    return <Skeleton className="h-64" />;
  }
  
  const metrics = health || [];
  const passCount = metrics.filter(m => m.status === 'pass').length;
  const totalChecks = metrics.filter(m => m.status !== 'info').length;
  
  const getIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-600 shrink-0" />;
      default: return <Activity className="h-5 w-5 text-blue-600 shrink-0" />;
    }
  };
  
  const formatMetric = (name: string, value: number) => {
    if (name.includes('percentage') || name.includes('coverage')) {
      return `${value}%`;
    }
    return value.toLocaleString();
  };
  
  const getMetricLabel = (name: string) => {
    const labels: Record<string, string> = {
      total_nodes: 'Total Nodes',
      total_edges: 'Total Edges',
      embedding_coverage: 'Embedding Coverage',
      orphan_nodes: 'Orphan Nodes',
      orphan_percentage: 'Orphan Percentage',
      avg_connectivity: 'Avg Connectivity',
    };
    return labels[name] || name.replace(/_/g, ' ');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Health Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={passCount === totalChecks ? "default" : passCount >= totalChecks / 2 ? "secondary" : "destructive"}>
              {passCount}/{totalChecks} passed
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3 w-3 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {metrics.map((metric) => (
          <div key={metric.metric_name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            {getIcon(metric.status)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{getMetricLabel(metric.metric_name)}</p>
            </div>
            <span className="font-mono text-sm tabular-nums">
              {formatMetric(metric.metric_name, metric.metric_value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Orphan Nodes Panel
// ============================================

function OrphanNodesPanel({ onNavigateToNode }: { onNavigateToNode?: (nodeId: string) => void }) {
  const { data: orphans, isLoading } = useOrphanNodes(20);
  
  if (isLoading) {
    return <Skeleton className="h-48" />;
  }
  
  const orphanList = orphans || [];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Unlink className="h-4 w-4" />
          Orphan Nodes
          {orphanList.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{orphanList.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>Nodes without any connections</CardDescription>
      </CardHeader>
      <CardContent>
        {orphanList.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
            No orphan nodes found!
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {orphanList.map((node) => {
                const config = NODE_TYPE_CONFIG[node.node_type as KnowledgeNodeType];
                const Icon = config?.icon || FileText;
                const displayName = node.display_name?.vi || node.display_name?.en || node.node_key;
                
                return (
                  <div
                    key={node.node_id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onNavigateToNode?.(node.node_id)}
                  >
                    <Icon className={`h-4 w-4 ${config?.color || 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{node.node_type}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Query Performance Panel
// ============================================

function QueryPerformancePanel() {
  const { data: analytics, isLoading } = useQueryAnalytics(7);
  
  if (isLoading) {
    return <Skeleton className="h-48" />;
  }
  
  const stats = analytics || { totalQueries: 0, avgDuration: 0, slowQueries: 0, queryTypeBreakdown: {} };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Query Performance (7 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalQueries}</p>
            <p className="text-xs text-muted-foreground">Total Queries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.avgDuration}ms</p>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${stats.slowQueries > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {stats.slowQueries}
            </p>
            <p className="text-xs text-muted-foreground">Slow ({'>'}1s)</p>
          </div>
        </div>
        
        {Object.keys(stats.queryTypeBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">By Query Type</p>
            {Object.entries(stats.queryTypeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{type}</span>
                  <span className="font-mono tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        )}
        
        {stats.totalQueries === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No queries recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function GraphAnalyticsDashboard() {
  const { data: stats, isLoading, refetch, isRefetching } = useGraphStatistics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const {
    totalNodes = 0,
    totalEdges = 0,
    nodesByType = {} as Record<KnowledgeNodeType, number>,
    edgesByType = {},
    embeddingCoverage = 0,
    withEmbeddings = 0,
  } = stats || {};

  // Check if action is needed
  const needsEmbeddings = embeddingCoverage < 10;
  const needsExtraction = (nodesByType.regulation || 0) === 0 && (nodesByType.term || 0) === 0;

  return (
    <div className="space-y-6">
      {/* Action Required Alerts */}
      {(needsEmbeddings || needsExtraction) && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Cần thực hiện các bước cài đặt</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm text-amber-600">
              Knowledge Graph cần được khởi tạo dữ liệu để các tính năng hoạt động đầy đủ:
            </p>
            <div className="flex flex-wrap gap-2">
              {needsEmbeddings && (
                <div className="flex items-center gap-2 text-sm bg-background/80 px-3 py-1.5 rounded-md border">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Vào tab <strong>Embeddings</strong></span>
                  <ArrowRight className="h-3 w-3" />
                  <span>Click "Chạy Tất Cả"</span>
                </div>
              )}
              {needsExtraction && (
                <div className="flex items-center gap-2 text-sm bg-background/80 px-3 py-1.5 rounded-md border">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Vào tab <strong>Extract</strong></span>
                  <ArrowRight className="h-3 w-3" />
                  <span>Click "Chạy Tất Cả"</span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Graph Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview and health status of the Knowledge Graph
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Nodes"
          value={totalNodes}
          icon={Database}
          description="Active nodes in graph"
        />
        <StatCard
          title="Total Edges"
          value={totalEdges}
          icon={Network}
          description="Connections between nodes"
        />
        <StatCard
          title="With Embeddings"
          value={withEmbeddings}
          icon={Zap}
          description={`${embeddingCoverage.toFixed(1)}% coverage`}
          color={embeddingCoverage >= 80 ? "text-green-600" : "text-amber-600"}
        />
        <StatCard
          title="Avg Connectivity"
          value={(totalEdges / Math.max(totalNodes, 1)).toFixed(2)}
          icon={TrendingUp}
          description="Edges per node"
        />
      </div>

      {/* Embedding Coverage Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Embedding Coverage</span>
            <span className="text-sm text-muted-foreground">
              {withEmbeddings} / {totalNodes} nodes
            </span>
          </div>
          <Progress value={embeddingCoverage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {embeddingCoverage >= 100 
              ? "✓ All nodes have embeddings. Semantic search is fully operational."
              : `${(totalNodes - withEmbeddings)} nodes need embeddings for complete semantic search.`}
          </p>
        </CardContent>
      </Card>

      {/* Distribution Charts & Health Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <NodeDistribution nodesByType={nodesByType} totalNodes={totalNodes} />
        <EdgeDistribution edgesByType={edgesByType} totalEdges={totalEdges} />
        <HealthSummaryPanel />
      </div>
      
      {/* Orphan Nodes & Query Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrphanNodesPanel />
        <QueryPerformancePanel />
      </div>
    </div>
  );
}
