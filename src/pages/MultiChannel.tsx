import { useState, useMemo } from 'react';
import { Loader2, FileText, Sparkles, CheckSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MultiChannelForm } from '@/components/MultiChannelForm';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { MultiChannelViewer } from '@/components/MultiChannelViewer';
import { MultiChannelFilters, DateRange } from '@/components/MultiChannelFilters';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { ContentGeneratingSkeleton, CardLoadingSkeleton } from '@/components/ContentGeneratingSkeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { MultiChannelContent, ContentGoal, Channel, ContentStatus } from '@/types/multichannel';
import { toast } from 'sonner';

export default function MultiChannel() {
  const navigate = useNavigate();
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
    updateTitleTopic,
    saveChannelImage,
    deleteChannelImage,
  } = useMultiChannelContents();
  
  const { templates: brandTemplates } = useBrandTemplates();
  
  const [selectedContent, setSelectedContent] = useState<MultiChannelContent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generatingChannelCount, setGeneratingChannelCount] = useState(0);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<ContentGoal | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [tagFilter, setTagFilter] = useState<string>('all');

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
    return count;
  }, [goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter]);

  const clearFilters = () => {
    setGoalFilter('all');
    setChannelFilter('all');
    setStatusFilter('all');
    setBrandFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setTagFilter('all');
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

      return true;
    });
  }, [contents, searchQuery, goalFilter, channelFilter, statusFilter, brandFilter, dateRange, tagFilter]);

  const handleView = (content: MultiChannelContent) => {
    setSelectedContent(content);
    setViewerOpen(true);
  };

  const handleGenerateContent = async (data: any) => {
    setGeneratingChannelCount(data.channels?.length || 3);
    await generateContent(data);
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
    <div className="min-h-screen">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-6">
              <MultiChannelForm
                onSubmit={handleGenerateContent}
                isLoading={generating}
              />
            </div>
          </div>

          {/* Right Column - Content List */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Nội dung đã tạo
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredContents.length} / {contents.length} bộ nội dung
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-9 w-9"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
              selectedCount={selectedIds.size}
              totalCount={filteredContents.length}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onBulkDelete={handleBulkDelete}
              onBulkStatusChange={handleBulkStatusChange}
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

            {/* Content Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <CardLoadingSkeleton key={i} />
                ))}
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {contents.length === 0 ? 'Chưa có nội dung nào' : 'Không tìm thấy nội dung'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {contents.length === 0
                    ? 'Nhập chủ đề và chọn kênh để AI tạo nội dung đa kênh cho bạn.'
                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredContents.map((content, index) => (
                  <div
                    key={content.id}
                    className="stagger-item relative"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-20">
                      <Checkbox
                        checked={selectedIds.has(content.id)}
                        onCheckedChange={() => toggleSelection(content.id)}
                        className="bg-background/80 backdrop-blur border-border"
                      />
                    </div>
                    <MultiChannelCard
                      content={content}
                      onView={handleView}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
        regeneratingChannel={regeneratingChannel}
        aiEditingChannel={aiEditingChannel}
      />
    </div>
  );
}
