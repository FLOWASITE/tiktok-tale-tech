import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Image as ImageIcon, Filter, Layers, Search, CheckSquare, X, ArrowUpDown, Grid2X2, Grid3X3, LayoutGrid, RotateCcw, SearchX, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageLightbox, LightboxImage } from '@/components/ui/ImageLightbox';
import { useCarouselGallery, SortBy } from '@/hooks/useCarouselGallery';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
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

const PAGE_SIZE = 30;

type GridSize = 'compact' | 'normal' | 'large';

const gridClasses: Record<GridSize, string> = {
  compact: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  normal: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  return date.toLocaleDateString('vi-VN');
}

export function CarouselGalleryView() {
  const {
    images,
    allImages,
    loading,
    carouselFilter,
    setCarouselFilter,
    sourceFilter,
    setSourceFilter,
    channelFilter,
    setChannelFilter,
    creatorFilter,
    setCreatorFilter,
    creatorOptions,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    carouselOptions,
    channelOptions,
    sourceCounts,
    deleteImage,
    bulkDelete,
  } = useCarouselGallery();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [gridSize, setGridSize] = useState<GridSize>('normal');
  const [page, setPage] = useState(1);
  const [bulkMode, setBulkMode] = useState(false);

  const hasActiveFilters = sourceFilter !== 'all' || channelFilter !== 'all' || carouselFilter !== 'all' || creatorFilter !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = useCallback(() => {
    setSourceFilter('all');
    setChannelFilter('all');
    setCarouselFilter('all');
    setSearchQuery('');
    setPage(1);
  }, [setSourceFilter, setChannelFilter, setCarouselFilter, setSearchQuery]);

  const visibleImages = useMemo(() => images.slice(0, page * PAGE_SIZE), [images, page]);
  const hasMore = images.length > page * PAGE_SIZE;

  const lightboxImages: LightboxImage[] = visibleImages.map(img => ({
    imageUrl: img.imageUrl,
    channel: img.channel || 'carousel',
    channelLabel: img.source === 'carousel'
      ? `${img.carouselTitle} — Slide ${img.slideNumber}`
      : `${img.carouselTitle} — ${getChannelLabel(img.channel || '')}`,
    aspectRatio: undefined,
  }));

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleDownload = useCallback(async (index: number) => {
    const img = visibleImages[index];
    if (!img) return;
    const prefix = img.source === 'carousel' ? 'carousel' : (img.channel || 'image');
    try {
      const response = await fetch(img.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-v${img.version}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(img.imageUrl, '_blank');
    }
  }, [visibleImages]);

  const handleBulkDownload = useCallback(async () => {
    const selected = visibleImages.filter(i => selectedIds.has(i.id));
    for (const img of selected) {
      try {
        const response = await fetch(img.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${img.source}-v${img.version}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* skip */ }
    }
  }, [visibleImages, selectedIds]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/50">
            <Skeleton className="aspect-square w-full" />
            <div className="p-2">
              <Skeleton className="h-3 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Search + Sort row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên nội dung..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[160px] h-9 text-sm border-border/50">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
              <SelectItem value="creator">Người tạo A-Z</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup type="single" value={gridSize} onValueChange={v => v && setGridSize(v as GridSize)} className="border border-border/50 rounded-md p-0.5">
            <ToggleGroupItem value="compact" className="h-7 w-7 p-0" aria-label="Compact">
              <Grid3X3 className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="normal" className="h-7 w-7 p-0" aria-label="Normal">
              <Grid2X2 className="w-3.5 h-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="large" className="h-7 w-7 p-0" aria-label="Large">
              <LayoutGrid className="w-3.5 h-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => { setBulkMode(!bulkMode); if (bulkMode) clearSelection(); }}
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
            Chọn
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setChannelFilter('all'); setCarouselFilter('all'); setPage(1); }}>
            <SelectTrigger className="w-[200px] h-9 text-sm border-border/50">
              <SelectValue>
                {sourceFilter === 'all' ? `Tất cả nguồn (${sourceCounts.all})` :
                 sourceFilter === 'carousel' ? `Carousel (${sourceCounts.carousel})` :
                 `Multichannel (${sourceCounts.multichannel})`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn ({sourceCounts.all})</SelectItem>
              <SelectItem value="carousel">Carousel ({sourceCounts.carousel})</SelectItem>
              <SelectItem value="multichannel">Multichannel ({sourceCounts.multichannel})</SelectItem>
            </SelectContent>
          </Select>

          {sourceFilter !== 'carousel' && channelOptions.length > 0 && (
            <Select value={channelFilter} onValueChange={v => { setChannelFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 text-sm border-border/50">
                <SelectValue>
                  {channelFilter === 'all' ? 'Tất cả kênh' : getChannelLabel(channelFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kênh</SelectItem>
                {channelOptions.map(ch => (
                  <SelectItem key={ch} value={ch} textValue={getChannelLabel(ch)}>
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={ch} size="sm" />
                      <span>{getChannelLabel(ch)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {carouselOptions.length > 0 && (
            <Select value={carouselFilter} onValueChange={v => { setCarouselFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[220px] h-9 text-sm border-border/50">
                <SelectValue>
                  {carouselFilter === 'all' ? 'Tất cả nội dung' : carouselOptions.find(o => o.id === carouselFilter)?.title || 'Tất cả nội dung'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nội dung</SelectItem>
                {carouselOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Badge variant="secondary" className="text-xs">
            {images.length} ảnh
          </Badge>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={resetAllFilters}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Bulk action toolbar — always visible in bulk mode */}
        {bulkMode && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <Badge variant="default" className="text-xs">{selectedIds.size} đã chọn</Badge>
            <Button variant="outline" size="sm" onClick={selectAll} className="h-7 text-xs">
              Chọn tất cả ({images.length})
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" /> Bỏ chọn
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleBulkDownload} className="h-7 text-xs" disabled={selectedIds.size === 0}>
              <Download className="w-3 h-3 mr-1" /> Tải về
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={selectedIds.size === 0}>
                  <Trash2 className="w-3 h-3 mr-1" /> Xóa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa {selectedIds.size} ảnh?</AlertDialogTitle>
                  <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkDelete(Array.from(selectedIds))}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Xóa {selectedIds.size} ảnh
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Empty states */}
        {images.length === 0 && hasActiveFilters ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
              <SearchX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Không tìm thấy kết quả</h3>
            <p className="text-sm text-muted-foreground mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            <Button variant="outline" size="sm" onClick={resetAllFilters}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Xóa bộ lọc
            </Button>
          </motion.div>
        ) : images.length === 0 && allImages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có ảnh nào</h3>
            <p className="text-sm text-muted-foreground">Tạo nội dung và generate ảnh để xem tại đây.</p>
          </motion.div>
        ) : (
          <>
            <div className={`grid ${gridClasses[gridSize]} gap-3`}>
              {visibleImages.map((img, index) => (
                <GalleryImageCard
                  key={img.id}
                  img={img}
                  index={index}
                  bulkMode={bulkMode}
                  isSelected={selectedIds.has(img.id)}
                  onToggleSelect={() => toggleSelect(img.id)}
                  onOpenLightbox={openLightbox}
                  onDownload={handleDownload}
                  onDelete={deleteImage}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                  Tải thêm ({images.length - page * PAGE_SIZE} ảnh còn lại)
                </Button>
              </div>
            )}
          </>
        )}

        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
          onDownload={handleDownload}
        />
      </div>
    </TooltipProvider>
  );
}

function GalleryImageCard({
  img,
  index,
  bulkMode,
  isSelected,
  onToggleSelect,
  onOpenLightbox,
  onDownload,
  onDelete,
}: {
  img: ReturnType<typeof useCarouselGallery>['images'][number];
  index: number;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenLightbox: (i: number) => void;
  onDownload: (i: number) => void;
  onDelete: (id: string) => void;
}) {
  const fullTitle = `${img.carouselTitle} — ${img.source === 'carousel' ? `Slide ${img.slideNumber}` : getChannelLabel(img.channel || '')}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
    >
      <Card className={`group overflow-hidden border-border/50 transition-all duration-200 hover:shadow-md hover:border-primary/30 ${isSelected ? 'ring-2 ring-primary border-primary/50' : ''}`}>
        <div
          className="relative aspect-square cursor-pointer overflow-hidden bg-muted/30"
          onClick={() => bulkMode ? onToggleSelect() : onOpenLightbox(index)}
        >
          <img
            src={img.imageUrl}
            alt={fullTitle}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Bulk checkbox */}
          {bulkMode && (
            <div className="absolute top-1.5 right-1.5 z-10" onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect()}
                className="h-5 w-5 bg-background/80 border-border"
              />
            </div>
          )}

          {/* Overlay actions (non-bulk) */}
          {!bulkMode && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-background/90 hover:bg-background"
                  onClick={(e) => { e.stopPropagation(); onDownload(index); }}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-background/90 hover:bg-destructive/90 hover:text-destructive-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle>
                      <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(img.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Source badge */}
          {img.source === 'multichannel' && img.channel && (
            <div className="absolute top-1.5 left-1.5">
              <ChannelIcon channel={img.channel} size="sm" />
            </div>
          )}
          {img.source === 'carousel' && (
            <Badge className="absolute top-1.5 left-1.5 text-[10px] h-5 bg-primary/90 text-primary-foreground" variant="default">
              <Layers className="w-3 h-3 mr-0.5" />
              S{img.slideNumber}
            </Badge>
          )}

          {img.version > 1 && !bulkMode && (
            <Badge className="absolute top-1.5 right-1.5 text-[10px] h-5 bg-background/80 text-foreground border-border/50" variant="outline">
              v{img.version}
            </Badge>
          )}
          {img.isSelected && (
            <Badge className="absolute bottom-1.5 left-1.5 text-[10px] h-5 bg-primary/90 text-primary-foreground">
              Đang dùng
            </Badge>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-2 space-y-1.5">
              <p className="text-xs font-medium text-foreground truncate">{img.carouselTitle}</p>
              
              {/* User & Brand row */}
              <div className="flex items-center gap-1.5">
                {img.createdByAvatar ? (
                  <img src={img.createdByAvatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground truncate">
                  {img.createdByName || img.createdByEmail?.split('@')[0] || 'Ẩn danh'}
                </span>
                {img.brandName && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    {img.brandLogoUrl ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <img src={img.brandLogoUrl} alt={img.brandName} className="w-4 h-4 rounded object-contain flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{img.brandName}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-[10px] text-muted-foreground truncate">{img.brandName}</span>
                    )}
                  </>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground">
                {img.source === 'multichannel' && img.channel ? getChannelLabel(img.channel) + ' · ' : ''}
                {formatRelativeTime(img.createdAt)}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            <p className="text-xs font-medium">{img.carouselTitle}</p>
            {img.createdByName && (
              <p className="text-xs text-muted-foreground mt-0.5">Tạo bởi: {img.createdByName}</p>
            )}
            {img.brandName && (
              <p className="text-xs text-muted-foreground">Brand: {img.brandName}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {img.source === 'carousel' ? `Carousel · Slide ${img.slideNumber}` : getChannelLabel(img.channel || '')}
              {' · v'}{img.version} · {new Date(img.createdAt).toLocaleString('vi-VN')}
            </p>
          </TooltipContent>
        </Tooltip>
      </Card>
    </motion.div>
  );
}
