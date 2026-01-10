import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Plus,
  Search,
  FileText,
  Sparkles,
  Layers,
  BarChart3,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCoreContents } from '@/hooks/useCoreContents';
import { CoreContentCard } from './CoreContentCard';
import { CoreContentViewer } from './CoreContentViewer';
import { CoreContentGenerateDialog } from './CoreContentGenerateDialog';
import type { CoreContentStatus, ContentRole, CoreContent, CoreContentStats } from '@/types/coreContent';
import { CORE_CONTENT_STATUSES, CONTENT_ROLES } from '@/types/coreContent';
import { CONTENT_GOALS } from '@/types/multichannel';

export function CoreContentLibrary() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CoreContentStatus | 'all'>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState<CoreContentStats>({
    total: 0,
    draft: 0,
    approved: 0,
    archived: 0,
    avgQualityScore: 0,
    avgWordCount: 0,
    totalDerivedVariants: 0,
  });

  const {
    coreContents,
    isLoading,
    approveCoreContent,
    archiveCoreContent,
    deleteCoreContent,
    getStats,
  } = useCoreContents({
    organizationId: currentOrganization?.id,
    filters: {
      status: statusFilter === 'all' ? undefined : statusFilter,
      contentGoal: goalFilter === 'all' ? undefined : goalFilter as any,
      searchQuery: searchQuery || undefined,
    },
  });

  // Load stats
  useEffect(() => {
    getStats().then((s) => s && setStats(s));
  }, [getStats, coreContents]);

  // Filter contents based on search
  const filteredContents = useMemo(() => {
    if (!coreContents) return [];
    if (!searchQuery) return coreContents;
    const query = searchQuery.toLowerCase();
    return coreContents.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.topic.toLowerCase().includes(query) ||
        c.content?.toLowerCase().includes(query)
    );
  }, [coreContents, searchQuery]);

  const handleApprove = async (id: string) => {
    try {
      await approveCoreContent(id);
      toast.success('Đã phê duyệt Core Content');
    } catch (error) {
      toast.error('Không thể phê duyệt');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveCoreContent(id);
      toast.success('Đã lưu trữ Core Content');
    } catch (error) {
      toast.error('Không thể lưu trữ');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCoreContent(deletingId);
      toast.success('Đã xóa Core Content');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (error) {
      toast.error('Không thể xóa');
    }
  };

  const handleTransform = (id: string) => {
    navigate(`/multichannel/new?coreContentId=${id}`);
  };

  const viewingContent = viewingId ? coreContents.find((c) => c.id === viewingId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Core Content Library</h1>
          <p className="text-muted-foreground">
            Nguồn nội dung gốc (800-2000 từ) làm Single Source of Truth
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Tạo Core Content
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Tổng cộng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Đã duyệt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDerivedVariants}</p>
                <p className="text-xs text-muted-foreground">Variants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BarChart3 className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgQualityScore > 0 ? stats.avgQualityScore.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tiêu đề, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {CORE_CONTENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Mục tiêu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {CONTENT_GOALS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContents.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Chưa có Core Content</h3>
            <p className="text-muted-foreground mb-4">
              Tạo Core Content đầu tiên để làm nguồn nội dung gốc
            </p>
            <Button onClick={() => setGenerateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Tạo Core Content
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContents.map((content) => (
            <CoreContentCard
              key={content.id}
              coreContent={content}
              onView={setViewingId}
              onApprove={handleApprove}
              onArchive={handleArchive}
              onDelete={(id) => {
                setDeletingId(id);
                setDeleteDialogOpen(true);
              }}
              onTransform={handleTransform}
            />
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <CoreContentGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />

      {/* Viewer Sheet */}
      {viewingContent && (
        <CoreContentViewer
          coreContent={viewingContent}
          open={!!viewingId}
          onOpenChange={(open) => !open && setViewingId(null)}
          onApprove={() => handleApprove(viewingContent.id)}
          onArchive={() => handleArchive(viewingContent.id)}
          onTransform={() => handleTransform(viewingContent.id)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa Core Content này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
