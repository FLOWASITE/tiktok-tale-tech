import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CarouselForm } from '@/components/CarouselForm';
import { CarouselCard } from '@/components/CarouselCard';
import { CarouselViewer } from '@/components/CarouselViewer';
import { CarouselFilters, CarouselFiltersState } from '@/components/CarouselFilters';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useCarousels } from '@/hooks/useCarousels';
import { Carousel } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Images, Sparkles } from 'lucide-react';

const CarouselPage = () => {
  const { carousels, loading, generating, generateCarousel, deleteCarousel, updateCarousel } = useCarousels();
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [filters, setFilters] = useState<CarouselFiltersState>({
    search: '',
    platform: 'all',
    aiTool: 'all',
  });

  const filteredCarousels = useMemo(() => {
    return carousels.filter((carousel) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          carousel.title.toLowerCase().includes(searchLower) ||
          carousel.topic.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Platform filter
      if (filters.platform !== 'all' && carousel.platform !== filters.platform) {
        return false;
      }

      // AI Tool filter
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
    const newCarousel = await generateCarousel(formData);
    if (newCarousel) {
      setSelectedCarousel(newCarousel);
      setViewerOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="container py-8 relative">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Left column - Form */}
          <div className="space-y-6">
            <Card className="gradient-card border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg gradient-primary">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Tạo Carousel Mới
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <CarouselForm onSubmit={handleGenerateCarousel} isLoading={generating} />
              </CardContent>
            </Card>
          </div>

          {/* Right column - Carousel list */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Images className="w-5 h-5 text-primary" />
                Carousel Đã Tạo
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredCarousels.length}/{carousels.length})
                </span>
              </h2>
              <SettingsDialog />
            </div>

            {/* Filters */}
            <CarouselFilters filters={filters} onFiltersChange={setFilters} />

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="gradient-card border-border/50">
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/4 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCarousels.length === 0 ? (
              <Card className="gradient-card border-border/50 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Images className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {carousels.length === 0 ? 'Chưa có carousel nào' : 'Không tìm thấy carousel'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {carousels.length === 0
                      ? 'Nhập chủ đề và nhấn "Tạo Prompt Carousel" để bắt đầu'
                      : 'Thử thay đổi bộ lọc để xem thêm carousel'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
                  {filteredCarousels.map((carousel) => (
                    <CarouselCard
                      key={carousel.id}
                      carousel={carousel}
                      onView={handleViewCarousel}
                      onDelete={deleteCarousel}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

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
