import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CuratedNews } from '@/types/curatedData';
import { cn } from '@/lib/utils';

export default function AdminIndustryNews() {
  const { news, isLoading, createNews, updateNews, deleteNews } = useCuratedNews();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<CuratedNews | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex items-center gap-3">
        <Link to="/admin">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách tin tức ({news.length})</CardTitle>
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

                  <div className="space-y-2">
                    <Label>URL nguồn</Label>
                    <Input
                      type="url"
                      value={formData.source_url}
                      onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                      placeholder="https://example.com/article"
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
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Tìm kiếm tin tức..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Độ liên quan</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Không có tin tức nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNews.map((item) => {
                      const expiryStatus = getExpiryStatus(item.expires_at);
                      
                      return (
                        <TableRow key={item.id}>
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
                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Xóa tin tức này?')) {
                                    deleteNews(item.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
