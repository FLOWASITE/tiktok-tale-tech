import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CarouselForm } from '@/components/CarouselForm';
import { CarouselCard } from '@/components/CarouselCard';
import { CarouselViewer } from '@/components/CarouselViewer';
import { CarouselGalleryView } from '@/components/carousel/CarouselGalleryView';
import { CarouselFilters, CarouselFiltersState } from '@/components/CarouselFilters';
import { CarouselHeroSection } from '@/components/carousel/CarouselHeroSection';
import { CarouselListView } from '@/components/CarouselListView';
import { useCarousels } from '@/hooks/useCarousels';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { useCarouselCardImages } from '@/hooks/useCarouselCardImages';
import { Carousel } from '@/types/carousel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Images, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Wand2, ArrowLeft } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';

interface LocationState {
  prefillTopic?: string;
  topicHistoryId?: string;
}

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

const CarouselPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state as LocationState | null;
  const { carousels, loading, generating, generateCarousel, deleteCarousel, updateCarousel, refetch } = useCarousels();
  
  // Fetch creator profiles for all carousels
  const userIds = useMemo(() => carousels.map(c => c.user_id), [carousels]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);
  
  const [selectedCarousel, setSelectedCarousel] = useState<Carousel | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [initialTopic, setInitialTopic] = useState<string>('');
  const [topicHistoryId, setTopicHistoryId] = useState<string | undefined>();
  const [autoGenerateImages, setAutoGenerateImages] = useState(false);

  // Topic Content Links hook
  const { createLink } = useTopicContentLinks({ enabled: false });

  // Handle prefill from Topics Hub
  useEffect(() => {
    if (prefillData?.prefillTopic) {
      setInitialTopic(prefillData.prefillTopic);
      if (prefillData.topicHistoryId) {
        setTopicHistoryId(prefillData.topicHistoryId);
      }
      setFormSheetOpen(true);
      // Clear location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [prefillData]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showGallery, setShowGallery] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<CarouselFiltersState>({
    search: '',
    platform: 'all',
    aiTool: 'all',
    status: 'all',
    carouselStyle: 'all',
  });
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc'>('newest');

  // Fetch thumbnail images
  const carouselIds = useMemo(() => carousels.map(c => c.id), [carousels]);
  const { imageMap } = useCarouselCardImages(carouselIds);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const filteredCarousels = useMemo(() => {
    let result = carousels.filter((carousel) => {
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

      if (filters.status !== 'all' && carousel.status !== filters.status) {
        return false;
      }

      if (filters.carouselStyle !== 'all' && carousel.carousel_style !== filters.carouselStyle) {
        return false;
      }

      if (campaignFilter && carousel.campaign_id !== campaignFilter) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return a.title.localeCompare(b.title, 'vi');
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [carousels, filters, campaignFilter, sortBy]);

  // Paginated carousels
  const paginatedCarousels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredCarousels.slice(start, end);
  }, [filteredCarousels, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCarousels.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleViewCarousel = (carousel: Carousel) => {
    setSelectedCarousel(carousel);
    setViewerOpen(true);
  };

  const handleGenerateCarousel = async (formData: Parameters<typeof generateCarousel>[0]) => {
    setFormSheetOpen(false);
    const newCarousel = await generateCarousel(formData);
    if (newCarousel) {
      // Create topic-to-content link if came from Topics Hub
      if (formData.topicHistoryId) {
        try {
          await createLink(
            formData.topicHistoryId,
            newCarousel.id,
            'carousel',
            newCarousel.title,
            newCarousel.status
          );
        } catch (error) {
          console.error('Failed to create topic-content link:', error);
        }
        // Clear topicHistoryId after use
        setTopicHistoryId(undefined);
      }
      
      setSelectedCarousel(newCarousel);
      setAutoGenerateImages(formData.autoGenerateImages || false);
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

  if (formSheetOpen) {
    return (
      <div className="min-h-screen relative bg-gradient-to-b from-background via-background to-muted/20">
        <div className="p-3 sm:p-6 space-y-6">
          {/* Header bar */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormSheetOpen(false)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Tạo Carousel mới</h1>
                <p className="text-xs text-muted-foreground">Nhập chủ đề và tùy chỉnh phong cách để AI tạo carousel chuyên nghiệp</p>
              </div>
            </div>
          </div>

          {/* Form centered */}
          <div className="max-w-2xl mx-auto">
            <CarouselForm onSubmit={handleGenerateCarousel} isLoading={generating} initialTopic={initialTopic} topicHistoryId={topicHistoryId} />
          </div>
        </div>

        {/* Carousel viewer dialog */}
        <CarouselViewer
          carousel={selectedCarousel}
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setAutoGenerateImages(false);
          }}
          onCarouselUpdate={(updated) => {
            updateCarousel(updated);
            setSelectedCarousel(updated);
          }}
          autoGenerateImages={autoGenerateImages}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-background via-background to-muted/20">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Hero Section */}
        <CarouselHeroSection
          carousels={carousels}
          loading={loading}
          viewMode={viewMode}
          showGallery={showGallery}
          onViewModeChange={setViewMode}
          onToggleGallery={() => setShowGallery(prev => !prev)}
          onRefresh={refetch}
          onCreateNew={() => setFormSheetOpen(true)}
        />

        {showGallery ? (
          <CarouselGalleryView />
        ) : (
          <>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <CarouselFilters filters={filters} onFiltersChange={setFilters} />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-xs border-border/50">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mới nhất</SelectItem>
                <SelectItem value="oldest">Cũ nhất</SelectItem>
                <SelectItem value="name_asc">Tên A-Z</SelectItem>
              </SelectContent>
            </Select>
            <CampaignSelector
              value={campaignFilter}
              onValueChange={setCampaignFilter}
              placeholder="Lọc theo chiến dịch"
              className="w-full sm:w-56"
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-background/95 backdrop-blur border border-border/50 rounded-xl shadow-xl"
          >
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
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
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
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
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="border-border/50 overflow-hidden">
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCarousels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-6">
              <Images className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {carousels.length === 0 ? 'Chưa có carousel nào' : 'Không tìm thấy carousel'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              {carousels.length === 0
                ? 'Nhấn nút "Thêm mới" để tạo carousel prompt đầu tiên.'
                : 'Thử thay đổi bộ lọc để xem thêm carousel.'}
            </p>
            {carousels.length === 0 && (
              <Button 
                onClick={() => setFormSheetOpen(true)} 
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                <Plus className="w-4 h-4" />
                Tạo carousel mới
              </Button>
            )}
          </motion.div>
        ) : viewMode === 'list' ? (
          <CarouselListView
            carousels={paginatedCarousels}
            onView={handleViewCarousel}
            onDelete={deleteCarousel}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {paginatedCarousels.map((carousel, index) => (
              <CarouselCard
                key={carousel.id}
                carousel={carousel}
                onView={handleViewCarousel}
                onDelete={deleteCarousel}
                isSelected={selectedIds.includes(carousel.id)}
                onSelectionChange={(id, selected) => {
                  if (selected) {
                    setSelectedIds(prev => [...prev, id]);
                  } else {
                    setSelectedIds(prev => prev.filter(i => i !== id));
                  }
                }}
                creatorProfile={carousel.user_id ? creatorProfiles[carousel.user_id] : undefined}
                isLoadingProfile={isLoadingProfiles}
                index={index}
                thumbnailUrl={imageMap[carousel.id]?.thumbnailUrl}
                imageCount={imageMap[carousel.id]?.imageCount}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredCarousels.length > itemsPerPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Hiển thị</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => {
                  setItemsPerPage(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>/ {filteredCarousels.length} carousel</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 border-border/50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      currentPage === pageNum 
                        ? 'bg-primary text-primary-foreground' 
                        : 'border-border/50'
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 border-border/50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
          </>
        )}
      </div>

      {/* Form Panel */}
      <SlidePanel
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        title={
          <>
            <Wand2 className="w-5 h-5 text-primary" />
            Tạo Carousel mới
          </>
        }
        description="Nhập chủ đề và tùy chỉnh phong cách để AI tạo carousel chuyên nghiệp"
        className="md:max-w-xl lg:max-w-2xl"
      >
        <CarouselForm onSubmit={handleGenerateCarousel} isLoading={generating} initialTopic={initialTopic} topicHistoryId={topicHistoryId} />
      </SlidePanel>

      {/* Carousel viewer dialog */}
      <CarouselViewer
        carousel={selectedCarousel}
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) setAutoGenerateImages(false);
        }}
        onCarouselUpdate={(updated) => {
          updateCarousel(updated);
          setSelectedCarousel(updated);
        }}
        autoGenerateImages={autoGenerateImages}
      />
    </div>
  );
};

export default CarouselPage;
