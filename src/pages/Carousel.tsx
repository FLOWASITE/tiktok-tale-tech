import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarouselForm } from '@/components/CarouselForm';
import { CarouselCard } from '@/components/CarouselCard';
import { CarouselViewer } from '@/components/CarouselViewer';
import { CarouselFilters, CarouselFiltersState } from '@/components/CarouselFilters';
import { CarouselStats } from '@/components/CarouselStats';
import { CarouselListView } from '@/components/CarouselListView';
import { useCarousels } from '@/hooks/useCarousels';
import { Carousel } from '@/types/carousel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Images, Sparkles, Plus, X, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

const CarouselPage = () => {
  const navigate = useNavigate();
  const { carousels, loading, generating, generateCarousel, deleteCarousel, updateCarousel } = useCarousels();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<CarouselFiltersState>({
    search: '',
    platform: 'all',
    aiTool: 'all',
  });

  const filteredCarousels = useMemo(() => {
    return carousels.filter((carousel) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          carousel.title.toLowerCase().includes(searchLower) ||
          carousel.topic.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.platform !== 'all' && carousel.platform !== filters.platform) {
        return false;
      }

      if (filters.aiTool !== 'all' && carousel.ai_tool !== filters.aiTool) {
        return false;
      }

      return true;
    });
  }, [carousels, filters]);

  const handleViewCarousel = (carousel: Carousel) => {
    setSelectedCarousel(carousel);
    setViewerOpen(true);
  };

  const handleGenerateCarousel = async (formData: Parameters<typeof generateCarousel>[0]) => {
    setFormSheetOpen(false);
    const newCarousel = await generateCarousel(formData);
    if (newCarousel) {
      setSelectedCarousel(newCarousel);
      setViewerOpen(true);
    }
  };
  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteCarousel(id);
    }
    toast.success(`Đã xóa ${selectedIds.length} carousel`);
    setSelectedIds([]);
  };

  return (
    <div className="min-h-screen relative">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              Quản lý Carousel Prompt
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredCarousels.length} / {carousels.length} carousel
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => setFormSheetOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm mới
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats Cards */}
        <CarouselStats carousels={carousels} loading={loading} />

        {/* Filters */}
        <CarouselFilters filters={filters} onFiltersChange={setFilters} />

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="gradient-card border-border/50">
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCarousels.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Images className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {carousels.length === 0 ? 'Chưa có carousel nào' : 'Không tìm thấy carousel'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {carousels.length === 0
                ? 'Nhấn nút "Thêm mới" để tạo carousel prompt đầu tiên.'
                : 'Thử thay đổi bộ lọc để xem thêm carousel.'}
            </p>
            {carousels.length === 0 && (
              <Button onClick={() => setFormSheetOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo carousel mới
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <CarouselListView
            carousels={filteredCarousels}
            onView={handleViewCarousel}
            onDelete={deleteCarousel}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCarousels.map((carousel, index) => (
              <div
                key={carousel.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CarouselCard
                  carousel={carousel}
                  onView={handleViewCarousel}
                  onDelete={deleteCarousel}
                />
              </div>
            ))}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-background border border-border/50 rounded-lg shadow-lg">
            <Badge variant="secondary" className="text-xs">
              {selectedIds.length} đã chọn
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs"
            >
              Bỏ chọn
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Xóa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc muốn xóa {selectedIds.length} carousel đã chọn?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Form Panel - Below Header */}
      <SlidePanel
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        title={
          <>
            <Sparkles className="w-5 h-5 text-primary" />
            Tạo Carousel Prompt Mới
          </>
        }
        description="Điền thông tin để AI tạo prompt carousel cho bạn"
        className="md:max-w-xl lg:max-w-2xl"
      >
        <CarouselForm onSubmit={handleGenerateCarousel} isLoading={generating} />
      </SlidePanel>

      {/* Carousel viewer dialog */}
      <CarouselViewer
        carousel={selectedCarousel}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
};

export default CarouselPage;
