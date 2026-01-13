/**
 * CrawledContentViewer - View crawled regulation content from Knowledge Graph nodes
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  ExternalLink, 
  Clock, 
  Tag, 
  Globe, 
  Search,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Hash,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useReparseRegulations, hasHtmlLayoutArtifacts } from '@/hooks/useReparseRegulations';
import { cn } from '@/lib/utils';
import { ContentQualityBadge, estimateContentQuality } from './ContentQualityBadge';
import { TasksPagination } from '@/components/TasksPagination';
import { CrawledNodeDetailSheet } from './CrawledNodeDetailSheet';
import type { CrawledNode as CrawledNodeType, VersionHistoryEntry } from './CrawledNodeCard';

// Source color mapping for visual distinction
const getSourceColor = (sourceName: string): string => {
  const colors: Record<string, string> = {
    'vbpl.vn': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
    'luatvietnam.vn': 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    'chinhphu.vn': 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    'thuvienphapluat.vn': 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400',
    'eur-lex.europa.eu': 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400',
    'sec.gov': 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
  };
  const normalized = sourceName.toLowerCase();
  for (const [key, color] of Object.entries(colors)) {
    if (normalized.includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
};

interface QualityBreakdown {
  artifact_penalty?: number;
  legal_structure?: number;
  completeness?: number;
  readability?: number;
}

// Re-use CrawledNode type from CrawledNodeCard
type CrawledNode = CrawledNodeType;

interface SourceInfo {
  id: string;
  source_name: string;
  jurisdiction: string;
  category: string;
}

export function CrawledContentViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterDirty, setFilterDirty] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<CrawledNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [showBulkReparseDialog, setShowBulkReparseDialog] = useState(false);
  const [parsingNodeId, setParsingNodeId] = useState<string | null>(null);
  const [showFullTextSheet, setShowFullTextSheet] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ mode: 'single' | 'bulk'; nodeId?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { 
    isReparsing, 
    reparseNode, 
    reparseNodes, 
    reparseAllWithArtifacts,
    lastResult 
  } = useReparseRegulations();
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJurisdiction, selectedCategory, filterDirty, searchQuery]);

  // Fetch crawled nodes with pagination
  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['crawled-regulation-nodes', selectedJurisdiction, selectedCategory, filterDirty, searchQuery, currentPage, itemsPerPage],
    queryFn: async () => {
      // First, get total count with filters
      let countQuery = supabase
        .from('industry_knowledge_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('node_type', 'regulation')
        .not('source_id', 'is', null);
      
      const { count } = await countQuery;
      
      // Then get paginated data
      const offset = (currentPage - 1) * itemsPerPage;
      let dataQuery = supabase
        .from('industry_knowledge_nodes')
        .select('*')
        .eq('node_type', 'regulation')
        .not('source_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      const { data, error } = await dataQuery;
      if (error) throw error;

      // Filter by properties (client-side for now - could be optimized with DB filters)
      let filtered = (data || []) as CrawledNode[];
      
      if (selectedJurisdiction !== 'all') {
        filtered = filtered.filter(n => n.properties?.jurisdiction === selectedJurisdiction);
      }
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(n => n.properties?.category === selectedCategory);
      }

      return { nodes: filtered, totalCount: count || 0 };
    },
  });
  
  const crawledNodes = queryResult?.nodes || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Fetch source info for display
  const { data: sources = [] } = useQuery({
    queryKey: ['regulation-sources-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_sources')
        .select('id, source_name, jurisdiction, category');
      if (error) throw error;
      return data as SourceInfo[];
    },
  });

  // Get source name by ID
  const getSourceName = (sourceId: string | null) => {
    if (!sourceId) return 'Unknown';
    const source = sources.find(s => s.id === sourceId);
    return source?.source_name || sourceId.slice(0, 8) + '...';
  };

  // Filter by search query and dirty status
  const filteredNodes = useMemo(() => {
    let nodes = crawledNodes;
    
    // Filter by dirty (HTML artifacts)
    if (filterDirty) {
      nodes = nodes.filter(node => hasHtmlLayoutArtifacts(node.full_text));
    }
    
    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      nodes = nodes.filter(node => {
        const title = node.display_name?.vi || node.display_name?.en || node.node_key;
        const desc = node.description?.vi || node.description?.en || '';
        return title.toLowerCase().includes(searchLower) || desc.toLowerCase().includes(searchLower);
      });
    }
    
    return nodes;
  }, [crawledNodes, searchQuery, filterDirty]);

  // Count nodes with HTML artifacts
  const dirtyNodesCount = useMemo(() => 
    crawledNodes.filter(node => hasHtmlLayoutArtifacts(node.full_text)).length,
    [crawledNodes]
  );

  // Count pending nodes
  const pendingNodesCount = useMemo(() => 
    crawledNodes.filter(node => node.parse_status === 'pending').length,
    [crawledNodes]
  );

  // Handle batch parse for pending nodes
  const handleParsePending = async () => {
    const pendingIds = crawledNodes
      .filter(n => n.parse_status === 'pending')
      .map(n => n.id);
    if (pendingIds.length === 0) return;
    
    toast.info(`Đang parse ${pendingIds.length} văn bản...`);
    await reparseNodes(pendingIds);
    refetch();
  };

  // Export full_text to TXT file
  const handleExportTxt = (node: CrawledNode) => {
    if (!node.full_text) return;
    const blob = new Blob([node.full_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${node.node_key || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file TXT');
  };

  // Get unique jurisdictions and categories from data
  const uniqueJurisdictions = [...new Set(crawledNodes.map(n => n.properties?.jurisdiction).filter(Boolean))];
  const uniqueCategories = [...new Set(crawledNodes.map(n => n.properties?.category).filter(Boolean))];

  // Toggle selection for bulk actions
  const toggleSelectNode = (nodeId: string) => {
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const selectAllDirty = () => {
    const dirtyIds = filteredNodes
      .filter(n => hasHtmlLayoutArtifacts(n.full_text))
      .map(n => n.id);
    setSelectedNodeIds(new Set(dirtyIds));
  };

  const clearSelection = () => {
    setSelectedNodeIds(new Set());
  };

  const handleBulkReparse = async () => {
    const ids = Array.from(selectedNodeIds);
    if (ids.length === 0) return;
    
    await reparseNodes(ids);
    setShowBulkReparseDialog(false);
    clearSelection();
    refetch();
  };
  
  // Delete single node
  const handleDeleteNode = async (nodeId: string) => {
    setIsDeleting(true);
    try {
      // Delete related edges first
      await supabase
        .from('industry_knowledge_edges')
        .delete()
        .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);
      
      // Delete node
      const { error } = await supabase
        .from('industry_knowledge_nodes')
        .delete()
        .eq('id', nodeId);
      
      if (error) throw error;
      
      toast.success('Đã xóa văn bản');
      refetch();
    } catch (error) {
      toast.error('Lỗi khi xóa: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };
  
  // Bulk delete nodes
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedNodeIds);
    if (ids.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete related edges first
      for (const nodeId of ids) {
        await supabase
          .from('industry_knowledge_edges')
          .delete()
          .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);
      }
      
      // Delete nodes
      const { error } = await supabase
        .from('industry_knowledge_nodes')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      
      toast.success(`Đã xóa ${ids.length} văn bản`);
      clearSelection();
      refetch();
    } catch (error) {
      toast.error('Lỗi khi xóa: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const handleSingleReparse = async (nodeId: string) => {
    setParsingNodeId(nodeId);
    
    try {
      await reparseNode(nodeId);
      
      // Poll for completion - handle slow/timeout scenarios
      // Parse may succeed even if response times out (DB is updated)
      let pollAttempts = 0;
      const maxPollAttempts = 15; // 15 * 2s = 30s max polling
      
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        const result = await refetch();
        
        // Find the node we're parsing
        const updatedNode = result.data?.nodes?.find(n => n.id === nodeId);
        
        if (updatedNode) {
          // Stop polling if parse completed (success or fail)
          if (updatedNode.parse_status === 'parsed' || updatedNode.parse_status === 'failed') {
            clearInterval(pollInterval);
            setParsingNodeId(null);
            return;
          }
        }
        
        // Stop polling after max attempts
        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollInterval);
          setParsingNodeId(null);
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error) {
      console.error('Parse error:', error);
      
      // Even on error, poll to check if DB was updated
      let pollAttempts = 0;
      const maxPollAttempts = 10;
      
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        const result = await refetch();
        
        const updatedNode = result.data?.nodes?.find(n => n.id === nodeId);
        
        if (updatedNode?.parse_status === 'parsed' || updatedNode?.parse_status === 'failed') {
          clearInterval(pollInterval);
          setParsingNodeId(null);
          return;
        }
        
        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollInterval);
          setParsingNodeId(null);
        }
      }, 2000);
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getJurisdictionFlag = (jurisdiction?: string) => {
    const flags: Record<string, string> = {
      'VN': '🇻🇳',
      'US': '🇺🇸',
      'EU': '🇪🇺',
      'SG': '🇸🇬',
      'JP': '🇯🇵',
    };
    return flags[jurisdiction || ''] || '🌐';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nội Dung Đã Crawl
          </h3>
          <p className="text-sm text-muted-foreground">
            Xem và quản lý các quy định đã được crawl tự động vào Knowledge Graph
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedNodeIds.size > 0 && (
            <>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  setDeleteTarget({ mode: 'bulk' });
                  setShowDeleteDialog(true);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Xóa ({selectedNodeIds.size})
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowBulkReparseDialog(true)}
                disabled={isReparsing}
              >
                {isReparsing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                Re-parse ({selectedNodeIds.size})
              </Button>
            </>
          )}
          {pendingNodesCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleParsePending}
              disabled={isReparsing}
            >
              {isReparsing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Parse Pending ({pendingNodesCount})
            </Button>
          )}
          {dirtyNodesCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={filterDirty ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFilterDirty(!filterDirty)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Cần re-parse ({dirtyNodesCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Các văn bản chứa HTML layout cần được xử lý lại</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {filterDirty && dirtyNodesCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm flex-1">
            <strong>{dirtyNodesCount}</strong> văn bản có nội dung HTML layout cần được re-parse với logic mới
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={selectAllDirty}
            disabled={selectedNodeIds.size === dirtyNodesCount}
          >
            Chọn tất cả
          </Button>
          {selectedNodeIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Bỏ chọn
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
          <SelectTrigger className="w-[140px]">
            <Globe className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Khu vực" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {uniqueJurisdictions.map(j => (
              <SelectItem key={j} value={j!}>
                {getJurisdictionFlag(j)} {j}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px]">
            <Tag className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {uniqueCategories.map(c => (
              <SelectItem key={c} value={c!}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto">
          {totalCount} kết quả
        </Badge>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có nội dung nào được crawl</p>
            <p className="text-xs text-muted-foreground mt-1">
              Thêm nguồn và chạy crawl để bắt đầu thu thập quy định
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2 pr-4">
            {filteredNodes.map((node) => {
              const isExpanded = expandedNodes.has(node.id);
              const title = node.display_name?.vi || node.display_name?.en || node.node_key;
              const description = node.description?.vi || node.description?.en;
              const isDirty = hasHtmlLayoutArtifacts(node.full_text);
              const isSelected = selectedNodeIds.has(node.id);

              return (
                <Card key={node.id} className={`overflow-hidden ${isDirty ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(node.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          {/* Selection checkbox */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectNode(node.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg">
                                {getJurisdictionFlag(node.properties?.jurisdiction)}
                              </span>
                              <CardTitle className="text-sm font-medium line-clamp-1">
                                {title}
                              </CardTitle>
                              {/* Content Quality Badge */}
                              <ContentQualityBadge 
                                score={node.content_quality_score ?? estimateContentQuality(node.full_text)}
                                breakdown={node.quality_breakdown}
                                showLabel={false}
                              />
                              {isDirty && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/30 border-amber-300 text-amber-700 dark:text-amber-400">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        HTML Layout
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Nội dung chứa layout HTML, cần re-parse</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {node.properties?.category || 'general'}
                              </Badge>
                              {node.source_id && (
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getSourceColor(getSourceName(node.source_id)))}
                                >
                                  {getSourceName(node.source_id)}
                                </Badge>
                              )}
                              {node.parse_status && (
                                <Badge 
                                  variant={node.parse_status === 'parsed' ? 'default' : 'secondary'}
                                  className={`text-xs ${
                                    node.parse_status === 'parsed' ? 'bg-green-500' :
                                    node.parse_status === 'failed' ? 'bg-red-500' :
                                    node.parse_status === 'parsing' ? 'bg-blue-500' :
                                    ''
                                  }`}
                                >
                                  {node.parse_status === 'parsed' ? '✓ Đã parse' :
                                   node.parse_status === 'failed' ? '✗ Lỗi' :
                                   node.parse_status === 'parsing' ? '⏳ Đang parse' :
                                   node.parse_status === 'skipped' ? '⏭ Bỏ qua' : 'Chờ'}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(node.created_at), { 
                                  addSuffix: true, 
                                  locale: vi 
                                })}
                              </span>
                              {node.source_url && (
                                <a
                                  href={node.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Nguồn gốc
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Parse button for all nodes with source_url */}
                            {node.source_url && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={isDirty || node.parse_status === 'failed' ? "default" : "outline"}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSingleReparse(node.id);
                                      }}
                                      disabled={parsingNodeId !== null}
                                      className={isDirty || node.parse_status === 'failed' ? "bg-amber-500 hover:bg-amber-600" : ""}
                                    >
                                      {parsingNodeId === node.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                      ) : (
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      {parsingNodeId === node.id ? 'Đang parse...' : 'Parse'}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{isDirty ? 'Re-parse (có HTML artifacts)' : node.parse_status === 'failed' ? 'Thử lại parse' : 'Parse nội dung'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(node);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Xem
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({ mode: 'single', nodeId: node.id });
                                      setShowDeleteDialog(true);
                                    }}
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Xóa văn bản này</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 ml-9">
                        {description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                            {description}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            <span className="font-mono">{node.node_key.slice(0, 30)}...</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Tag className="h-3.5 w-3.5" />
                            <span>{getSourceName(node.source_id)}</span>
                          </div>
                          {node.content_hash && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="font-mono">Hash: {node.content_hash}</span>
                            </div>
                          )}
                          {node.last_verified_at && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                Verified: {format(new Date(node.last_verified_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
      
      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <div className="mt-4">
          <TasksPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[10, 20, 50, 100]}
          />
        </div>
      )}

      {/* Detail Dialog - Using modular component with edit support */}
      <CrawledNodeDetailSheet
        node={selectedNode}
        isOpen={!!selectedNode}
        isReparsing={parsingNodeId === selectedNode?.id}
        showFullTextSheet={showFullTextSheet}
        onClose={() => setSelectedNode(null)}
        onReparse={(nodeId) => {
          handleSingleReparse(nodeId);
          setSelectedNode(null);
        }}
        onToggleFullTextSheet={setShowFullTextSheet}
        onRefresh={() => refetch()}
      />

      {/* Bulk Reparse Confirmation Dialog */}
      <Dialog open={showBulkReparseDialog} onOpenChange={setShowBulkReparseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Re-parse {selectedNodeIds.size} văn bản
            </DialogTitle>
            <DialogDescription>
              Các văn bản đã chọn sẽ được xử lý lại với logic extraction mới để loại bỏ HTML layout artifacts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-sm">
                <p className="font-medium">Sẽ thực hiện:</p>
                <ul className="text-muted-foreground list-disc list-inside mt-1">
                  <li>Tải lại nội dung từ nguồn gốc</li>
                  <li>Áp dụng logic làm sạch HTML mới</li>
                  <li>Cập nhật full_text trong database</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReparseDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleBulkReparse} disabled={isReparsing}>
              {isReparsing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Xác nhận Re-parse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {deleteTarget?.mode === 'bulk' 
                ? `Xóa ${selectedNodeIds.size} văn bản?` 
                : 'Xóa văn bản này?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn khỏi Knowledge Graph, 
              bao gồm cả các liên kết (edges) đến văn bản này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget?.mode === 'bulk') {
                  handleBulkDelete();
                } else if (deleteTarget?.nodeId) {
                  handleDeleteNode(deleteTarget.nodeId);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CrawledContentViewer;
