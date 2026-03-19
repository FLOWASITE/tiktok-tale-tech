import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useBrandAnalytics } from '@/hooks/useBrandAnalytics';
import { useBrandCounts } from '@/hooks/useBrandCounts';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandCard } from '@/components/BrandCard';
import { BrandBulkActionsBar } from '@/components/BrandBulkActionsBar';
import { BrandHeroSection } from '@/components/brand/BrandHeroSection';
import { BrandEmptyState } from '@/components/brand/BrandEmptyState';
import { BrandMobileFilters } from '@/components/brand/BrandMobileFilters';
import { SwipeableBrandCard } from '@/components/brand/SwipeableBrandCard';
import { PullToRefresh } from '@/components/brand/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Loader2, 
  User, 
  Building2, 
  LayoutGrid, 
  List, 
  CheckSquare, 
  ChevronLeft, 
  ChevronRight,
  X,
  Plus,
  Star,
  SortAsc,
  Calendar,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateBrandCompleteness } from '@/utils/brandCompleteness';
import { motion, AnimatePresence } from 'framer-motion';
type SortOption = 'name' | 'created_at' | 'is_default';
type FilterScope = 'all' | 'personal' | 'organization';
type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

export default function Brands() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const { 
    templates, 
    loading, 
    saveTemplate,
    deleteTemplate, 
    duplicateTemplate,
    setDefaultTemplate, 
    refetch
  } = useBrandTemplates();

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('Đã cập nhật danh sách!');
  }, [refetch]);
  
  // Brand Analytics - fetch usage stats for all templates
  const brandIds = useMemo(() => templates.map(t => t.id), [templates]);
  const { getUsageForBrand } = useBrandAnalytics(brandIds);
  
  // Brand Counts - fetch personas, products counts, and industry memory names
  const brandsForCounts = useMemo(() => 
    templates.map(t => ({ id: t.id, industry_template_id: t.industry_template_id || null })), 
    [templates]
  );
  const { getCountsForBrand } = useBrandCounts(brandsForCounts);

  // Fetch all social connections to check which brands have connections
  // Query by org AND by brand IDs (connections may have org_id=null but brand_template_id set)
  const { connections: orgConnections } = useSocialConnections({ organizationId: currentOrganization?.id });
  
  const brandConnectionsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    // Process org-level connections
    orgConnections.forEach(conn => {
      if (conn.brand_template_id && conn.is_active) {
        const existing = map.get(conn.brand_template_id) || [];
        if (!existing.includes(conn.platform)) {
          existing.push(conn.platform);
        }
        map.set(conn.brand_template_id, existing);
      }
    });
    
    return map;
  }, [orgConnections]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('is_default');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Track scroll to show/hide FAB
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setShowFab(heroBottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCreate = () => {
    navigate('/brands/new');
  };

  const handleEdit = (template: BrandTemplate) => {
    navigate('/brands/new', { state: { editTemplate: template } });
  };

  const handleExport = () => {
    const exportData = templates.map(({ id, created_at, updated_at, user_id, organization_id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất brands thành công!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedTemplates = JSON.parse(text);
      
      if (!Array.isArray(importedTemplates)) {
        throw new Error('Invalid format');
      }

      let successCount = 0;
      for (const template of importedTemplates) {
        if (template.name && template.brand_name && template.brand_guideline) {
          await saveTemplate({
            name: template.name,
            brand_name: template.brand_name,
            industry: Array.isArray(template.industry) ? template.industry : (template.industry ? [template.industry] : null),
            brand_guideline: template.brand_guideline,
            include_logo: template.include_logo ?? true,
            is_default: false,
            logo_url: null,
            primary_color: template.primary_color ?? '#000000',
            industry_template_id: template.industry_template_id ?? null,
            brand_positioning: template.brand_positioning ?? null,
            tone_of_voice: template.tone_of_voice ?? null,
            formality_level: template.formality_level ?? null,
            language_style: template.language_style ?? null,
            preferred_words: template.preferred_words ?? null,
            forbidden_words: template.forbidden_words ?? null,
            allow_emoji: template.allow_emoji ?? true,
            compliance_rules: template.compliance_rules ?? null,
            channel_overrides: template.channel_overrides ?? null,
            sample_texts: template.sample_texts ?? null,
            content_pillars: template.content_pillars ?? [],
          }, 'personal');
          successCount++;
        }
      }
      
      toast.success(`Đã import ${successCount} brands!`);
      e.target.value = '';
    } catch {
      toast.error('File không hợp lệ');
      e.target.value = '';
    }
  };

  // Selection handlers
  const handleSelectChange = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredTemplates.map(t => t.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      for (const id of idsToDelete) {
        await deleteTemplate(id);
      }
      toast.success(`Đã xóa ${idsToDelete.length} brands!`);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch {
      toast.error('Có lỗi xảy ra khi xóa brands');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkExport = () => {
    const selectedTemplates = templates.filter(t => selectedIds.has(t.id));
    const exportData = selectedTemplates.map(({ id, created_at, updated_at, user_id, organization_id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-selected-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${selectedTemplates.length} brands!`);
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      handleClearSelection();
    } else {
      setIsSelectionMode(true);
    }
  };

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return templates
      .filter(t => {
        const matchesSearch = 
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesScope = true;
        if (filterScope === 'personal') {
          matchesScope = !!t.user_id && !t.organization_id;
        } else if (filterScope === 'organization') {
          matchesScope = !!t.organization_id;
        }
        
        return matchesSearch && matchesScope;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'created_at':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'is_default':
            return (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0);
          default:
            return 0;
        }
      });
  }, [templates, searchQuery, filterScope, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterScope, sortBy]);

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

  // Count templates by scope
  const personalCount = templates.filter(t => !!t.user_id && !t.organization_id).length;
  const orgCount = templates.filter(t => !!t.organization_id).length;

  // Calculate average completeness
  const averageCompleteness = useMemo(() => {
    if (templates.length === 0) return 0;
    const total = templates.reduce((sum, t) => {
      const counts = getCountsForBrand(t.id);
      const { score } = calculateBrandCompleteness(t, counts.personasCount, counts.productsCount);
      return sum + score;
    }, 0);
    return Math.round(total / templates.length);
  }, [templates, getCountsForBrand]);

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
        id="import-input"
      />

      {/* Hero Section */}
      <div ref={heroRef}>
        <BrandHeroSection
          totalBrands={templates.length}
          personalCount={personalCount}
          orgCount={orgCount}
          averageCompleteness={averageCompleteness}
          onCreateNew={handleCreate}
          onImport={() => document.getElementById('import-input')?.click()}
          onExport={handleExport}
          isExportDisabled={templates.length === 0}
        />
      </div>

      {/* Glassmorphism Filter Section */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        {/* Animated Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all' as FilterScope, label: 'Tất cả', count: templates.length, icon: Sparkles },
            { value: 'personal' as FilterScope, label: 'Cá nhân', count: personalCount, icon: User },
            ...(currentOrganization ? [{ 
              value: 'organization' as FilterScope, 
              label: currentOrganization.name, 
              count: orgCount, 
              icon: Building2 
            }] : [])
          ].map((filter) => (
            <motion.button
              key={filter.value}
              onClick={() => setFilterScope(filter.value)}
              className={cn(
                'filter-pill flex items-center gap-2',
                filterScope === filter.value && 'filter-pill-active'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <filter.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{filter.label}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                filterScope === filter.value 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-muted text-muted-foreground'
              )}>
                {filter.count}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Enhanced Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
        {/* Enhanced Search Input */}
        <div className="relative flex-1 search-enhanced rounded-lg border">
          <Search className="search-icon absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors" />
          <Input
            placeholder="Tìm kiếm theo tên brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 text-sm border-0 focus-visible:ring-0"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Mobile Filter Button (Bottom Sheet trigger) */}
          <BrandMobileFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterScope={filterScope}
            onFilterScopeChange={setFilterScope}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            personalCount={personalCount}
            orgCount={orgCount}
            totalCount={templates.length}
            hasOrganization={!!currentOrganization}
            organizationName={currentOrganization?.name}
          />

          {/* Enhanced Sort Dropdown - Hidden on mobile */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="hidden md:flex w-[160px] h-9 text-sm shrink-0">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="is_default">
                <div className="flex items-center">
                  <Star className="sort-option-icon" />
                  Mặc định trước
                </div>
              </SelectItem>
              <SelectItem value="name">
                <div className="flex items-center">
                  <SortAsc className="sort-option-icon" />
                  Tên A-Z
                </div>
              </SelectItem>
              <SelectItem value="created_at">
                <div className="flex items-center">
                  <Calendar className="sort-option-icon" />
                  Mới nhất
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Selection mode toggle */}
          <Button
            variant={isSelectionMode ? 'secondary' : 'outline'}
            size="icon"
            onClick={toggleSelectionMode}
            disabled={filteredTemplates.length === 0}
            className="h-9 w-9 shrink-0"
          >
            <CheckSquare className="w-4 h-4" />
          </Button>
          
          {/* Enhanced View Mode Toggle with Sliding Indicator */}
          <div className="view-toggle-container shrink-0">
            <div 
              className={cn('view-toggle-indicator', viewMode === 'list' && 'list')}
              style={{ width: 'calc(50% - 2px)' }}
            />
            <button
              className={cn('view-toggle-btn', viewMode === 'grid' && 'active')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={cn('view-toggle-btn', viewMode === 'list' && 'active')}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        searchQuery || filterScope !== 'all' ? (
          <motion.div 
            className="text-center py-16 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Search className="w-10 h-10 text-muted-foreground search-icon-animated" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Không tìm thấy kết quả</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Không có brand nào phù hợp với "{searchQuery || filterScope}"
              </p>
            </div>
            {/* Suggestion Chips */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="suggestion-chip"
                >
                  Xóa tìm kiếm
                </button>
              )}
              {filterScope !== 'all' && (
                <button 
                  onClick={() => setFilterScope('all')}
                  className="suggestion-chip"
                >
                  Xem tất cả
                </button>
              )}
              <button 
                onClick={handleCreate}
                className="suggestion-chip hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Tạo brand mới
              </button>
            </div>
          </motion.div>
        ) : (
          <BrandEmptyState onCreateNew={handleCreate} />
        )
      ) : (
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'flex flex-col gap-2 sm:gap-3'
          )}>
            {paginatedTemplates.map((template, index) => (
              <motion.div 
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <SwipeableBrandCard
                  onDelete={() => deleteTemplate(template.id)}
                  onSetDefault={() => setDefaultTemplate(template.id)}
                  isDefault={template.is_default}
                  disabled={isSelectionMode}
                >
                  <BrandCard
                    template={template}
                    organizationName={currentOrganization?.name}
                    onEdit={handleEdit}
                    onDelete={deleteTemplate}
                    onSetDefault={setDefaultTemplate}
                    onDuplicate={duplicateTemplate}
                    compact={viewMode === 'list'}
                    selectable={isSelectionMode}
                    selected={selectedIds.has(template.id)}
                    onSelectChange={handleSelectChange}
                    usageStats={getUsageForBrand(template.id)}
                    brandCounts={getCountsForBrand(template.id)}
                    connectedPlatforms={brandConnectionsMap.get(template.id) || []}
                  />
                </SwipeableBrandCard>
              </motion.div>
            ))}
          </div>
        </PullToRefresh>
      )}

      {/* Pagination Controls */}
      {!loading && filteredTemplates.length > 0 && (
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
            <span className="hidden sm:inline"> ({filteredTemplates.length} brands)</span>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BrandBulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={filteredTemplates.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        isDeleting={isDeleting}
      />
      {/* Mobile FAB - Only visible on mobile when hero is scrolled out */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={handleCreate}
            className="fixed bottom-6 right-6 z-50 md:hidden w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-lg fab-animate flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
