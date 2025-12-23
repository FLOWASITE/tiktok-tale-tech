import { useState, useMemo } from 'react';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandCard } from '@/components/BrandCard';
import { BrandForm } from '@/components/BrandForm';
import { BrandBulkActionsBar } from '@/components/BrandBulkActionsBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { Palette, Plus, Search, Download, Upload, Loader2, User, Building2, LayoutGrid, List, Wand2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isBrandTemplateChanged } from '@/utils/isBrandTemplateChanged';

type SortOption = 'name' | 'created_at' | 'is_default';
type FilterScope = 'all' | 'personal' | 'organization';
type ViewMode = 'grid' | 'list';

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
  ) => {
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
          return;
        }
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await saveTemplate(templateData, scope);
      }
      setDialogOpen(false);
      setEditingTemplate(null);
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

  // Count templates by scope
  const personalCount = templates.filter(t => !!t.user_id && !t.organization_id).length;
  const orgCount = templates.filter(t => !!t.organization_id).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Quản lý Brand
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý thương hiệu và phong cách nội dung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-input"
          />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('import-input')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={templates.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-primary">{templates.length}</p>
          <p className="text-xs text-muted-foreground">Tổng brands</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{personalCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Cá nhân</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{orgCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Tổ chức</p>
        </Card>
      </div>

      {/* Tabs for scope filtering */}
      <Tabs value={filterScope} onValueChange={(v) => setFilterScope(v as FilterScope)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            Tất cả
            <span className="text-xs text-muted-foreground">({templates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5">
            <User className="w-3.5 h-3.5" />
            Cá nhân
            <span className="text-xs text-muted-foreground">({personalCount})</span>
          </TabsTrigger>
          {currentOrganization && (
            <TabsTrigger value="organization" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {currentOrganization.name}
              <span className="text-xs text-muted-foreground">({orgCount})</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px]">
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
          >
            <CheckSquare className="w-4 h-4" />
          </Button>
          
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-r-none', viewMode === 'grid' && 'bg-muted')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-l-none', viewMode === 'list' && 'bg-muted')}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
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
        <div className="text-center py-16 space-y-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Palette className="w-12 h-12 text-primary" />
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
                Brand giúp tạo nội dung nhất quán với phong cách thương hiệu của bạn. Bắt đầu bằng cách tạo brand đầu tiên hoặc để AI gợi ý cho bạn.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo Brand đầu tiên
                </Button>
                <Button variant="outline" onClick={handleCreate}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Dùng AI tạo nhanh
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
          {filteredTemplates.map((template) => (
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
            />
          ))}
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
            <Palette className="w-5 h-5 text-primary" />
            {editingTemplate ? 'Chỉnh sửa Brand' : 'Tạo Brand mới'}
          </>
        }
        description={editingTemplate 
          ? 'Cập nhật thông tin thương hiệu của bạn' 
          : 'Điền thông tin để tạo brand mới cho nội dung'}
        className="md:max-w-xl lg:max-w-2xl"
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
