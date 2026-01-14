import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search,
  RefreshCw,
  GitMerge,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Star,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Database,
  AlertCircle
} from 'lucide-react';
import { useDuplicateDetection, DuplicateGroup } from '@/hooks/useDuplicateDetection';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface EmbeddingStats {
  total_regulations: number;
  with_embedding: number;
  missing_embedding: number;
  embedding_percentage: number;
}

interface DuplicateDetectionPanelProps {
  selectedNodeId?: string | null;
}

export function DuplicateDetectionPanel({ selectedNodeId }: DuplicateDetectionPanelProps) {
  const [threshold, setThreshold] = useState(0.85);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedForMerge, setSelectedForMerge] = useState<Map<string, string>>(new Map()); // groupId -> keepNodeId
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const {
    isScanning,
    isMerging,
    scanProgress,
    duplicates,
    scanAll,
    checkSingle,
    mergeDuplicates,
    ignoreDuplicate,
    clearResults
  } = useDuplicateDetection();

  // Fetch embedding stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { data, error } = await supabase.rpc('get_regulation_embedding_stats');
        if (!error && data && data.length > 0) {
          setEmbeddingStats(data[0] as EmbeddingStats);
        }
      } catch (err) {
        console.error('Error fetching embedding stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [duplicates]); // Refresh when duplicates change (after merge)

  const handleScanAll = () => {
    scanAll(threshold, 200);
  };

  const handleCheckSelected = () => {
    if (selectedNodeId) {
      checkSingle(selectedNodeId, threshold);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const selectNodeToKeep = (groupId: string, nodeId: string) => {
    setSelectedForMerge(prev => new Map(prev).set(groupId, nodeId));
  };

  const handleMerge = async (group: DuplicateGroup) => {
    const keepNodeId = selectedForMerge.get(group.id) || group.nodes[0]?.id;
    if (!keepNodeId) return;

    const removeNodeIds = group.nodes
      .filter(n => n.id !== keepNodeId)
      .map(n => n.id);

    await mergeDuplicates(keepNodeId, removeNodeIds);
    setSelectedForMerge(prev => {
      const next = new Map(prev);
      next.delete(group.id);
      return next;
    });
  };

  const handleIgnoreGroup = async (group: DuplicateGroup) => {
    // Ignore all pairs in the group
    for (let i = 0; i < group.nodes.length - 1; i++) {
      await ignoreDuplicate(group.nodes[i].id, group.nodes[i + 1].id);
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <Badge variant="destructive">Trùng hoàn toàn</Badge>;
      case 'exact_title':
        return <Badge variant="destructive">Trùng tên</Badge>;
      default:
        return <Badge variant="secondary">Tương tự ngữ nghĩa</Badge>;
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.95) return 'text-destructive';
    if (similarity >= 0.9) return 'text-orange-500';
    return 'text-yellow-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Kiểm tra văn bản trùng lặp
        </CardTitle>
        <CardDescription>
          Phát hiện và xử lý các văn bản pháp luật trùng lặp trong Knowledge Graph
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Embedding Stats Alert */}
        {embeddingStats && embeddingStats.missing_embedding > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>{embeddingStats.missing_embedding}/{embeddingStats.total_regulations}</strong> văn bản thiếu embedding 
                ({Math.round(embeddingStats.embedding_percentage)}% đã có).
                <br />
                <span className="text-sm">
                  Các văn bản thiếu embedding sẽ được so sánh bằng <strong>tên chính xác</strong> thay vì ngữ nghĩa.
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0 ml-2"
                onClick={() => window.location.hash = '#vectors'}
              >
                <Database className="h-4 w-4 mr-1" />
                Tạo Embeddings
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Ngưỡng tương đồng: {Math.round(threshold * 100)}%
              </label>
              <span className="text-xs text-muted-foreground">
                {threshold >= 0.95 ? 'Rất chặt' : threshold >= 0.9 ? 'Chặt' : threshold >= 0.85 ? 'Trung bình' : 'Lỏng'}
              </span>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              min={0.75}
              max={0.98}
              step={0.01}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleScanAll}
              disabled={isScanning}
              className="gap-2"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Quét toàn bộ
            </Button>

            {selectedNodeId && (
              <Button
                variant="outline"
                onClick={handleCheckSelected}
                disabled={isScanning}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Check node đang chọn
              </Button>
            )}

            {duplicates.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearResults}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Xóa kết quả
              </Button>
            )}
          </div>

          {isScanning && scanProgress > 0 && (
            <Progress value={scanProgress} className="h-2" />
          )}
        </div>

        {/* Results */}
        {duplicates.length > 0 && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tìm thấy <strong>{duplicates.length}</strong> nhóm văn bản có thể trùng lặp.
                Chọn node muốn giữ lại rồi nhấn "Gộp".
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {duplicates.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const keepNodeId = selectedForMerge.get(group.id) || group.nodes[0]?.id;

                  return (
                    <Collapsible
                      key={group.id}
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(group.id)}
                    >
                      <Card className="border-l-4 border-l-orange-500">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="py-3 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">
                                    {group.nodes[0]?.name || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {group.nodes.length} văn bản tương tự
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getMatchTypeBadge(group.match_type)}
                                <Badge 
                                  variant="outline" 
                                  className={getSimilarityColor(group.similarity)}
                                >
                                  {Math.round(group.similarity * 100)}%
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                            {/* Node list */}
                            <div className="space-y-2">
                              {group.nodes.map((node, idx) => (
                                <div
                                  key={node.id}
                                  onClick={() => selectNodeToKeep(group.id, node.id)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    keepNodeId === node.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-muted-foreground'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {keepNodeId === node.id && (
                                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                        <span className="font-medium text-sm truncate">
                                          {node.name}
                                        </span>
                                        {idx === 0 && (
                                          <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                        <div className="truncate font-mono">
                                          {node.node_key}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(node.created_at), 'dd/MM/yyyy', { locale: vi })}
                                          </span>
                                          {node.quality && (
                                            <Badge variant="outline" className="text-xs">
                                              Quality: {node.quality}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {node.source_url && (
                                      <a
                                        href={node.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleMerge(group)}
                                disabled={isMerging}
                                className="gap-2"
                              >
                                {isMerging ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <GitMerge className="h-4 w-4" />
                                )}
                                Gộp (giữ node được chọn)
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIgnoreGroup(group)}
                                className="gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Bỏ qua
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {!isScanning && duplicates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nhấn "Quét toàn bộ" để tìm văn bản trùng lặp</p>
            <p className="text-sm mt-1">
              Hệ thống sẽ so sánh semantic embedding giữa các regulations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
