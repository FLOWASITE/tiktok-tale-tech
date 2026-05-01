import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Eye,
  EyeOff,
  FileText,
  Tag,
  Route
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
  keywords: string[] | null;
  route_context: string[] | null;
  priority: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: 'brand', label: 'Brand Template' },
  { value: 'content', label: 'Content Creation' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'admin', label: 'Admin' },
  { value: 'general', label: 'General' },
];

const ROUTES = [
  '/',
  '/brands',
  '/brands/new',
  '/topics',
  '/multichannel',
  '/multichannel/new',
  '/calendar',
  '/videos',
  '/carousel',
  '/admin',
  '/admin/ai',
  '/organization',
  '/account',
];

export default function AdminHelpArticles() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    keywords: '',
    route_context: [] as string[],
    priority: 0,
    is_published: true,
  });

  // Fetch articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ['help-articles', search, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('help_articles')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (article: {
      title: string;
      content: string;
      category: string;
      keywords: string[];
      route_context: string[];
      priority: number;
      is_published: boolean;
    }) => {
      if (editingArticle) {
        const { error } = await supabase
          .from('help_articles')
          .update(article)
          .eq('id', editingArticle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert(article);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast.success(editingArticle ? 'Đã cập nhật bài viết' : 'Đã tạo bài viết mới');
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast.success('Đã xóa bài viết');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Toggle published status
  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('help_articles')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast.success('Đã cập nhật trạng thái');
    },
  });

  const openDialog = (article?: HelpArticle) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        content: article.content,
        category: article.category || 'general',
        keywords: (article.keywords || []).join(', '),
        route_context: article.route_context || [],
        priority: article.priority || 0,
        is_published: article.is_published ?? true,
      });
    } else {
      setEditingArticle(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        keywords: '',
        route_context: [],
        priority: 0,
        is_published: true,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingArticle(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Vui lòng điền tiêu đề và nội dung');
      return;
    }

    saveMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      route_context: formData.route_context,
      priority: formData.priority,
      is_published: formData.is_published,
    });
  };

  const toggleRoute = (route: string) => {
    setFormData(prev => ({
      ...prev,
      route_context: prev.route_context.includes(route)
        ? prev.route_context.filter(r => r !== route)
        : [...prev.route_context, route],
    }));
  };

  // Stats
  const stats = {
    total: articles?.length || 0,
    published: articles?.filter(a => a.is_published).length || 0,
    categories: new Set(articles?.map(a => a.category)).size,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Help Articles
          </h1>
          <p className="text-muted-foreground">
            Quản lý bài viết hướng dẫn cho Help Chatbot
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo bài viết
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng bài viết
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đã xuất bản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Danh mục
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bài viết..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : articles?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có bài viết nào</p>
              <Button variant="outline" className="mt-4" onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo bài viết đầu tiên
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Routes</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles?.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="font-medium">{article.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {article.content.substring(0, 80)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(article.route_context || []).slice(0, 2).map(route => (
                          <Badge key={route} variant="secondary" className="text-xs">
                            {route}
                          </Badge>
                        ))}
                        {(article.route_context || []).length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(article.route_context || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{article.priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={article.is_published ?? true}
                          onCheckedChange={(checked) => 
                            togglePublished.mutate({ id: article.id, is_published: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {article.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog(article)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Xóa bài viết này?')) {
                                deleteMutation.mutate(article.id);
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
            </DialogTitle>
            <DialogDescription>
              Bài viết sẽ được AI sử dụng để trả lời câu hỏi người dùng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="VD: Cách tạo Brand Template mới"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Nội dung (Markdown) *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Viết hướng dẫn chi tiết ở đây..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Độ ưu tiên (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Từ khóa (cách nhau bằng dấu phẩy)
              </Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="brand, template, tạo mới, hướng dẫn"
              />
            </div>

            {/* Route Context */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Routes liên quan
              </Label>
              <div className="flex flex-wrap gap-2">
                {ROUTES.map(route => (
                  <Badge
                    key={route}
                    variant={formData.route_context.includes(route) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleRoute(route)}
                  >
                    {route}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Published */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label>Xuất bản ngay</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Đang lưu...' : (editingArticle ? 'Cập nhật' : 'Tạo mới')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
