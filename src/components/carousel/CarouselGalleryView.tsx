import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Image as ImageIcon, Filter, Layers, Search, CheckSquare, X, ArrowUpDown, Grid2X2, Grid3X3, LayoutGrid, RotateCcw, SearchX, User, ChevronLeft, FolderOpen, Share2, ImagePlus } from 'lucide-react';
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
import { useCarouselGallery, SortBy, ContentFolder } from '@/hooks/useCarouselGallery';
import { ChannelIcon, getChannelLabel } from '@/components/multichannel/streaming/ChannelIcon';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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

const folderGridClasses: Record<GridSize, string> = {
  compact: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  normal: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
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

interface CarouselGalleryViewProps {
  initialContentId?: string;
}

export function CarouselGalleryView({ initialContentId }: CarouselGalleryViewProps) {
  const {
    images,
    allImages,
    loading,
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
    channelOptions,
    sourceCounts,
    deleteImage,
    bulkDelete,
    // Folder-level
    contentFolders,
    selectedFolderId,
    setSelectedFolderId,
    selectedFolder,
    folderImages,
    getImageIdsForFolder,
    setCarouselFilter,
  } = useCarouselGallery();

  // Auto-select folder from initialContentId prop
  useEffect(() => {
    if (initialContentId) {
      setSelectedFolderId(initialContentId);
    }
  }, [initialContentId, setSelectedFolderId]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [gridSize, setGridSize] = useState<GridSize>('normal');
  const [page, setPage] = useState(1);
  const [bulkMode, setBulkMode] = useState(false);

  const isInsideFolder = selectedFolderId !== null;
  const displayImages = isInsideFolder ? folderImages : images;

  const hasActiveFilters = sourceFilter !== 'all' || channelFilter !== 'all' || creatorFilter !== 'all' || searchQuery.trim() !== '';

  const resetAllFilters = useCallback(() => {
    setSourceFilter('all');
    setChannelFilter('all');
    setCarouselFilter('all');
    setCreatorFilter('all');
    setSearchQuery('');
    setPage(1);
  }, [setSourceFilter, setChannelFilter, setCarouselFilter, setCreatorFilter, setSearchQuery]);

  const handleBackToFolders = useCallback(() => {
    setSelectedFolderId(null);
    setBulkMode(false);
    clearSelection();
    setPage(1);
  }, [setSelectedFolderId, clearSelection]);

  const visibleImages = useMemo(() => displayImages.slice(0, page * PAGE_SIZE), [displayImages, page]);
  const hasMore = displayImages.length > page * PAGE_SIZE;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-border/50">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
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
        {/* Breadcrumb for inside-folder */}
        {isInsideFolder && selectedFolder && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={handleBackToFolders}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={handleBackToFolders}>
                    Gallery
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    {selectedFolder.source === 'carousel' ? (
                      <Layers className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {selectedFolder.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Badge variant="secondary" className="text-xs ml-auto">
              {folderImages.length} ảnh
            </Badge>
          </div>
        )}

        {/* Search + Sort row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isInsideFolder ? "Tìm trong folder..." : "Tìm theo tên nội dung..."}
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
            <SelectTrigger className="w-[140px] h-9 text-sm border-border/50">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
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

          {isInsideFolder && (
            <Button
              variant={bulkMode ? 'default' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => { setBulkMode(!bulkMode); if (bulkMode) clearSelection(); }}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Chọn
            </Button>
          )}
        </div>

        {/* Filter bar — only at folder level */}
        {!isInsideFolder && (
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

            {creatorOptions.length > 0 && (
              <Select value={creatorFilter} onValueChange={v => { setCreatorFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-9 text-sm border-border/50">
                  <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue>
                    {creatorFilter === 'all' ? 'Tất cả người tạo' : creatorFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả người tạo</SelectItem>
                  {creatorOptions.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Badge variant="secondary" className="text-xs">
              {contentFolders.length} nội dung
            </Badge>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={resetAllFilters}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        )}

        {/* Bulk action toolbar */}
        {bulkMode && isInsideFolder && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
            <Badge variant="default" className="text-xs">{selectedIds.size} đã chọn</Badge>
            <Button variant="outline" size="sm" onClick={selectAll} className="h-7 text-xs">
              Chọn tất cả ({displayImages.length})
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

        {/* CONTENT AREA */}
        {!isInsideFolder ? (
          /* ===== FOLDER VIEW (Level 1) ===== */
          contentFolders.length === 0 && hasActiveFilters ? (
            <EmptyFilterState onReset={resetAllFilters} />
          ) : contentFolders.length === 0 && allImages.length === 0 ? (
            <EmptyGalleryState />
          ) : (
            <div className={`grid ${folderGridClasses[gridSize]} gap-4`}>
              {contentFolders.map((folder, index) => (
                <ContentFolderCard
                  key={folder.id}
                  folder={folder}
                  index={index}
                  onClick={() => { setSelectedFolderId(folder.id); setPage(1); }}
                />
              ))}
            </div>
          )
        ) : (
          /* ===== IMAGE VIEW (Level 2 — inside folder) ===== */
          displayImages.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Folder trống</h3>
              <p className="text-sm text-muted-foreground">Chưa có ảnh nào trong nội dung này.</p>
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
                    Tải thêm ({displayImages.length - page * PAGE_SIZE} ảnh còn lại)
                  </Button>
                </div>
              )}
            </>
          )
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

/* ===== Content Folder Card ===== */
function ContentFolderCard({
  folder,
  index,
  onClick,
}: {
  folder: ContentFolder;
  index: number;
  onClick: () => void;
}) {
  const hasMosaic = folder.thumbnailUrls.length >= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card
        className="group overflow-hidden border-border/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
        onClick={onClick}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
          {hasMosaic ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
              {folder.thumbnailUrls.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <img
              src={folder.thumbnailUrls[0]}
              alt={folder.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          )}

          {/* Image count badge */}
          <div className="absolute bottom-2 right-2">
            <Badge className="text-[10px] h-5 bg-background/85 text-foreground border-border/50 backdrop-blur-sm" variant="outline">
              <ImagePlus className="w-3 h-3 mr-0.5" />
              {folder.imageCount}
            </Badge>
          </div>

          {/* Source badge */}
          <div className="absolute top-2 left-2">
            {folder.source === 'carousel' ? (
              <Badge className="text-[10px] h-5 bg-primary/90 text-primary-foreground" variant="default">
                <Layers className="w-3 h-3 mr-0.5" />
                Carousel
              </Badge>
            ) : folder.channel ? (
              <ChannelIcon channel={folder.channel} size="sm" />
            ) : (
              <Badge className="text-[10px] h-5 bg-emerald-500/90 text-white" variant="default">
                <Share2 className="w-3 h-3 mr-0.5" />
                Multi
              </Badge>
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                <FolderOpen className="w-5 h-5 text-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <p className="text-sm font-medium text-foreground truncate" title={folder.title}>
            {folder.title}
          </p>

          <div className="flex items-center gap-1.5">
            {folder.createdByAvatar ? (
              <img src={folder.createdByAvatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
            )}
            <span className="text-[11px] text-muted-foreground truncate">
              {folder.createdByName || 'Ẩn danh'}
            </span>
            {folder.brandName && (
              <>
                <span className="text-[10px] text-muted-foreground/50">·</span>
                {folder.brandLogoUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <img src={folder.brandLogoUrl} alt={folder.brandName} className="w-4 h-4 rounded object-contain flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{folder.brandName}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-[10px] text-muted-foreground truncate">{folder.brandName}</span>
                )}
              </>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">
            {formatRelativeTime(folder.latestDate)}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

/* ===== Empty States ===== */
function EmptyFilterState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
        <SearchX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Không tìm thấy kết quả</h3>
      <p className="text-sm text-muted-foreground mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
        Xóa bộ lọc
      </Button>
    </motion.div>
  );
}

function EmptyGalleryState() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có ảnh nào</h3>
      <p className="text-sm text-muted-foreground">Tạo nội dung và generate ảnh để xem tại đây.</p>
    </motion.div>
  );
}

/* ===== Gallery Image Card (existing, preserved) ===== */
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

          {bulkMode && (
            <div className="absolute top-1.5 right-1.5 z-10" onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect()}
                className="h-5 w-5 bg-background/80 border-border"
              />
            </div>
          )}

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
              <p className="text-xs font-medium text-foreground truncate">
                {img.source === 'carousel' ? `Slide ${img.slideNumber}` : getChannelLabel(img.channel || '')}
              </p>

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
                  {img.createdByName && img.isOrgMember === false && (
                    <span className="ml-0.5 text-amber-500 font-medium">(QTV)</span>
                  )}
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground">
                {formatRelativeTime(img.createdAt)}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px]">
            <p className="text-xs font-medium">{img.carouselTitle}</p>
            {img.createdByName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tạo bởi: {img.createdByName}
                {img.isOrgMember === false && <span className="text-amber-500 font-medium"> (Quản trị viên)</span>}
              </p>
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
