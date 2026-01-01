import { useState, useMemo, useEffect } from 'react';
import { FileText, Sparkles, X, Plus, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MultiChannelFormStepper } from '@/components/multichannel/MultiChannelFormStepper';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { MultiChannelListView } from '@/components/MultiChannelListView';
import { MultiChannelViewer } from '@/components/MultiChannelViewer';
import { MultiChannelFilters, DateRange } from '@/components/MultiChannelFilters';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { BulkScheduleDialog } from '@/components/BulkScheduleDialog';
import { ContentGeneratingSkeleton, CardLoadingSkeleton } from '@/components/ContentGeneratingSkeleton';
import { MultiChannelStats } from '@/components/MultiChannelStats';
import { PostCreationPrompt } from '@/components/PostCreationPrompt';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { MultiChannelContent, ContentGoal, Channel, ContentStatus } from '@/types/multichannel';
import { useTopicContentLinks } from '@/hooks/useTopicContentLinks';
import { toast } from 'sonner';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

interface LocationState {
  prefillTopic?: string;
  prefillGoal?: ContentGoal;
  topicHistoryId?: string;
  contentPurpose?: string;
  marketingFramework?: string;
}

export default function MultiChannel() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state as LocationState | null;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { 
    contents, 
    loading, 
    generating, 
    regeneratingChannel, 
    aiEditingChannel, 
    generateContent, 
    regenerateChannel, 
    updateChannelContent, 
    aiEditChannel, 
    deleteContent,
    updateStatus,
    updateChannelStatus,
    updateTitleTopic,
    saveChannelImage,
    deleteChannelImage,
  } = useMultiChannelContents();
  
  const { templates: brandTemplates } = useBrandTemplates();
  
  // Fetch creator profiles for all contents
  const userIds = useMemo(() => contents.map(c => c.user_id), [contents]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);
  
  const [selectedContent, setSelectedContent] = useState<MultiChannelContent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generatingChannelCount, setGeneratingChannelCount] = useState(0);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [initialTopic, setInitialTopic] = useState<string>('');
  const [initialGoal, setInitialGoal] = useState<ContentGoal | undefined>();
  const [topicHistoryId, setTopicHistoryId] = useState<string | undefined>();
  const [initialContentPurpose, setInitialContentPurpose] = useState<string | undefined>();
  const [initialMarketingFramework, setInitialMarketingFramework] = useState<string | undefined>();

  // Topic Content Links hook
  const { createLink } = useTopicContentLinks({ enabled: false });

  // Handle prefill from Topics Hub
  useEffect(() => {
    if (prefillData?.prefillTopic || prefillData?.prefillGoal || prefillData?.contentPurpose) {
      if (prefillData.prefillTopic) {
        setInitialTopic(prefillData.prefillTopic);
      }
      if (prefillData.prefillGoal) {
        setInitialGoal(prefillData.prefillGoal);
      }
      if (prefillData.topicHistoryId) {
        setTopicHistoryId(prefillData.topicHistoryId);
      }
      if (prefillData.contentPurpose) {
        setInitialContentPurpose(prefillData.contentPurpose);
      }
      if (prefillData.marketingFramework) {
        setInitialMarketingFramework(prefillData.marketingFramework);
      }
      setFormSheetOpen(true);
      // Clear location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [prefillData]);
  
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
  const [brandFilter, setBrandFilter] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Pagination state
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
    return count;
  }, [goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter]);

  const clearFilters = () => {
    setGoalFilter('all');
    setChannelFilter('all');
    setStatusFilter('all');
    setBrandFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setTagFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };

  const filteredContents = useMemo(() => {
    return contents.filter((content) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTopic = content.topic.toLowerCase().includes(query);
        const matchesTitle = content.title.toLowerCase().includes(query);
        if (!matchesTopic && !matchesTitle) return false;
      }

      // Goal filter
      if (goalFilter !== 'all' && content.content_goal !== goalFilter) {
        return false;
      }

      // Channel filter
      if (channelFilter !== 'all' && !content.selected_channels.includes(channelFilter)) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && content.status !== statusFilter) {
        return false;
      }

      // Brand filter
      if (brandFilter !== 'all' && content.brand_template_id !== brandFilter) {
        return false;
      }

      // Date range filter
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

      // Tag filter
      if (tagFilter !== 'all' && !content.tags?.includes(tagFilter)) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const contentPriority = content.priority || 'normal';
        if (contentPriority !== priorityFilter) return false;
      }

      return true;
    });
  }, [contents, searchQuery, goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContents = filteredContents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter, priorityFilter]);

  // Reset to page 1 if current page exceeds total pages
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
    setSelectedContent(content);
    setViewerOpen(true);
  };

  const handleGenerateContent = async (data: any) => {
    setGeneratingChannelCount(data.channels?.length || 3);
    setFormSheetOpen(false);
    const result = await generateContent(data);
    
    // Show post-creation prompt if content was created successfully
    if (result) {
      // Create topic-to-content link if came from Topics Hub
      if (data.topicHistoryId) {
        try {
          await createLink(
            data.topicHistoryId,
            result.id,
            'multichannel',
            result.title,
            result.status
          );
        } catch (error) {
          console.error('Failed to create topic-content link:', error);
        }
      }
      
      setNewlyCreatedContent(result);
      setShowPostCreationPrompt(true);
      
      // Clear topicHistoryId after use
      setTopicHistoryId(undefined);
    }
  };

  const handleRegenerate = async (contentId: string, channel: Channel) => {
    const updated = await regenerateChannel(contentId, channel);
    if (updated) {
      setSelectedContent(updated);
    }
    return updated;
  };

  const handleUpdateContent = async (contentId: string, channel: Channel, newContent: string) => {
    const updated = await updateChannelContent(contentId, channel, newContent);
    if (updated) {
      setSelectedContent(updated);
    }
    return updated;
  };

  const handleAIEdit = async (contentId: string, channel: Channel, instruction: string, currentContent: string) => {
    return await aiEditChannel(contentId, channel, instruction, currentContent);
  };

  const handleUpdateTitleTopic = async (contentId: string, title: string, topic: string) => {
    const updated = await updateTitleTopic(contentId, title, topic);
    if (updated) {
      setSelectedContent(updated);
    }
    return updated;
  };

  const handleUpdateChannelStatus = async (contentId: string, channel: Channel, status: ContentStatus) => {
    const updated = await updateChannelStatus(contentId, channel, status);
    if (updated) {
      setSelectedContent(updated);
    }
    return updated;
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

  const selectAll = () => {
    setSelectedIds(new Set(filteredContents.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Bar - Compact & Responsive */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">Quản lý nội dung đa kênh</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filteredContents.length} / {contents.length} bộ nội dung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')} className="hidden sm:flex">
              <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={() => setFormSheetOpen(true)} size="sm" className="gap-1 sm:gap-1.5 h-8 px-2 sm:px-3">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm mới</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-8 w-8"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">

            {/* Stats Dashboard */}
            <MultiChannelStats contents={contents} />

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
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              brandTemplates={brandTemplates}
              availableTags={availableTags}
              onClearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
            />

            {/* Generating Skeleton */}
            {generating && (
              <ContentGeneratingSkeleton 
                channelCount={generatingChannelCount} 
                message="AI đang tạo nội dung đa kênh..."
              />
            )}

        {/* Content Grid/List - Responsive */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {[...Array(6)].map((_, i) => (
                <CardLoadingSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )
        ) : filteredContents.length === 0 ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 mb-3">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              {contents.length === 0 ? 'Chưa có nội dung nào' : 'Không tìm thấy nội dung'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-3">
              {contents.length === 0
                ? 'Nhấn "Thêm mới" để tạo nội dung.'
                : 'Thử thay đổi bộ lọc.'}
            </p>
            {contents.length === 0 && (
              <Button onClick={() => setFormSheetOpen(true)} size="sm" className="gap-1.5 h-7">
                <Plus className="w-3.5 h-3.5" />
                Tạo mới
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {paginatedContents.map((content, index) => (
              <div
                key={content.id}
                className="stagger-item relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-1.5 left-1.5 z-20">
                  <Checkbox
                    checked={selectedIds.has(content.id)}
                    onCheckedChange={() => toggleSelection(content.id)}
                    className="h-4 w-4 bg-background/80 backdrop-blur border-border"
                  />
                </div>
                <MultiChannelCard
                  content={content}
                  onView={handleView}
                  onDelete={handleDelete}
                  onScheduleComplete={() => {
                    toast.success('Đã lên lịch thành công');
                  }}
                  creatorProfile={content.user_id ? creatorProfiles[content.user_id] : undefined}
                  isLoadingProfile={isLoadingProfiles}
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

        {/* Pagination Controls */}
        {!loading && filteredContents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 border-t">
            {/* Items per page selector */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hiển thị</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[70px] h-8">
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

            {/* Page navigation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 px-2 sm:px-3"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Trước</span>
              </Button>

              {/* Page numbers */}
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
                          <span className="px-1 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
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
                className="h-8 px-2 sm:px-3"
              >
                <span className="hidden sm:inline mr-1">Sau</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Trang </span>
              {currentPage}/{totalPages}
              <span className="hidden sm:inline"> ({filteredContents.length} nội dung)</span>
            </div>
          </div>
        )}
      </div>

      {/* Form Panel - Below Header */}
      <SlidePanel
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        title={
          <>
            <Plus className="w-5 h-5 text-primary" />
            Tạo nội dung đa kênh mới
          </>
        }
        description="Điền thông tin để AI tạo nội dung cho nhiều kênh cùng lúc"
      >
        <MultiChannelFormStepper
          onSubmit={handleGenerateContent}
          isLoading={generating}
          initialTopic={initialTopic}
          initialGoal={initialGoal}
          topicHistoryId={topicHistoryId}
          initialContentPurpose={initialContentPurpose as any}
          initialMarketingFramework={initialMarketingFramework as any}
        />
      </SlidePanel>

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
        regeneratingChannel={regeneratingChannel}
        aiEditingChannel={aiEditingChannel}
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
            setSelectedContent(newlyCreatedContent);
            setViewerOpen(true);
          }}
        />
      )}

      {/* Assignment dialog after creation */}
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
