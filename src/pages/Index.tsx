import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { ScriptCard } from '@/components/ScriptCard';
import { ScriptViewer } from '@/components/ScriptViewer';
import { ScriptFilters, ScriptFilters as ScriptFiltersType } from '@/components/ScriptFilters';
import { ScriptHeroSection } from '@/components/script/ScriptHeroSection';
import { ScriptListView } from '@/components/ScriptListView';
import { useScripts } from '@/hooks/useScripts';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { Script } from '@/types/script';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileVideo, Sparkles, Plus, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

import { CampaignSelector } from '@/components/campaign/CampaignSelector';

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

interface LocationState {
  prefillTopic?: string;
  topicHistoryId?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state as LocationState | null;
  const { scripts, loading, deleteScript, updateScript } = useScripts();
  const { templates: brandTemplates } = useBrandTemplates();
  
  // Create brand template lookup map
  const brandTemplateMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; brand_name: string; primary_color?: string; logo_url?: string }> = {};
    brandTemplates.forEach(t => {
      map[t.id] = {
        id: t.id,
        name: t.name,
        brand_name: t.brand_name,
        primary_color: t.primary_color || undefined,
        logo_url: t.logo_url || undefined,
      };
    });
    return map;
  }, [brandTemplates]);
  
  // Fetch creator profiles for all scripts
  const userIds = useMemo(() => scripts.map(s => s.user_id), [scripts]);
  const { profiles: creatorProfiles, isLoading: isLoadingProfiles } = useCreatorProfiles(userIds);
  
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Handle prefill from Topics Hub - redirect to /scripts/new
  useEffect(() => {
    if (prefillData?.prefillTopic) {
      navigate('/scripts/new', { state: prefillData, replace: true });
    }
  }, [prefillData, navigate]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ScriptFiltersType>({
    search: '',
    videoType: 'all',
    characterType: 'all',
    duration: 'all',
  });
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          script.title.toLowerCase().includes(searchLower) ||
          script.topic.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.videoType !== 'all' && script.video_type !== filters.videoType) return false;
      if (filters.characterType !== 'all' && script.character_type !== filters.characterType) return false;
      if (filters.duration !== 'all' && script.duration !== filters.duration) return false;
      if (campaignFilter && script.campaign_id !== campaignFilter) return false;
      return true;
    });
  }, [scripts, filters, campaignFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredScripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScripts = filteredScripts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const handleViewScript = (script: Script) => {
    setSelectedScript(script);
    setViewerOpen(true);
  };

  const handleScriptUpdate = (updatedScript: Script) => {
    updateScript(updatedScript);
    setSelectedScript(updatedScript);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Hero Section with Stats */}
        <ScriptHeroSection
          scripts={scripts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddNew={() => navigate('/scripts/new')}
          isLoading={loading}
        />

        {/* Bulk Delete (if selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <span className="text-sm text-destructive font-medium">
              {selectedIds.length} kịch bản đã chọn
            </span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                selectedIds.forEach(id => deleteScript(id));
                setSelectedIds([]);
              }}
              className="gap-1.5 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Xóa đã chọn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <ScriptFilters filters={filters} onFiltersChange={setFilters} />
          </div>
          <CampaignSelector
            value={campaignFilter}
            onValueChange={setCampaignFilter}
            placeholder="Lọc theo chiến dịch"
            className="w-full sm:w-56"
          />
        </div>

        {/* Content Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="p-4 bg-background/60 backdrop-blur-sm border-border/50">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/4 mb-4" />
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredScripts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
              <FileVideo className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {scripts.length === 0 ? 'Chưa có kịch bản nào' : 'Không tìm thấy kịch bản'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {scripts.length === 0
                ? 'Bắt đầu tạo kịch bản video chuyên nghiệp với AI.'
                : 'Thử thay đổi bộ lọc để xem thêm kịch bản.'}
            </p>
            {scripts.length === 0 && (
              <Button onClick={() => navigate('/scripts/new')} className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Plus className="w-4 h-4" />
                Tạo kịch bản đầu tiên
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <ScriptListView
            scripts={paginatedScripts}
            onView={handleViewScript}
            onDelete={deleteScript}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {paginatedScripts.map((script, index) => (
              <ScriptCard
                key={script.id}
                script={script}
                onView={handleViewScript}
                onDelete={deleteScript}
                brandTemplate={script.brand_template_id ? brandTemplateMap[script.brand_template_id] : undefined}
                creatorProfile={script.user_id ? creatorProfiles[script.user_id] : undefined}
                isLoadingProfile={isLoadingProfiles}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredScripts.length > 0 && (
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
              <span className="hidden sm:inline ml-1">({filteredScripts.length} kịch bản)</span>
            </div>
          </div>
        )}
      </div>


      {/* Script viewer dialog */}
      <ScriptViewer
        script={selectedScript}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onScriptUpdate={handleScriptUpdate}
      />
    </div>
  );
};

export default Index;
