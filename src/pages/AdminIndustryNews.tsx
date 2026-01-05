import { useState, useMemo } from 'react';
import { useCuratedNews } from '@/hooks/useCuratedNews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Clock,
  MoreHorizontal,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CuratedNews } from '@/types/curatedData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired';
type RelevanceFilter = 'all' | 'high' | 'medium' | 'low';
type SortOption = 'news_date' | 'expires_at' | 'relevance_score';

export default function AdminIndustryNews() {
  const { 
    news, 
    isLoading, 
    createNews, 
    updateNews, 
    deleteNews,
    bulkDelete,
    bulkUpdateStatus,
    isDeleting 
  } = useCuratedNews();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<CuratedNews | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('news_date');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    source_url: '',
    news_date: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    industries: [] as string[],
    relevance_score: 50,
    suggested_angles: [''],
    is_active: true,
  });

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const active = news.filter(n => n.is_active && new Date(n.expires_at) > now);
    const expiringSoon = active.filter(n => differenceInDays(new Date(n.expires_at), now) <= 2);
    const avgScore = news.length 
      ? Math.round(news.reduce((sum, n) => sum + (n.relevance_score || 0), 0) / news.length) 
      : 0;
    
    return {
      total: news.length,
      active: active.length,
      expiringSoon: expiringSoon.length,
      avgScore
    };
  }, [news]);

  // Filtered and sorted news
  const filteredNews = useMemo(() => {
    const now = new Date();
    
    return news
      .filter(item => {
        // Search filter
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        // Status filter
        const isExpired = new Date(item.expires_at) < now;
        if (statusFilter === 'active' && (!item.is_active || isExpired)) return false;
        if (statusFilter === 'inactive' && item.is_active) return false;
        if (statusFilter === 'expired' && !isExpired) return false;
        
        // Relevance filter
        const score = item.relevance_score || 0;
        if (relevanceFilter === 'high' && score < 70) return false;
        if (relevanceFilter === 'medium' && (score < 40 || score >= 70)) return false;
        if (relevanceFilter === 'low' && score >= 40) return false;
        
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'news_date') {
          return new Date(b.news_date).getTime() - new Date(a.news_date).getTime();
        }
        if (sortBy === 'expires_at') {
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        }
        return (b.relevance_score || 0) - (a.relevance_score || 0);
      });
  }, [news, searchQuery, statusFilter, relevanceFilter, sortBy]);

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      source_url: '',
      news_date: new Date().toISOString().split('T')[0],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      industries: [],
      relevance_score: 50,
      suggested_angles: [''],
      is_active: true,
    });
    setEditingNews(null);
  };

  const openEditDialog = (newsItem: CuratedNews) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      summary: newsItem.summary || '',
      source_url: newsItem.source_url || '',
      news_date: newsItem.news_date,
      expires_at: newsItem.expires_at.split('T')[0],
      industries: newsItem.industries || [],
      relevance_score: newsItem.relevance_score,
      suggested_angles: newsItem.suggested_angles?.length ? newsItem.suggested_angles : [''],
      is_active: newsItem.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      suggested_angles: formData.suggested_angles.filter(a => a.trim()),
      expires_at: new Date(formData.expires_at).toISOString(),
    };

    if (editingNews) {
      updateNews({ id: editingNews.id, ...payload });
    } else {
      createNews(payload);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleFetchUrl = async () => {
    if (!formData.source_url) {
      toast.error('Vui lòng nhập URL');
      return;
    }

    setIsFetchingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news-url', {
        body: { url: formData.source_url }
      });

      if (error) throw error;

      if (data?.success) {
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          summary: data.summary || prev.summary,
        }));
        toast.success('Đã lấy thông tin từ URL');
      } else {
        toast.error(data?.error || 'Không thể lấy thông tin');
      }
    } catch (error) {
      console.error('Error fetching URL:', error);
      toast.error('Lỗi khi lấy thông tin từ URL');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleToggleStatus = (item: CuratedNews) => {
    updateNews({ id: item.id, is_active: !item.is_active });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredNews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNews.map(n => n.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Xóa ${selectedIds.length} tin tức đã chọn?`)) {
      bulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkStatus = (status: boolean) => {
    if (selectedIds.length === 0) return;
    bulkUpdateStatus({ ids: selectedIds, is_active: status });
    setSelectedIds([]);
  };

  const getExpiryStatus = (expiresAt: string) => {
    const daysLeft = differenceInDays(new Date(expiresAt), new Date());
    if (daysLeft < 0) return { text: 'Hết hạn', color: 'text-red-500', badge: 'destructive' as const };
    if (daysLeft <= 2) return { text: `${daysLeft}d`, color: 'text-amber-500', badge: 'secondary' as const };
    return { text: `${daysLeft}d`, color: 'text-muted-foreground', badge: 'outline' as const };
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Newspaper className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tin tức ngành</h1>
          <p className="text-muted-foreground">Quản lý tin tức trending để AI tham khảo</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Newspaper className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Tổng tin tức</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Đang active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Điểm TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách tin tức ({filteredNews.length})</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm tin tức
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingNews ? 'Chỉnh sửa tin tức' : 'Thêm tin tức mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* URL Import */}
                  <div className="space-y-2">
                    <Label>URL nguồn</Label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        value={formData.source_url}
                        onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                        placeholder="https://example.com/article"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleFetchUrl}
                        disabled={isFetchingUrl || !formData.source_url}
                      >
                        {isFetchingUrl ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nhập URL và bấm nút để tự động lấy tiêu đề và tóm tắt
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tiêu đề *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="VD: AI content marketing trends 2025"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tóm tắt</Label>
                    <Textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="Tóm tắt nội dung chính của tin tức..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ngày tin</Label>
                      <Input
                        type="date"
                        value={formData.news_date}
                        onChange={(e) => setFormData({ ...formData, news_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hết hạn</Label>
                      <Input
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Độ liên quan: {formData.relevance_score}%</Label>
                    <Slider
                      value={[formData.relevance_score]}
                      onValueChange={([v]) => setFormData({ ...formData, relevance_score: v })}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Đánh giá mức độ liên quan với nội dung marketing
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Góc tiếp cận gợi ý</Label>
                    <Textarea
                      value={formData.suggested_angles.join('\n')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        suggested_angles: e.target.value.split('\n') 
                      })}
                      placeholder="Phân tích xu hướng&#10;Case study thực tế&#10;So sánh thị trường"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                      />
                      <span className="text-sm">{formData.is_active ? 'Đang hoạt động' : 'Tắt'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={!formData.title}>
                      {editingNews ? 'Lưu thay đổi' : 'Thêm tin tức'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Tìm kiếm tin tức..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={relevanceFilter} onValueChange={(v) => setRelevanceFilter(v as RelevanceFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Độ liên quan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="high">Cao (≥70%)</SelectItem>
                <SelectItem value="medium">TB (40-69%)</SelectItem>
                <SelectItem value="low">Thấp (&lt;40%)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news_date">Ngày tin</SelectItem>
                <SelectItem value="expires_at">Hết hạn</SelectItem>
                <SelectItem value="relevance_score">Độ liên quan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Đã chọn {selectedIds.length} mục</span>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => handleBulkStatus(true)}>
                  Bật tất cả
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkStatus(false)}>
                  Tắt tất cả
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
                  Xóa
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">Chưa có tin tức nào</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Thêm tin tức để AI có thể tham khảo khi tạo nội dung
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm tin tức đầu tiên
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredNews.length && filteredNews.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Điểm</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNews.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expires_at);
                    const isSelected = selectedIds.includes(item.id);
                    
                    return (
                      <TableRow key={item.id} className={cn(isSelected && "bg-muted/50")}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds([...selectedIds, item.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <div className="flex items-center gap-2">
                              <p className="font-medium line-clamp-1">{item.title}</p>
                              {item.source_url && (
                                <a 
                                  href={item.source_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {item.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.summary}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.news_date), 'dd/MM', { locale: vi })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expiryStatus.badge} className="gap-1">
                            <Clock className="h-3 w-3" />
                            {expiryStatus.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn('font-medium', getScoreColor(item.relevance_score))}>
                            {item.relevance_score}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => handleToggleStatus(item)}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {item.source_url && (
                                <DropdownMenuItem asChild>
                                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Xem nguồn
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Xóa tin tức này?')) {
                                    deleteNews(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
