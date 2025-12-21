import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarouselForm } from '@/components/CarouselForm';
import { CarouselCard } from '@/components/CarouselCard';
import { CarouselViewer } from '@/components/CarouselViewer';
import { CarouselFilters, CarouselFiltersState } from '@/components/CarouselFilters';
import { useCarousels } from '@/hooks/useCarousels';
import { Carousel } from '@/types/carousel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Images, Sparkles, Plus, X } from 'lucide-react';

const CarouselPage = () => {
  const navigate = useNavigate();
  const { carousels, loading, generating, generateCarousel, deleteCarousel, updateCarousel } = useCarousels();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
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
      </div>

      {/* Form Sheet - Full Screen */}
      <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-full md:max-w-xl lg:max-w-2xl overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Tạo Carousel Prompt Mới
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                Điền thông tin để AI tạo prompt carousel cho bạn
              </p>
            </SheetHeader>
          </div>
          <div className="p-6">
            <CarouselForm onSubmit={handleGenerateCarousel} isLoading={generating} />
          </div>
        </SheetContent>
      </Sheet>

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
