/**
 * Regulation Sources Panel - Admin UI for managing external crawl sources
 */

import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Play, 
  Trash2, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Search,
  Loader2,
  History,
  Zap,
  Pencil,
  Download,
  AlertTriangle,
  FileText,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRegulationSources, RegulationSource, CrawlHistory, CrawlingTarget } from '@/hooks/useRegulationSources';
import { EditSourceDialog } from './EditSourceDialog';
import { IndustryMultiSelect } from './IndustryMultiSelect';
import { CrawledContentViewer } from './CrawledContentViewer';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Jurisdiction options
const JURISDICTIONS = [
  { value: 'VN', label: '🇻🇳 Việt Nam' },
  { value: 'EU', label: '🇪🇺 EU' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'JP', label: '🇯🇵 Japan' },
];

// Category options
const CATEGORIES = [
  { value: 'tax', label: 'Thuế / Tax' },
  { value: 'advertising', label: 'Quảng cáo / Advertising' },
  { value: 'land', label: 'Đất đai / Land' },
  { value: 'finance', label: 'Tài chính / Finance' },
  { value: 'healthcare', label: 'Y tế / Healthcare' },
  { value: 'environment', label: 'Môi trường / Environment' },
  { value: 'labor', label: 'Lao động / Labor' },
  { value: 'data_privacy', label: 'Bảo mật dữ liệu / Data Privacy' },
  { value: 'consumer', label: 'Bảo vệ người tiêu dùng / Consumer Protection' },
  { value: 'general', label: 'Chung / General' },
];

// Frequency options
const FREQUENCIES = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
];

interface AddSourceFormData {
  source_name: string;
  source_url: string;
  jurisdiction: string;
  category: string;
  search_query: string;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
  target_industry_pack_ids: string[];
}

const initialFormData: AddSourceFormData = {
  source_name: '',
  source_url: '',
  jurisdiction: 'VN',
  category: 'general',
  search_query: '',
  crawl_frequency: 'weekly',
  target_industry_pack_ids: [],
};

