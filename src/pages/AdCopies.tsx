import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, Search, Filter, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdCopies } from '@/hooks/useAdCopies';
import { AdCopyCard } from '@/components/adcopy/AdCopyCard';
import { AdCopyFormDialog } from '@/components/adcopy/AdCopyFormDialog';
import { AdCopyViewer } from '@/components/adcopy/AdCopyViewer';
import { AD_PLATFORMS, AD_OBJECTIVES, AD_COPY_STATUSES, type AdCopy } from '@/types/adCopy';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function AdCopies() {
  const { adCopies, isLoading, generating, generateAdCopy, deleteAdCopy, fetchAdCopyDetail } = useAdCopies();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAdCopy, setSelectedAdCopy] = useState<AdCopy | null>(null);

  // Filter ad copies
  const filteredAdCopies = adCopies.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ad.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || ad.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const handleView = async (adCopy: AdCopy) => {
    const detail = await fetchAdCopyDetail(adCopy.id);
    if (detail) {
      setSelectedAdCopy(detail);
      setViewerOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa ad copy này?')) {
      deleteAdCopy(id);
    }
  };

  // Stats
  const stats = {
    total: adCopies.length,
    draft: adCopies.filter(a => a.status === 'draft').length,
    approved: adCopies.filter(a => a.status === 'approved').length,
    published: adCopies.filter(a => a.status === 'published').length,
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-border/50 p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Ad Copies</h1>
              <p className="text-muted-foreground">Tạo quảng cáo chuyển đổi cao cho Meta & Google</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-sm text-muted-foreground">Tổng</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <span className="text-2xl font-bold text-yellow-500">{stats.draft}</span>
              <span className="text-sm text-muted-foreground">Nháp</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <span className="text-2xl font-bold text-green-500">{stats.approved}</span>
              <span className="text-sm text-muted-foreground">Đã duyệt</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <span className="text-2xl font-bold text-blue-500">{stats.published}</span>
              <span className="text-sm text-muted-foreground">Đã xuất bản</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm ad copy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {AD_PLATFORMS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {AD_COPY_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo Ad Copy
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredAdCopies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chưa có ad copy nào</h3>
          <p className="text-muted-foreground mb-4">
            Tạo ad copy đầu tiên để bắt đầu chạy quảng cáo
          </p>
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo Ad Copy
          </Button>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}>
          {filteredAdCopies.map((adCopy) => (
            <AdCopyCard
              key={adCopy.id}
              adCopy={adCopy}
              viewMode={viewMode}
              onView={() => handleView(adCopy)}
              onDelete={() => handleDelete(adCopy.id)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AdCopyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (data) => {
          const result = await generateAdCopy(data);
          if (result) {
            setFormOpen(false);
            setSelectedAdCopy(result);
            setViewerOpen(true);
          }
        }}
        isGenerating={generating}
      />

      {/* Viewer Dialog */}
      {selectedAdCopy && (
        <AdCopyViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          adCopy={selectedAdCopy}
        />
      )}
    </div>
  );
}
