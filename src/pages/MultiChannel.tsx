import { useState, useMemo } from 'react';
import { Loader2, FileText, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { MultiChannelForm } from '@/components/MultiChannelForm';
import { MultiChannelCard } from '@/components/MultiChannelCard';
import { MultiChannelViewer } from '@/components/MultiChannelViewer';
import { MultiChannelFilters } from '@/components/MultiChannelFilters';
import { ContentGeneratingSkeleton, CardLoadingSkeleton } from '@/components/ContentGeneratingSkeleton';
import { useMultiChannelContents } from '@/hooks/useMultiChannelContents';
import { MultiChannelContent, ContentGoal, Channel } from '@/types/multichannel';

export default function MultiChannel() {
  const { contents, loading, generating, regeneratingChannel, aiEditingChannel, generateContent, regenerateChannel, updateChannelContent, aiEditChannel, deleteContent } = useMultiChannelContents();
  
  const [selectedContent, setSelectedContent] = useState<MultiChannelContent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generatingChannelCount, setGeneratingChannelCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<ContentGoal | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');

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

      return true;
    });
  }, [contents, searchQuery, goalFilter, channelFilter]);

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

  const handleDelete = async (id: string) => {
    await deleteContent(id);
  };

  return (
    <div className="min-h-screen">
      <Breadcrumb />

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
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Nội dung đã tạo
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {contents.length} bộ nội dung
                </p>
              </div>
            </div>

            {/* Filters */}
            <MultiChannelFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              goalFilter={goalFilter}
              onGoalFilterChange={setGoalFilter}
              channelFilter={channelFilter}
              onChannelFilterChange={setChannelFilter}
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
                    className="stagger-item"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
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
        regeneratingChannel={regeneratingChannel}
        aiEditingChannel={aiEditingChannel}
      />
    </div>
  );
}