export function RegulationSourcesPanel() {
  const {
    sources,
    crawlHistory,
    isLoadingSources,
    isLoadingHistory,
    isCrawling,
    crawlingTarget, // NEW: track which source is being crawled
    isCreating,
    isUpdating,
    isDeleting,
    isSeeding,
    createSource,
    updateSource,
    deleteSource,
    toggleSourceActive,
    triggerCrawl,
    seedInitialSources,
    refetchSources,
    refetchHistory,
  } = useRegulationSources();
  
  // Helper: check if a specific source is being crawled
  const isSourceCrawling = (sourceId: string) => 
    crawlingTarget?.mode === 'single' && crawlingTarget.sourceId === sourceId;
  
  // Helper: check if "crawl all" is running
  const isCrawlingAll = crawlingTarget?.mode === 'all';
  
  // Get crawling source name for status display
  const getCrawlingSourceName = (): string | null => {
    if (!crawlingTarget) return null;
    if (crawlingTarget.mode === 'all') return 'Tất cả nguồn';
    const source = sources.find(s => s.id === crawlingTarget.sourceId);
    return source?.source_name || 'Đang crawl...';
  };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<RegulationSource | null>(null);
  const [formData, setFormData] = useState<AddSourceFormData>(initialFormData);
  const [selectedTab, setSelectedTab] = useState('sources');

  const handleAddSource = () => {
    createSource({
      ...formData,
      is_active: true,
      properties: {},
      target_industry_category_ids: [],
    });
    setIsAddDialogOpen(false);
    setFormData(initialFormData);
  };

  const handleEditSource = (data: Partial<RegulationSource> & { id: string }) => {
    updateSource(data);
    setEditingSource(null);
  };

  const handleCrawlAll = () => {
    triggerCrawl({ crawl_all: true });
  };

  const handleCrawlSingle = (sourceId: string) => {
    triggerCrawl({ source_id: sourceId });
  };

  const handleSeedSources = () => {
    seedInitialSources();
  };

  const getStatusIcon = (status: CrawlHistory['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getJurisdictionFlag = (jurisdiction: string) => {
    const j = JURISDICTIONS.find(j => j.value === jurisdiction);
    return j?.label.split(' ')[0] || '🌐';
  };

  // Get source domain badge info
  const getSourceBadge = (sourceUrl: string): { label: string; className: string; icon: string } => {
    if (sourceUrl.includes('vbpl.vn')) {
      return { 
        label: 'VBPL', 
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        icon: '⭐'
      };
    }
    if (sourceUrl.includes('luatvietnam.vn')) {
      return { 
        label: 'LuậtVN', 
        className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
        icon: '📘'
      };
    }
    if (sourceUrl.includes('vanban.chinhphu.vn') || sourceUrl.includes('chinhphu.vn')) {
      return { 
        label: 'Chính phủ', 
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        icon: '🏛️'
      };
    }
    if (sourceUrl.includes('thuvienphapluat.vn')) {
      return { 
        label: 'TVPL', 
        className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
        icon: '📚'
      };
    }
    return { 
      label: 'Khác', 
      className: 'bg-muted text-muted-foreground border-border',
      icon: '🌐'
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Nguồn Quy Định Bên Ngoài
          </h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các nguồn crawl tự động để cập nhật Knowledge Graph
          </p>
          {/* Crawling status indicator */}
          {crawlingTarget && (
            <div className="flex items-center gap-2 mt-1 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Đang crawl: <strong>{getCrawlingSourceName()}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
                <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedSources}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Seed VN Sources
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Thêm nguồn VBPL.VN + ThưViệnPhápLuật.vn (HTML dễ parse, không CAPTCHA)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSources();
              refetchHistory();
            }}
            disabled={isLoadingSources || isLoadingHistory}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingSources ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleCrawlAll}
            disabled={isCrawling || sources.filter(s => s.is_active).length === 0}
          >
            {isCrawlingAll ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            Crawl Tất Cả
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Thêm Nguồn
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm Nguồn Quy Định Mới</DialogTitle>
                <DialogDescription>
                  Cấu hình nguồn crawl để tự động phát hiện và cập nhật quy định pháp lý.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="source_name">Tên Nguồn</Label>
                  <Input
                    id="source_name"
                    placeholder="Ví dụ: Văn bản Chính phủ - Thuế"
                    value={formData.source_name}
                    onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source_url">URL Nguồn</Label>
                  <Input
                    id="source_url"
                    placeholder="https://vanban.chinhphu.vn"
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Khu vực pháp lý</Label>
                  <Select
                    value={formData.jurisdiction}
                    onValueChange={(value) => setFormData({ ...formData, jurisdiction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map((j) => (
                        <SelectItem key={j.value} value={j.value}>
                          {j.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search_query">Query Tìm Kiếm</Label>
                  <Input
                    id="search_query"
                    placeholder="Ví dụ: Luật Quản lý thuế site:vanban.chinhphu.vn"
                    value={formData.search_query}
                    onChange={(e) => setFormData({ ...formData, search_query: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sử dụng site: để giới hạn tìm kiếm trong domain cụ thể
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tần suất Crawl</Label>
                  <Select
                    value={formData.crawl_frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      setFormData({ ...formData, crawl_frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Target Industries Multi-Select */}
                <IndustryMultiSelect
                  selectedIds={formData.target_industry_pack_ids}
                  onChange={(ids) => setFormData({ ...formData, target_industry_pack_ids: ids })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleAddSource} 
                  disabled={isCreating || !formData.source_name || !formData.source_url}
                >
                  {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Thêm Nguồn
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{sources.length}</div>
            <p className="text-xs text-muted-foreground">Tổng Nguồn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {sources.filter(s => s.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Đang Hoạt Động</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {crawlHistory.filter(h => h.status === 'completed').reduce((sum, h) => sum + h.new_regulations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Quy Định Mới (7 ngày)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {crawlHistory.filter(h => h.status === 'completed').reduce((sum, h) => sum + h.changes_detected, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Thay Đổi Phát Hiện</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="sources" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Nguồn ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Nội Dung Crawl
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Lịch Sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <CrawledContentViewer />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          {isLoadingSources ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Chưa có nguồn quy định nào</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm Nguồn Đầu Tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <Card key={source.id} className={!source.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg">{getJurisdictionFlag(source.jurisdiction)}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium ${getSourceBadge(source.source_url).className}`}
                          >
                            {getSourceBadge(source.source_url).icon} {getSourceBadge(source.source_url).label}
                          </Badge>
                          <h4 className="font-medium">{source.source_name}</h4>
                          <Badge variant={source.is_active ? 'default' : 'secondary'}>
                            {source.is_active ? 'Hoạt động' : 'Tạm dừng'}
                          </Badge>
                          <Badge variant="outline">{source.crawl_frequency}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <a 
                            href={source.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {source.source_url}
                          </a>
                          <span className="flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            {source.category}
                          </span>
                        </div>
                        {source.search_query && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-1 rounded">
                            {source.search_query}
                          </p>
                        )}
                        
                        {/* Target Industries Display */}
                        {source.target_industry_pack_ids && source.target_industry_pack_ids.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Target className="h-3 w-3 text-primary" />
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              {source.target_industry_pack_ids.length} ngành mục tiêu
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {source.last_crawled_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Crawl lần cuối: {formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true, locale: vi })}
                            </span>
                          )}
                          {source.next_crawl_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Tiếp theo: {format(new Date(source.next_crawl_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCrawlSingle(source.id)}
                                disabled={isSourceCrawling(source.id) || isCrawlingAll || !source.is_active}
                              >
                                {isSourceCrawling(source.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Crawl ngay</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSource(source)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Chỉnh sửa</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={(checked) => toggleSourceActive(source.id, checked)}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa nguồn quy định?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Nguồn "{source.source_name}" và lịch sử crawl liên quan sẽ bị xóa.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSource(source.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : crawlHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có lịch sử crawl</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Nguồn</TableHead>
                    <TableHead>Thời Gian</TableHead>
                    <TableHead className="text-right">Kết Quả</TableHead>
                    <TableHead className="text-right">Mới</TableHead>
                    <TableHead className="text-right">Cập Nhật</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crawlHistory.map((history) => {
                    const source = sources.find(s => s.id === history.source_id);
                    return (
                      <TableRow key={history.id} className={history.status === 'failed' ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(history.status)}
                            <span className="capitalize text-sm">{history.status}</span>
                            {history.status === 'failed' && history.error_message && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{history.error_message}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {source ? (
                            <div className="flex items-center gap-1">
                              <span>{getJurisdictionFlag(source.jurisdiction)}</span>
                              <span className="text-sm">{source.source_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Đã xóa</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(history.crawl_started_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                          {history.crawl_completed_at && (
                            <div className="text-xs text-muted-foreground">
                              Hoàn thành sau {Math.round((new Date(history.crawl_completed_at).getTime() - new Date(history.crawl_started_at).getTime()) / 1000)}s
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {history.results_count}
                        </TableCell>
                        <TableCell className="text-right">
                          {history.new_regulations > 0 ? (
                            <Badge variant="default" className="bg-green-500">
                              +{history.new_regulations}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {history.updated_regulations > 0 ? (
                            <Badge variant="secondary">
                              {history.updated_regulations}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Source Dialog */}
      <EditSourceDialog
        source={editingSource}
        open={!!editingSource}
        onOpenChange={(open) => !open && setEditingSource(null)}
        onSave={handleEditSource}
        isLoading={isUpdating}
      />
    </div>
  );
}

export default RegulationSourcesPanel;
