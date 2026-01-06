import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdCopies } from '@/hooks/useAdCopies';
import { AdCopyCard } from '@/components/adcopy/AdCopyCard';
import { AdCopyHeroSection } from '@/components/adcopy/AdCopyHeroSection';
import { AdCopyFilters, DatePreset, SortOption } from '@/components/adcopy/AdCopyFilters';
import { AdCopyFormDialog } from '@/components/adcopy/AdCopyFormDialog';
import { LazyAdCopyViewer } from '@/components/adcopy/LazyAdCopyViewer';
import type { AdCopy } from '@/types/adCopy';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { subDays, isAfter, startOfDay } from 'date-fns';

const ITEMS_PER_PAGE = 12;

export default function AdCopies() {
  const navigate = useNavigate();
  const { adCopies, isLoading, generating, generateAdCopy, deleteAdCopy, fetchAdCopyDetail, duplicateAdCopy } = useAdCopies();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all');
  const [funnelFilter, setFunnelFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('created_desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAdCopy, setSelectedAdCopy] = useState<AdCopy | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Get unique campaigns and brands for filter dropdowns
  const { campaigns, brands } = useMemo(() => {
    const campaignMap = new Map<string, string>();
    const brandMap = new Map<string, string>();
    
    adCopies.forEach(ad => {
      if (ad.campaign?.id && ad.campaign?.name) {
        campaignMap.set(ad.campaign.id, ad.campaign.name);
      }
      // Use brand_template_id as the key since id isn't selected
      if (ad.brand_template_id && ad.brand_template?.brand_name) {
        brandMap.set(ad.brand_template_id, ad.brand_template.brand_name);
      }
    });
    
    return {
      campaigns: Array.from(campaignMap.entries()).map(([id, name]) => ({ id, name })),
      brands: Array.from(brandMap.entries()).map(([id, brand_name]) => ({ id, brand_name })),
    };
  }, [adCopies]);

  // Get date filter cutoff
  const getDateCutoff = (preset: DatePreset): Date | null => {
    const now = new Date();
    switch (preset) {
      case 'today':
        return startOfDay(now);
      case '7days':
        return subDays(now, 7);
      case '30days':
        return subDays(now, 30);
      case '90days':
        return subDays(now, 90);
      default:
        return null;
    }
  };

  // Filter and sort ad copies
  const filteredAdCopies = useMemo(() => {
    const dateCutoff = getDateCutoff(datePreset);
    
    let result = adCopies.filter(ad => {
      const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           ad.topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || ad.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
      const matchesObjective = objectiveFilter === 'all' || ad.objective === objectiveFilter;
      const matchesFunnel = funnelFilter === 'all' || ad.funnel_stage === funnelFilter;
      const matchesCampaign = campaignFilter === 'all' || ad.campaign?.id === campaignFilter;
      const matchesBrand = brandFilter === 'all' || ad.brand_template_id === brandFilter;
      const matchesDate = !dateCutoff || (ad.created_at && isAfter(new Date(ad.created_at), dateCutoff));
      
      return matchesSearch && matchesPlatform && matchesStatus && matchesObjective && matchesFunnel && matchesCampaign && matchesBrand && matchesDate;
    });
    
    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'created_desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'created_asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'status':
          const statusOrder = ['published', 'approved', 'review', 'draft'];
          return statusOrder.indexOf(a.status || 'draft') - statusOrder.indexOf(b.status || 'draft');
        case 'platform':
          return a.platform.localeCompare(b.platform);
        case 'variations':
          return (b.variations?.length || 0) - (a.variations?.length || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [adCopies, searchQuery, platformFilter, statusFilter, objectiveFilter, funnelFilter, datePreset, campaignFilter, brandFilter, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredAdCopies.length / ITEMS_PER_PAGE);
  const paginatedAdCopies = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdCopies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdCopies, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  // Memoized handlers
  const handleView = useCallback(async (adCopy: AdCopy) => {
    setIsLoadingDetail(true);
    setViewerOpen(true);
    try {
      const detail = await fetchAdCopyDetail(adCopy.id);
      if (detail) {
        setSelectedAdCopy(detail);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }, [fetchAdCopyDetail]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Bạn có chắc muốn xóa ad copy này?')) {
      deleteAdCopy(id);
    }
  }, [deleteAdCopy]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateAdCopy(id);
  }, [duplicateAdCopy]);

  // Bulk actions handlers
  const handleBulkDelete = () => {
    if (confirm(`Bạn có chắc muốn xóa ${selectedIds.size} ad copy?`)) {
      selectedIds.forEach(id => deleteAdCopy(id));
      setSelectedIds(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Handle filter by status from HeroSection
  const handleFilterByStatus = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="fixed top-3 right-3 z-[60] h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-muted shadow-md"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Hero Section */}
        <AdCopyHeroSection
          adCopies={adCopies}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddNew={() => setFormOpen(true)}
          isLoading={isLoading}
          onFilterByStatus={handleFilterByStatus}
        />

        {/* Filters */}
        <AdCopyFilters
          searchQuery={searchQuery}
          onSearchChange={handleFilterChange(setSearchQuery)}
          statusFilter={statusFilter}
          onStatusFilterChange={handleFilterChange(setStatusFilter)}
          platformFilter={platformFilter}
          onPlatformFilterChange={handleFilterChange(setPlatformFilter)}
          objectiveFilter={objectiveFilter}
          onObjectiveFilterChange={handleFilterChange(setObjectiveFilter)}
          funnelFilter={funnelFilter}
          onFunnelFilterChange={handleFilterChange(setFunnelFilter)}
          datePreset={datePreset}
          onDatePresetChange={handleFilterChange(setDatePreset)}
          campaignFilter={campaignFilter}
          onCampaignFilterChange={handleFilterChange(setCampaignFilter)}
          campaigns={campaigns}
          brandFilter={brandFilter}
          onBrandFilterChange={handleFilterChange(setBrandFilter)}
          brands={brands}
          sortOption={sortOption}
          onSortChange={setSortOption}
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onClearSelection={handleClearSelection}
        />

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              )}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn(
                    "rounded-xl",
                    viewMode === 'grid' ? "h-64" : "h-20"
                  )}
                />
              ))}
            </motion.div>
          ) : filteredAdCopies.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl" />
                <div className="relative p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 border border-border/50">
                  <Megaphone className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Chưa có ad copy nào</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Tạo ad copy đầu tiên để bắt đầu chạy quảng cáo hiệu quả trên Meta & Google
              </p>
              <Button
                onClick={() => setFormOpen(true)}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Tạo Ad Copy đầu tiên
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              )}>
                {paginatedAdCopies.map((adCopy, index) => (
                  <motion.div
                    key={adCopy.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <AdCopyCard
                      adCopy={adCopy}
                      viewMode={viewMode}
                      onView={() => handleView(adCopy)}
                      onDelete={() => handleDelete(adCopy.id)}
                      onDuplicate={() => handleDuplicate(adCopy.id)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, idx, arr) => (
                          <PaginationItem key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

      {/* Viewer Dialog - Lazy loaded */}
      <LazyAdCopyViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        adCopy={selectedAdCopy}
        isLoading={isLoadingDetail}
      />
    </div>
  );
}
