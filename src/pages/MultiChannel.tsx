import { useState, useMemo, useEffect } from 'react';
import { Sparkles, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { MultiChannelListView } from '@/components/MultiChannelListView';
import { MultiChannelViewer } from '@/components/MultiChannelViewer';
import { MultiChannelFilters, DateRange } from '@/components/MultiChannelFilters';
import { MultiChannelHeroSection } from '@/components/multichannel/MultiChannelHeroSection';
import { ChannelGroupView } from '@/components/multichannel/ChannelGroupView';
import { MediaRetentionNotice } from '@/components/MediaRetentionNotice';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { BulkScheduleDialog } from '@/components/BulkScheduleDialog';
import { CardLoadingSkeleton } from '@/components/ContentGeneratingSkeleton';
import { PostCreationPrompt } from '@/components/PostCreationPrompt';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { MultiChannelContent, ContentGoal, Channel, ContentStatus } from '@/types/multichannel';
import { toast } from 'sonner';

import { useGEOContentScores } from '@/hooks/useGEOContentScore';
import { useSocialConnections } from '@/hooks/useSocialConnections';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

interface LocationState {
  prefillTopic?: string;
  prefillGoal?: ContentGoal;
  topicHistoryId?: string;
  contentPurpose?: string;
  marketingFramework?: string;
  viewContentId?: string;
  autoOpenImageGen?: boolean;
}

export default function MultiChannel() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state as LocationState | null;
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'channel'>('grid');
  const { 
    contents, 
    loading, 
    regeneratingChannel, 
    aiEditingChannel, 
    expandingChannels,
    regenerateChannel, 
    updateChannelContent, 
    aiEditChannel, 
    deleteContent,
    updateStatus,
    updateChannelStatus,
    updateTitleTopic,
    saveChannelImage,
    deleteChannelImage,
    expandChannels,
    refetch,
    fetchContentDetail,
  } = useMultiChannelContents();
  
  const { templates: brandTemplates } = useBrandTemplates();

  
  // Build brand logo lookup map
  const brandLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    brandTemplates.forEach(t => {
      if (t.logo_url) map[t.id] = t.logo_url;
    });
    return map;
  }, [brandTemplates]);
  
  // Fetch creator profiles for all contents
  const userIds = useMemo(() => contents.map(c => c.user_id), [contents]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);

  // Fetch GEO scores for all displayed contents
  const contentIds = useMemo(() => contents.map(c => c.id), [contents]);
  const { data: geoScoresMap } = useGEOContentScores(contentIds);
  
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const selectedContent = useMemo(() => 
    selectedContentId ? contents.find(c => c.id === selectedContentId) || null : null,
    [selectedContentId, contents]
  );

  // Hydrate full content (heavy fields: critique_details, *_seo_data, hooks)
  // when user opens the viewer — list query is lightweight to avoid timeouts.
  useEffect(() => {
    if (viewerOpen && selectedContentId) {
      fetchContentDetail(selectedContentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOpen, selectedContentId]);

  // Handle prefill from Topics Hub - redirect to create page
  useEffect(() => {
    if (prefillData?.prefillTopic || prefillData?.prefillGoal || prefillData?.contentPurpose) {
      navigate('/multichannel/new', { state: prefillData });
      window.history.replaceState({}, '', window.location.href);
    }
  }, [prefillData, navigate]);

  // Handle viewContentId from Create page - auto-open viewer
  const [autoOpenImageGen, setAutoOpenImageGen] = useState(false);
  useEffect(() => {
    if (prefillData?.viewContentId && !loading) {
      const contentToView = contents.find(c => c.id === prefillData.viewContentId);
      if (contentToView) {
        setSelectedContentId(contentToView.id);
        setViewerOpen(true);
        if (prefillData.autoOpenImageGen) {
          setAutoOpenImageGen(true);
        }
        // Clear state to prevent re-opening on refresh
        window.history.replaceState({}, '', window.location.href);
      }
    }
  }, [prefillData?.viewContentId, contents, loading]);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);

  // Post-creation assignment prompt state
  const [showPostCreationPrompt, setShowPostCreationPrompt] = useState(false);
  const [newlyCreatedContent, setNewlyCreatedContent] = useState<MultiChannelContent | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<ContentGoal | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const { currentBrand } = useCurrentBrand();
  const [brandFilter, setBrandFilter] = useState<string | 'all'>(currentBrand?.id ?? 'all');

  // Sync brandFilter when user switches brand in header
  useEffect(() => {
    setBrandFilter(currentBrand?.id ?? 'all');
  }, [currentBrand?.id]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();

  // Social connections for channel view
  const activeBrandTemplateId = useMemo(() => {
    if (brandFilter !== 'all') return brandFilter;
    const brandCounts: Record<string, number> = {};
    for (const c of contents) {
      if (c.brand_template_id) {
        brandCounts[c.brand_template_id] = (brandCounts[c.brand_template_id] || 0) + 1;
      }
    }
    const sorted = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  }, [brandFilter, contents]);

  const { connections: socialConnections } = useSocialConnections({
    brandTemplateId: activeBrandTemplateId,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Get all unique tags from contents
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    contents.forEach(content => {
      content.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [contents]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (goalFilter !== 'all') count++;
    if (channelFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (brandFilter !== 'all') count++;
    if (dateRange.from || dateRange.to) count++;
    if (tagFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (campaignFilter) count++;
    return count;
  }, [goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter, campaignFilter]);

  const clearFilters = () => {
    setGoalFilter('all');
    setChannelFilter('all');
    setStatusFilter('all');
    setBrandFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setTagFilter('all');
    setPriorityFilter('all');
    setCampaignFilter(undefined);
    setSearchQuery('');
  };

  const filteredContents = useMemo(() => {
    return contents.filter((content) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const topic = typeof content.topic === 'string' ? content.topic : '';
        const title = typeof content.title === 'string' ? content.title : '';
        const matchesTopic = topic.toLowerCase().includes(query);
        const matchesTitle = title.toLowerCase().includes(query);
        if (!matchesTopic && !matchesTitle) return false;
      }
      if (goalFilter !== 'all' && content.content_goal !== goalFilter) return false;
      const safeChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
      if (channelFilter !== 'all' && !safeChannels.includes(channelFilter)) return false;
      if (statusFilter !== 'all' && content.status !== statusFilter) return false;
      if (brandFilter !== 'all' && content.brand_template_id !== brandFilter) return false;
      if (dateRange.from) {
        const contentDate = new Date(content.created_at);
        if (contentDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const contentDate = new Date(content.created_at);
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (contentDate > endOfDay) return false;
      }
      const safeTags = Array.isArray(content.tags) ? content.tags : [];
      if (tagFilter !== 'all' && !safeTags.includes(tagFilter)) return false;
      if (priorityFilter !== 'all') {
        const contentPriority = content.priority || 'normal';
        if (contentPriority !== priorityFilter) return false;
      }
      if (campaignFilter && content.campaign_id !== campaignFilter) return false;
      return true;
    });
  }, [contents, searchQuery, goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter, campaignFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContents = filteredContents.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter, campaignFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleView = (content: MultiChannelContent) => {
    setSelectedContentId(content.id);
    setViewerOpen(true);
  };

  // Navigate to create page
  const handleAddNew = () => {
    navigate('/multichannel/new');
  };

  const handleRegenerate = async (contentId: string, channel: Channel) => {
    return await regenerateChannel(contentId, channel);
  };

  const handleUpdateContent = async (contentId: string, channel: Channel, newContent: string) => {
    return await updateChannelContent(contentId, channel, newContent);
  };

  const handleAIEdit = async (contentId: string, channel: Channel, instruction: string, currentContent: string) => {
    return await aiEditChannel(contentId, channel, instruction, currentContent);
  };

  const handleUpdateTitleTopic = async (contentId: string, title: string, topic: string) => {
    return await updateTitleTopic(contentId, title, topic);
  };

  const handleUpdateChannelStatus = async (contentId: string, channel: Channel, status: ContentStatus) => {
    return await updateChannelStatus(contentId, channel, status);
  };

  const handleExpandChannels = async (contentId: string, newChannels: Channel[]) => {
    return await expandChannels(contentId, newChannels);
  };

  const handleDelete = async (id: string) => {
    await deleteContent(id);
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };

  // Bulk Actions
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => setSelectedIds(new Set(filteredContents.map(c => c.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    for (const id of idsToDelete) {
      try {
        await deleteContent(id);
        successCount++;
      } catch (error) {
        console.error(`Error deleting ${id}:`, error);
      }
    }
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    toast.success(`Đã xóa ${successCount}/${idsToDelete.length} nội dung`);
  };

  const handleBulkStatusChange = async (status: ContentStatus) => {
    setIsBulkUpdating(true);
    const idsToUpdate = Array.from(selectedIds);
    let successCount = 0;
    for (const id of idsToUpdate) {
      try {
        await updateStatus(id, status);
        successCount++;
      } catch (error) {
        console.error(`Error updating ${id}:`, error);
      }
    }
    setSelectedIds(new Set());
    setIsBulkUpdating(false);
    toast.success(`Đã cập nhật ${successCount}/${idsToUpdate.length} nội dung`);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Close Button - Fixed top right */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="fixed top-3 right-3 z-50 h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm"
        title="Đóng"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        <MediaRetentionNotice storageKey="media-retention-multichannel-page" />

        {/* Hero Section with Stats */}
        <MultiChannelHeroSection
          contents={contents}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddNew={handleAddNew}
          isLoading={loading}
        />

        {/* Filters */}
        <MultiChannelFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          goalFilter={goalFilter}
          onGoalFilterChange={setGoalFilter}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          brandFilter={brandFilter}
          onBrandFilterChange={setBrandFilter}
          campaignFilter={campaignFilter}
          onCampaignFilterChange={setCampaignFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          brandTemplates={brandTemplates}
          availableTags={availableTags}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={filteredContents.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkSchedule={() => setBulkScheduleOpen(true)}
          isDeleting={isBulkDeleting}
          isUpdating={isBulkUpdating}
        />


        {/* Content Grid/List */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <CardLoadingSkeleton key={i} />
              ))}
            </div>
          ) : viewMode === 'channel' ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {[...Array(3)].map((_, j) => (
                      <CardLoadingSkeleton key={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )
        ) : filteredContents.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {contents.length === 0 ? 'Chưa có nội dung nào' : 'Không tìm thấy nội dung'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {contents.length === 0
                ? 'Bắt đầu tạo nội dung đa kênh với AI để tiếp cận khách hàng trên mọi nền tảng.'
                : 'Thử thay đổi bộ lọc để tìm nội dung phù hợp.'}
            </p>
            {contents.length === 0 && (
              <Button onClick={handleAddNew} className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Plus className="w-4 h-4" />
                Tạo nội dung đầu tiên
              </Button>
            )}
          </div>
        ) : viewMode === 'channel' ? (
          <ChannelGroupView
            contents={filteredContents}
            onView={handleView}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            creatorProfiles={creatorProfiles}
            isLoadingProfiles={isLoadingProfiles}
            brandLogoMap={brandLogoMap}
            geoScoresMap={geoScoresMap}
            onScheduleComplete={() => toast.success('Đã lên lịch thành công')}
            socialConnections={socialConnections}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {paginatedContents.map((content, index) => (
              <div key={content.id} className="relative">
                <div className="absolute top-2 left-2 z-20">
                  <Checkbox
                    checked={selectedIds.has(content.id)}
                    onCheckedChange={() => toggleSelection(content.id)}
                    className="h-4 w-4 bg-background/90 backdrop-blur border-border shadow-sm"
                  />
                </div>
                <MultiChannelCard
                  content={content}
                  onView={handleView}
                  onDelete={handleDelete}
                  onScheduleComplete={() => toast.success('Đã lên lịch thành công')}
                  creatorProfile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                  isLoadingProfile={isLoadingProfiles}
                  index={index}
                  brandLogoUrl={content.brand_template_id ? brandLogoMap[content.brand_template_id] : undefined}
                  geoScore={geoScoresMap?.[content.id]?.overall_score ?? null}
                />
              </div>
            ))}
          </div>
        ) : (
          <MultiChannelListView
            contents={paginatedContents}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onView={handleView}
            onDelete={handleDelete}
            onChannelStatusChange={updateChannelStatus}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
          />
        )}

        {/* Pagination - hidden in channel mode */}
        {!loading && filteredContents.length > 0 && viewMode !== 'channel' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hiển thị</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[70px] h-8 bg-background/60 border-border/50">
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
              <span className="text-muted-foreground">/ trang</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 px-3 bg-background/60 border-border/50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Trước</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, array) => {
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={`h-9 w-9 p-0 ${currentPage === page ? 'bg-gradient-to-r from-primary to-secondary border-0' : 'bg-background/60 border-border/50'}`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-9 px-3 bg-background/60 border-border/50"
              >
                <span className="hidden sm:inline mr-1">Sau</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Trang </span>
              <span className="font-medium text-foreground">{currentPage}</span>/{totalPages}
              <span className="hidden sm:inline ml-1">({filteredContents.length} nội dung)</span>
            </div>
          </div>
        )}
      </div>


      {/* Viewer Dialog */}
      <MultiChannelViewer
        content={selectedContent}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onRegenerate={handleRegenerate}
        onUpdateContent={handleUpdateContent}
        onAIEdit={handleAIEdit}
        onUpdateTitleTopic={handleUpdateTitleTopic}
        onSaveChannelImage={saveChannelImage}
        onDeleteChannelImage={deleteChannelImage}
        onUpdateChannelStatus={handleUpdateChannelStatus}
        onExpandChannels={handleExpandChannels}
        onContentUpdated={(updated) => setSelectedContentId(updated.id)}
        onPublishSuccess={refetch}
        regeneratingChannel={regeneratingChannel}
        aiEditingChannel={aiEditingChannel}
        expandingChannels={expandingChannels}
        autoOpenImageGen={autoOpenImageGen}
        onImageGenOpened={() => setAutoOpenImageGen(false)}
      />

      {/* Bulk Schedule Dialog */}
      <BulkScheduleDialog
        open={bulkScheduleOpen}
        onOpenChange={setBulkScheduleOpen}
        contents={filteredContents.filter(c => selectedIds.has(c.id))}
        onScheduleComplete={() => {
          clearSelection();
          toast.success('Đã lên lịch hàng loạt thành công!');
        }}
      />

      {/* Post-creation prompt */}
      {newlyCreatedContent && (
        <PostCreationPrompt
          open={showPostCreationPrompt}
          onOpenChange={setShowPostCreationPrompt}
          contentTitle={newlyCreatedContent.title}
          contentId={newlyCreatedContent.id}
          onAssign={() => setShowAssignmentDialog(true)}
          onSkip={() => {
            setSelectedContentId(newlyCreatedContent.id);
            setViewerOpen(true);
          }}
        />
      )}

      {/* Assignment dialog */}
      {newlyCreatedContent && (
        <AssignmentDialog
          open={showAssignmentDialog}
          onOpenChange={setShowAssignmentDialog}
          contentId={newlyCreatedContent.id}
          contentTitle={newlyCreatedContent.title}
          selectedChannels={newlyCreatedContent.selected_channels}
        />
      )}
    </div>
  );
}
