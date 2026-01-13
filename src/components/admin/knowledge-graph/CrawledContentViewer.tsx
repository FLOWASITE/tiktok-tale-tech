/**
 * CrawledContentViewer - View crawled regulation content from Knowledge Graph nodes
 */

import React, { useState, useMemo } from 'react';
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
  Copy,
  Maximize2,
  Download,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useReparseRegulations, hasHtmlLayoutArtifacts } from '@/hooks/useReparseRegulations';
import { cn } from '@/lib/utils';
import { ContentQualityBadge, estimateContentQuality } from './ContentQualityBadge';

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

interface CrawledNode {
  id: string;
  node_key: string;
  node_type: string;
  display_name: { vi?: string; en?: string } | null;
  description: { vi?: string; en?: string } | null;
  properties: {
    jurisdiction?: string;
    category?: string;
    published_date?: string;
    auto_crawled?: boolean;
    crawled_at?: string;
    markdown?: string;
  } | null;
  source_url: string | null;
  source_id: string | null;
  content_hash: string | null;
  last_verified_at: string | null;
  created_at: string;
  // New Living System fields
  full_text: string | null;
  extracted_data: {
    document_number?: string;
    document_type?: string;
    document_title?: string;
    effective_date?: string;
    issuing_authority?: string;
    summary?: string;
    key_changes?: string[];
    claim_restrictions?: Array<{ claim: string; restriction_type: string; alternative?: string }>;
    compliance_impacts?: Array<{ industry_code: string; impact_type: string; description: string; severity: string }>;
    confidence_score?: number;
  } | null;
  document_url: string | null;
  document_type: string | null;
  effective_date: string | null;
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed' | 'skipped' | null;
  // Quality Intelligence fields
  content_quality_score: number | null;
  quality_breakdown: QualityBreakdown | null;
}

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

  const { 
    isReparsing, 
    reparseNode, 
    reparseNodes, 
    reparseAllWithArtifacts,
    lastResult 
  } = useReparseRegulations();

  // Fetch crawled nodes (regulations that were auto-crawled)
  const { data: crawledNodes = [], isLoading, refetch } = useQuery({
    queryKey: ['crawled-regulation-nodes', selectedJurisdiction, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('industry_knowledge_nodes')
        .select('*')
        .eq('node_type', 'regulation')
        .not('source_id', 'is', null) // Only auto-crawled nodes
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      // Filter by properties
      let filtered = (data || []) as CrawledNode[];
      
      if (selectedJurisdiction !== 'all') {
        filtered = filtered.filter(n => n.properties?.jurisdiction === selectedJurisdiction);
      }
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(n => n.properties?.category === selectedCategory);
      }

      return filtered;
    },
  });

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
        const updatedNode = result.data?.find(n => n.id === nodeId);
        
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
        
        const updatedNode = result.data?.find(n => n.id === nodeId);
        
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
          {filteredNodes.length} kết quả
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

      {/* Detail Dialog - Mobile optimized */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="w-[95vw] max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-lg sm:text-xl">
                {getJurisdictionFlag(selectedNode?.properties?.jurisdiction)}
              </span>
              <span className="line-clamp-2">
                {selectedNode?.display_name?.vi || selectedNode?.display_name?.en || 'Chi tiết'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2 sm:pr-4">
            {selectedNode && (
              <div className="space-y-4">
                {/* Meta info with Quality Score */}
                <div className="flex flex-wrap gap-2">
                  <ContentQualityBadge 
                    score={selectedNode.content_quality_score ?? estimateContentQuality(selectedNode.full_text)}
                    breakdown={selectedNode.quality_breakdown}
                    size="md"
                    showLabel={true}
                  />
                  <Badge variant="outline" className="text-xs">{selectedNode.properties?.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{selectedNode.properties?.jurisdiction}</Badge>
                  {selectedNode.properties?.auto_crawled && (
                    <Badge variant="default" className="bg-blue-500 text-xs">Auto-crawled</Badge>
                  )}
                  {selectedNode.parse_status && (
                    <Badge 
                      variant={selectedNode.parse_status === 'parsed' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {selectedNode.parse_status}
                    </Badge>
                  )}
                </div>

                {/* Source URL */}
                {selectedNode.source_url && (
                  <div className="p-2 sm:p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL Nguồn</p>
                    <a
                      href={selectedNode.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-primary hover:underline break-all flex items-start gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 sm:line-clamp-none">{selectedNode.source_url}</span>
                    </a>
                  </div>
                )}

                {/* Full Text Content - NEW */}
                {selectedNode.full_text && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Nội dung đã Parse ({selectedNode.full_text.length.toLocaleString()} ký tự)
                      </p>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedNode.full_text || '');
                            toast.success('Đã copy vào clipboard');
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleExportTxt(selectedNode)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          TXT
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs sm:hidden"
                          onClick={() => setShowFullTextSheet(true)}
                        >
                          <Maximize2 className="h-3 w-3 mr-1" />
                          Mở rộng
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[200px] sm:h-[300px]">
                      <div className="text-xs bg-muted p-2 sm:p-3 rounded-lg whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedNode.full_text}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Extracted Data Summary */}
                {selectedNode.extracted_data?.summary && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">📋 Tóm tắt AI</p>
                    <p className="text-xs sm:text-sm bg-muted/50 p-2 sm:p-3 rounded-lg">
                      {selectedNode.extracted_data.summary}
                    </p>
                    {selectedNode.extracted_data.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Độ tin cậy: {(selectedNode.extracted_data.confidence_score * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                )}

                {/* Key Changes */}
                {selectedNode.extracted_data?.key_changes && selectedNode.extracted_data.key_changes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">🔄 Thay đổi chính</p>
                    <ul className="text-xs sm:text-sm list-disc list-inside space-y-1 bg-muted/50 p-2 sm:p-3 rounded-lg">
                      {selectedNode.extracted_data.key_changes.map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Claim Restrictions */}
                {selectedNode.extracted_data?.claim_restrictions && selectedNode.extracted_data.claim_restrictions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">⚠️ Hạn chế claim</p>
                    <div className="space-y-2">
                      {selectedNode.extracted_data.claim_restrictions.map((restriction, i) => (
                        <div key={i} className="text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                          <p className="font-medium">{restriction.claim}</p>
                          <p className="text-xs text-muted-foreground">
                            Loại: {restriction.restriction_type}
                            {restriction.alternative && ` → ${restriction.alternative}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mô tả</p>
                  <p className="text-xs sm:text-sm">
                    {selectedNode.description?.vi || selectedNode.description?.en || 'Không có mô tả'}
                  </p>
                </div>

                {/* Properties - collapsible on mobile */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Thông tin chi tiết</p>
                  <pre className="text-xs bg-muted p-2 sm:p-3 rounded-lg overflow-auto max-h-32 sm:max-h-40">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày tạo</p>
                    <p>{format(new Date(selectedNode.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  {selectedNode.last_verified_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Lần xác minh cuối</p>
                      <p>{format(new Date(selectedNode.last_verified_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                  {selectedNode.properties?.crawled_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ngày crawl</p>
                      <p>{format(new Date(selectedNode.properties.crawled_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>

                {/* Node Key */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Node Key</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{selectedNode.node_key}</code>
                </div>
              </div>
            )}
          </ScrollArea>
          {/* Re-parse button in detail dialog */}
          {selectedNode && (hasHtmlLayoutArtifacts(selectedNode.full_text) || selectedNode.parse_status === 'failed') && selectedNode.source_url && (
            <DialogFooter className="mt-2">
              <Button 
                size="sm"
                onClick={() => {
                  handleSingleReparse(selectedNode.id);
                  setSelectedNode(null);
                }}
                disabled={isReparsing}
              >
                {isReparsing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                Re-parse văn bản này
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Text Sheet for Mobile */}
      <Sheet open={showFullTextSheet} onOpenChange={setShowFullTextSheet}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Nội dung đã Parse
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNode?.full_text || '');
                    toast.success('Đã copy vào clipboard');
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                {selectedNode && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleExportTxt(selectedNode)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    TXT
                  </Button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 mt-2">
            <div className="text-xs font-mono whitespace-pre-wrap leading-relaxed p-2 bg-muted rounded-lg">
              {selectedNode?.full_text}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}

export default CrawledContentViewer;
