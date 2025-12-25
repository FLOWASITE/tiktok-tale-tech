import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScriptForm } from '@/components/ScriptForm';
import { ScriptCard } from '@/components/ScriptCard';
import { ScriptViewer } from '@/components/ScriptViewer';
import { ScriptFilters, ScriptFilters as ScriptFiltersType } from '@/components/ScriptFilters';
import { ScriptStats } from '@/components/ScriptStats';
import { ScriptListView } from '@/components/ScriptListView';
import { useScripts } from '@/hooks/useScripts';
import { useCreatorProfiles } from '@/hooks/useCreatorProfiles';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { Script } from '@/types/script';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileVideo, Sparkles, Plus, X, LayoutGrid, List, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

const Index = () => {
  const navigate = useNavigate();
  const { scripts, loading, generating, generateScript, deleteScript, updateScript } = useScripts();
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
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ScriptFiltersType>({
    search: '',
    videoType: 'all',
    characterType: 'all',
    duration: 'all',
  });

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

      if (filters.videoType !== 'all' && script.video_type !== filters.videoType) {
        return false;
      }

      if (filters.characterType !== 'all' && script.character_type !== filters.characterType) {
        return false;
      }

      if (filters.duration !== 'all' && script.duration !== filters.duration) {
        return false;
      }

      return true;
    });
  }, [scripts, filters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredScripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScripts = filteredScripts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const handleViewScript = (script: Script) => {
    setSelectedScript(script);
    setViewerOpen(true);
  };

  const handleGenerateScript = async (formData: Parameters<typeof generateScript>[0]) => {
    const newScript = await generateScript(formData);
    if (newScript) {
      setFormSheetOpen(false);
      setSelectedScript(newScript);
      setViewerOpen(true);
    }
  };

  const handleScriptUpdate = (updatedScript: Script) => {
    updateScript(updatedScript);
    setSelectedScript(updatedScript);
  };

  return (
    <div className="min-h-screen relative">
      {/* Header Bar - Responsive */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <FileVideo className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Kịch bản Video</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {filteredScripts.length} / {scripts.length} kịch bản
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="hidden sm:flex border rounded-lg"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9 p-0">
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9 p-0">
                <List className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Bulk Delete Button */}
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  selectedIds.forEach(id => deleteScript(id));
                  setSelectedIds([]);
                }}
                className="gap-1 sm:gap-2 h-8 sm:h-9"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Xóa</span> ({selectedIds.length})
              </Button>
            )}

            <Button onClick={() => setFormSheetOpen(true)} size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-4">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm mới</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-8 sm:h-9 w-8 sm:w-9"
              title="Đóng"
            >
              <X className="h-4 sm:h-5 w-4 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        {/* Stats Cards */}
        <ScriptStats scripts={scripts} loading={loading} />

        {/* Filters */}
        <ScriptFilters filters={filters} onFiltersChange={setFilters} />

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="gradient-card border-border/50">
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredScripts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <FileVideo className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {scripts.length === 0 ? 'Chưa có kịch bản nào' : 'Không tìm thấy kịch bản'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {scripts.length === 0
                ? 'Nhấn nút "Thêm mới" để tạo kịch bản video đầu tiên.'
                : 'Thử thay đổi bộ lọc để xem thêm kịch bản.'}
            </p>
            {scripts.length === 0 && (
              <Button onClick={() => setFormSheetOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo kịch bản mới
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
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
            {paginatedScripts.map((script, index) => (
              <div
                key={script.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ScriptCard
                  script={script}
                  onView={handleViewScript}
                  onDelete={deleteScript}
                  brandTemplate={script.brand_template_id ? brandTemplateMap[script.brand_template_id] : undefined}
                  creatorProfile={script.user_id ? creatorProfiles[script.user_id] : undefined}
                  isLoadingProfile={isLoadingProfiles}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredScripts.length > 0 && totalPages > 1 && (
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
                    // Show first, last, current, and adjacent pages
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis
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
              <span className="hidden sm:inline"> ({filteredScripts.length} kịch bản)</span>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog - Centered */}
      <Dialog open={formSheetOpen} onOpenChange={(open) => !generating && setFormSheetOpen(open)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Tạo Kịch Bản Video Mới
            </DialogTitle>
            <DialogDescription>
              Điền thông tin để AI tạo kịch bản video chuyên nghiệp
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ScriptForm onSubmit={handleGenerateScript} isLoading={generating} />
          </div>
        </DialogContent>
      </Dialog>

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
