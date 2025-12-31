import { useState, useMemo, useEffect } from 'react';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useBrandAnalytics } from '@/hooks/useBrandAnalytics';
import { useBrandCounts } from '@/hooks/useBrandCounts';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandCard } from '@/components/BrandCard';
import { BrandForm } from '@/components/BrandForm';
import { BrandBulkActionsBar } from '@/components/BrandBulkActionsBar';
import { BrandHeroSection } from '@/components/brand/BrandHeroSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, User, Building2, LayoutGrid, List, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isBrandTemplateChanged } from '@/utils/isBrandTemplateChanged';
import { calculateBrandCompleteness } from '@/utils/brandCompleteness';
type SortOption = 'name' | 'created_at' | 'is_default';
type FilterScope = 'all' | 'personal' | 'organization';
type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

// Type for form data without ownership fields
type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

export default function Brands() {
  const { currentOrganization } = useOrganizationContext();
  const { 
    templates, 
    loading, 
    saveTemplate, 
    updateTemplate, 
    deleteTemplate, 
    duplicateTemplate,
    setDefaultTemplate, 
    uploadLogo, 
    deleteLogo 
  } = useBrandTemplates();
  
  // Brand Analytics - fetch usage stats for all templates
  const brandIds = useMemo(() => templates.map(t => t.id), [templates]);
  const { getUsageForBrand } = useBrandAnalytics(brandIds);
  
  // Brand Counts - fetch personas, products counts, and industry memory names
  const brandsForCounts = useMemo(() => 
    templates.map(t => ({ id: t.id, industry_template_id: t.industry_template_id || null })), 
    [templates]
  );
  const { getCountsForBrand } = useBrandCounts(brandsForCounts);
  
  const [editingTemplate, setEditingTemplate] = useState<BrandTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('is_default');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const handleCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: BrandTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setDialogOpen(false);
  };

  const handleSubmit = async (
    data: BrandFormData,
    scope: BrandScope,
    logoFile?: File | null,
    shouldDeleteLogo?: boolean
  ): Promise<BrandTemplate | null> => {
    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      if (shouldDeleteLogo && editingTemplate?.logo_url) {
        await deleteLogo(editingTemplate.logo_url);
        logoUrl = null;
      }

      if (logoFile) {
        if (editingTemplate?.logo_url) {
          await deleteLogo(editingTemplate.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      }

      const templateData = { ...data, logo_url: logoUrl };

      if (editingTemplate) {
        // Avoid "phantom saves" when user didn't change anything
        if (!logoFile && !shouldDeleteLogo && !isBrandTemplateChanged(editingTemplate, templateData)) {
          setDialogOpen(false);
          setEditingTemplate(null);
          return null;
        }
        await updateTemplate(editingTemplate.id, templateData);
        setDialogOpen(false);
        setEditingTemplate(null);
        return null;
      } else {
        const newTemplate = await saveTemplate(templateData, scope);
        setDialogOpen(false);
        setEditingTemplate(null);
        return newTemplate;
      }
    } finally {
      setSaving(false);
    }
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

      {/* Tabs for scope filtering */}
      <Tabs value={filterScope} onValueChange={(v) => setFilterScope(v as FilterScope)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm flex-1 sm:flex-none">
            <span className="hidden sm:inline">Tất cả</span>
            <span className="sm:hidden">All</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">({templates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-1 text-xs sm:text-sm flex-1 sm:flex-none">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Cá nhân</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">({personalCount})</span>
          </TabsTrigger>
          {currentOrganization && (
            <TabsTrigger value="organization" className="gap-1 text-xs sm:text-sm flex-1 sm:flex-none">
              <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{currentOrganization.name}</span>
              <span className="sm:hidden">Org</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">({orgCount})</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[130px] sm:w-[160px] h-8 sm:h-10 text-xs sm:text-sm shrink-0">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="is_default">Mặc định trước</SelectItem>
              <SelectItem value="name">Tên A-Z</SelectItem>
              <SelectItem value="created_at">Mới nhất</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Selection mode toggle */}
          <Button
            variant={isSelectionMode ? 'secondary' : 'outline'}
            size="icon"
            onClick={toggleSelectionMode}
            disabled={filteredTemplates.length === 0}
            className="h-8 w-8 sm:h-10 sm:w-10 shrink-0"
          >
            <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          
          {/* View mode toggle */}
          <div className="flex border rounded-md shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-r-none h-8 w-8 sm:h-10 sm:w-10', viewMode === 'grid' && 'bg-muted')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-l-none h-8 w-8 sm:h-10 sm:w-10', viewMode === 'list' && 'bg-muted')}
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 space-y-4 animate-fade-in">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-float">
            <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {searchQuery || filterScope !== 'all' ? (
            <div>
              <h3 className="text-lg font-semibold">Không tìm thấy</h3>
              <p className="text-muted-foreground text-sm">
                Không có template nào phù hợp với bộ lọc hiện tại
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold">Chưa có Brand nào</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Brand giúp tạo nội dung nhất quán với phong cách thương hiệu của bạn. Bắt đầu bằng cách tạo brand đầu tiên.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button onClick={handleCreate} className="shimmer-btn">
                  Tạo Brand đầu tiên
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
            : 'flex flex-col gap-3'
        )}>
          {paginatedTemplates.map((template) => (
            <BrandCard
              key={template.id}
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
            />
          ))}
        </div>
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

      {/* Create/Edit Panel - Below Header */}
      <SlidePanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          <>
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {editingTemplate ? 'Chỉnh sửa Brand' : 'Tạo Brand mới'}
          </>
        }
        fullScreen={!editingTemplate}
        description={editingTemplate
          ? 'Cập nhật thông tin thương hiệu của bạn' 
          : 'Điền thông tin để tạo brand mới cho nội dung'}
        className={editingTemplate ? "md:max-w-xl lg:max-w-2xl" : undefined}
      >
        <BrandForm
          template={editingTemplate}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={saving}
        />
      </SlidePanel>
    </div>
  );
}
