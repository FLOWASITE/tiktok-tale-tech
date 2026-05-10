import { useState } from 'react';
import { 
  Package, 
  Globe, 
  CheckCircle2, 
  FileEdit, 
  Archive,
  RefreshCw,
  Search,
  Filter,
  Rocket,
  RotateCcw,
  ArchiveX,
  Shield,
  Ban,
  ListChecks,
  History,
  Zap,
  Plus,
  Pencil,
  Book,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useIndustryMemoryPacks } from '@/hooks/useIndustryMemoryPacks';
import { useIndustryTemplates } from '@/hooks/useIndustryTemplates';
import { useIndustryPackDetails } from '@/hooks/useIndustryPackDetails';
import { IndustryMemoryPack, IndustryPackStatus } from '@/types/industryMemoryPack';
import { IndustryPackRulesEditor } from '@/components/admin/IndustryPackRulesEditor';
import { IndustryGlossaryEditor } from '@/components/admin/IndustryGlossaryEditor';
import { IndustryPersonasEditor } from '@/components/admin/IndustryPersonasEditor';

const statusConfig: Record<IndustryPackStatus, {
  label: string;
  color: string;
  icon: typeof CheckCircle2;
  description: string;
}> = {
  draft: {
    label: 'Draft',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    icon: FileEdit,
    description: 'Đang soạn thảo, chưa áp dụng vào content',
  },
  stable: {
    label: 'Stable',
    color: 'bg-green-500/10 text-green-600 border-green-500/30',
    icon: CheckCircle2,
    description: 'Đã phát hành, đang được sử dụng cho content generation',
  },
  deprecated: {
    label: 'Deprecated',
    color: 'bg-muted text-muted-foreground border-muted',
    icon: Archive,
    description: 'Đã ngưng sử dụng, không áp dụng cho content mới',
  },
};

function PackCard({ 
  pack, 
  onPublish, 
  onDeprecate, 
  onReactivate,
  onEditRules,
  onEditGlossary,
  onEditPersonas,
  onEdit,
  isUpdating,
}: { 
  pack: IndustryMemoryPack;
  onPublish: () => void;
  onDeprecate: () => void;
  onReactivate: () => void;
  onEditRules: () => void;
  onEditGlossary: () => void;
  onEditPersonas: () => void;
  onEdit: () => void;
  isUpdating: boolean;
}) {
  const [confirmAction, setConfirmAction] = useState<'publish' | 'deprecate' | 'reactivate' | null>(null);
  const config = statusConfig[pack.status];
  const StatusIcon = config.icon;

  const totalRules = pack.complianceRulesCount + pack.forbiddenTermsCount + pack.claimRestrictionsCount;

  const handleConfirm = () => {
    if (confirmAction === 'publish') onPublish();
    else if (confirmAction === 'deprecate') onDeprecate();
    else if (confirmAction === 'reactivate') onReactivate();
    setConfirmAction(null);
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{pack.flagEmoji || '🌐'}</span>
              <div>
                <CardTitle className="text-base leading-tight">
                  {pack.name || pack.code}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {pack.countryName} • {pack.targetAudience}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={`${config.color} text-[10px] shrink-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2">
                  <Shield className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-semibold">{pack.complianceRulesCount}</p>
                  <p className="text-[10px] text-muted-foreground">Compliance</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Compliance Rules</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2">
                  <Ban className="h-4 w-4 mx-auto text-red-500 mb-1" />
                  <p className="text-lg font-semibold">{pack.forbiddenTermsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Forbidden</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Forbidden Terms</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted/50 rounded-lg p-2">
                  <ListChecks className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-semibold">{pack.claimRestrictionsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Claims</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Claim Restrictions</TooltipContent>
            </Tooltip>
          </div>

          {/* Version & History */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">v{pack.version}</Badge>
              <span>•</span>
              <History className="h-3 w-3" />
              <span>{pack.versionCount} versions</span>
            </div>
            <span className="text-muted-foreground">
              {totalRules} rules total
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/50">
            {/* Edit Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8"
                  onClick={onEdit}
                  disabled={isUpdating}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chỉnh sửa thông tin Pack</TooltipContent>
            </Tooltip>

            {/* Edit Rules Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8"
                  onClick={onEditRules}
                  disabled={isUpdating}
                >
                  <Zap className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quản lý System Rules & Argument Patterns</TooltipContent>
            </Tooltip>

            {/* Glossary Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8"
                  onClick={onEditGlossary}
                  disabled={isUpdating}
                >
                  <Book className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Từ điển ngành</TooltipContent>
            </Tooltip>

            {/* Personas Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8"
                  onClick={onEditPersonas}
                  disabled={isUpdating}
                >
                  <Users className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Personas ngành</TooltipContent>
            </Tooltip>

            {pack.status === 'draft' && (
              <Button 
                size="sm" 
                className="flex-1 h-8"
                onClick={() => setConfirmAction('publish')}
                disabled={isUpdating}
              >
                <Rocket className="h-3.5 w-3.5 mr-1.5" />
                Publish
              </Button>
            )}
            
            {pack.status === 'stable' && (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => setConfirmAction('deprecate')}
                disabled={isUpdating}
              >
                <ArchiveX className="h-3.5 w-3.5 mr-1.5" />
                Deprecate
              </Button>
            )}
            
            {pack.status === 'deprecated' && (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8"
                onClick={() => setConfirmAction('reactivate')}
                disabled={isUpdating}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reactivate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'publish' && 'Publish Pack này?'}
              {confirmAction === 'deprecate' && 'Deprecate Pack này?'}
              {confirmAction === 'reactivate' && 'Reactivate Pack này?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'publish' && (
                <>Pack <strong>{pack.name}</strong> sẽ chuyển sang trạng thái Stable và được sử dụng cho tất cả content generation.</>
              )}
              {confirmAction === 'deprecate' && (
                <>Pack <strong>{pack.name}</strong> sẽ ngưng áp dụng cho content mới. Content đã tạo trước đó không bị ảnh hưởng.</>
              )}
              {confirmAction === 'reactivate' && (
                <>Pack <strong>{pack.name}</strong> sẽ chuyển về trạng thái Draft để tiếp tục chỉnh sửa.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatsCards({ stats }: { stats: { total: number; draft: number; stable: number; deprecated: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Packs</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <FileEdit className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.stable}</p>
              <p className="text-xs text-muted-foreground">Stable</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Archive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.deprecated}</p>
              <p className="text-xs text-muted-foreground">Deprecated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminIndustryPacks() {
  // State hooks
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [glossaryPackId, setGlossaryPackId] = useState<string | null>(null);
  const [personasPackId, setPersonasPackId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editPackId, setEditPackId] = useState<string | null>(null);
  
  // Create form state
  const [newPackCode, setNewPackCode] = useState('');
  const [newPackCountryId, setNewPackCountryId] = useState('');
  const [newPackCategoryId, setNewPackCategoryId] = useState('');
  const [newPackTargetAudience, setNewPackTargetAudience] = useState('B2B');
  const [newPackNameVi, setNewPackNameVi] = useState('');
  const [newPackNameEn, setNewPackNameEn] = useState('');

  // Edit form state
  const [editPackTargetAudience, setEditPackTargetAudience] = useState('B2B');
  const [editPackCategoryId, setEditPackCategoryId] = useState('');
  const [editPackNameVi, setEditPackNameVi] = useState('');
  const [editPackNameEn, setEditPackNameEn] = useState('');

  // All data fetching hooks
  const { countries, categories, isLoadingCountries } = useIndustryTemplates();
  const { 
    packs, 
    stats, 
    isLoading, 
    refetch, 
    publishPack, 
    deprecatePack, 
    reactivatePack,
    isUpdating,
    updateRules,
    isUpdatingRules,
    createPack,
    isCreating,
    updatePack,
    isUpdatingPack,
  } = useIndustryMemoryPacks({ onlyActive: false });
  const { data: packDetails, isLoading: isLoadingDetails } = useIndustryPackDetails(editingPackId);
  const { data: editPackDetails } = useIndustryPackDetails(editPackId);

  // Derived state (not hooks)
  const editingPack = packs.find(p => p.id === editingPackId);
  const glossaryPack = packs.find(p => p.id === glossaryPackId);
  const personasPack = packs.find(p => p.id === personasPackId);
  const packToEdit = packs.find(p => p.id === editPackId);

  // Reset create form
  const resetCreateForm = () => {
    setNewPackCode('');
    setNewPackCountryId('');
    setNewPackCategoryId('');
    setNewPackTargetAudience('B2B');
    setNewPackNameVi('');
    setNewPackNameEn('');
  };

  // Handle create pack
  const handleCreatePack = async () => {
    if (!newPackCode || !newPackCountryId || !newPackNameVi) return;

    const translations = [
      { languageCode: 'vi', name: newPackNameVi },
    ];
    if (newPackNameEn) {
      translations.push({ languageCode: 'en', name: newPackNameEn });
    }

    await createPack({
      code: newPackCode,
      countryId: newPackCountryId,
      categoryId: newPackCategoryId || undefined,
      targetAudience: newPackTargetAudience,
      translations,
    });

    setShowCreateDialog(false);
    resetCreateForm();
  };

  // Handle open edit dialog
  const handleOpenEditDialog = (packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (pack) {
      setEditPackId(packId);
      setEditPackTargetAudience(pack.targetAudience || 'B2B');
      setEditPackCategoryId(pack.categoryCode || '');
      setEditPackNameVi(pack.name || '');
      setEditPackNameEn('');
    }
  };

  // Handle update pack
  const handleUpdatePack = async () => {
    if (!editPackId || !editPackNameVi) return;

    const categoryObj = categories.find(c => c.code === editPackCategoryId);

    await updatePack({
      packId: editPackId,
      data: {
        target_audience: editPackTargetAudience,
        category_id: categoryObj?.id || null,
      },
      translations: [
        { languageCode: 'vi', name: editPackNameVi },
        ...(editPackNameEn ? [{ languageCode: 'en', name: editPackNameEn }] : []),
      ],
    });

    setEditPackId(null);
  };
  // Filter packs
  const filteredPacks = packs.filter(pack => {
    const matchesSearch = !searchQuery || 
      pack.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pack.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || pack.status === statusFilter;
    const matchesCountry = selectedCountry === 'all' || pack.countryCode === selectedCountry;
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  // Group packs by category within selected country
  const groupedByCategory = filteredPacks.reduce((acc, pack) => {
    const key = pack.categoryCode || 'other';
    if (!acc[key]) {
      acc[key] = {
        categoryName: pack.categoryName || 'Other',
        categoryIcon: pack.categoryIcon,
        categoryColor: pack.categoryColor,
        packs: [],
      };
    }
    acc[key].packs.push(pack);
    return acc;
  }, {} as Record<string, { categoryName: string; categoryIcon: string | null; categoryColor: string | null; packs: IndustryMemoryPack[] }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Industry Memory Packs</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý lifecycle của Industry Memory (Country + Industry)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-2" />
            Create Pack
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="flex-1 sm:flex-initial">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Country Tabs */}
      <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
        <TabsList className="flex-wrap h-auto gap-1 p-1 overflow-x-auto sm:overflow-visible max-w-full">
          {isLoadingCountries ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <>
              <TabsTrigger value="all" className="gap-2 text-xs sm:text-sm">
                <Globe className="h-4 w-4" />
                <span>All</span>
              </TabsTrigger>
              {countries.map((country) => (
                <TabsTrigger key={country.code} value={country.code} className="gap-2 text-xs sm:text-sm">
                  <span>{country.flag_emoji}</span>
                  <span>{country.code}</span>
                </TabsTrigger>
              ))}
            </>
          )}
        </TabsList>

        {/* Packs Grid */}
        <TabsContent value={selectedCountry} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPacks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">Không tìm thấy pack nào</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCountry === 'all' 
                    ? 'Chưa có Industry Memory Pack nào được tạo' 
                    : `Chưa có pack nào cho ${countries.find(c => c.code === selectedCountry)?.name || selectedCountry}`}
                </p>
              </CardContent>
            </Card>
          ) : selectedCountry === 'all' ? (
            // Group by country when showing all
            <div className="space-y-8">
              {Object.entries(
                filteredPacks.reduce((acc, pack) => {
                  const key = pack.countryCode;
                  if (!acc[key]) {
                    acc[key] = {
                      countryName: pack.countryName,
                      flagEmoji: pack.flagEmoji,
                      packs: [],
                    };
                  }
                  acc[key].packs.push(pack);
                  return acc;
                }, {} as Record<string, { countryName: string; flagEmoji: string | null; packs: IndustryMemoryPack[] }>)
              ).map(([countryCode, { countryName, flagEmoji, packs: countryPacks }]) => (
                <div key={countryCode}>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <span className="text-xl">{flagEmoji}</span>
                    {countryName}
                    <Badge variant="secondary" className="ml-2">{countryPacks.length} packs</Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {countryPacks.map((pack) => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        onPublish={() => publishPack(pack.id)}
                        onDeprecate={() => deprecatePack(pack.id)}
                        onReactivate={() => reactivatePack(pack.id)}
                        onEditRules={() => setEditingPackId(pack.id)}
                        onEditGlossary={() => setGlossaryPackId(pack.id)}
                        onEditPersonas={() => setPersonasPackId(pack.id)}
                        onEdit={() => handleOpenEditDialog(pack.id)}
                        isUpdating={isUpdating}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Group by category when showing a specific country
            <div className="space-y-8">
              {Object.entries(groupedByCategory).map(([categoryCode, { categoryName, packs: categoryPacks }]) => (
                <div key={categoryCode}>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    {categoryName}
                    <Badge variant="secondary" className="ml-2">{categoryPacks.length} packs</Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryPacks.map((pack) => (
                      <PackCard
                        key={pack.id}
                        pack={pack}
                        onPublish={() => publishPack(pack.id)}
                        onDeprecate={() => deprecatePack(pack.id)}
                        onReactivate={() => reactivatePack(pack.id)}
                        onEditRules={() => setEditingPackId(pack.id)}
                        onEditGlossary={() => setGlossaryPackId(pack.id)}
                        onEditPersonas={() => setPersonasPackId(pack.id)}
                        onEdit={() => handleOpenEditDialog(pack.id)}
                        isUpdating={isUpdating}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rules Editor Dialog */}
      {editingPackId && packDetails && (
        <IndustryPackRulesEditor
          open={!!editingPackId}
          onOpenChange={(open) => !open && setEditingPackId(null)}
          packId={editingPackId}
          packName={editingPack?.name || editingPack?.code || 'Pack'}
          initialData={{
            system_rules: packDetails.system_rules,
            argument_patterns: packDetails.argument_patterns,
            metadata: packDetails.metadata,
          }}
          onSave={async (data) => {
            await updateRules({
              packId: editingPackId,
              data,
            });
          }}
          isSaving={isUpdatingRules}
        />
      )}

      {/* Create Pack Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tạo Industry Memory Pack mới
            </DialogTitle>
            <DialogDescription>
              Tạo pack mới với thông tin cơ bản. Bạn có thể chỉnh sửa chi tiết sau.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Quốc gia *</Label>
              <Select value={newPackCountryId} onValueChange={setNewPackCountryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quốc gia" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag_emoji}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục ngành</Label>
              <Select value={newPackCategoryId} onValueChange={setNewPackCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="vd: finance_vn, healthcare_sg..."
                value={newPackCode}
                onChange={(e) => setNewPackCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              />
              <p className="text-xs text-muted-foreground">
                Mã định danh duy nhất, dùng snake_case
              </p>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label>Đối tượng mục tiêu</Label>
              <Select value={newPackTargetAudience} onValueChange={setNewPackTargetAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B - Doanh nghiệp</SelectItem>
                  <SelectItem value="B2C">B2C - Người tiêu dùng</SelectItem>
                  <SelectItem value="B2B2C">B2B2C - Cả hai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name Vietnamese */}
            <div className="space-y-2">
              <Label htmlFor="nameVi">Tên tiếng Việt *</Label>
              <Input
                id="nameVi"
                placeholder="vd: Tài chính - Ngân hàng"
                value={newPackNameVi}
                onChange={(e) => setNewPackNameVi(e.target.value)}
              />
            </div>

            {/* Name English */}
            <div className="space-y-2">
              <Label htmlFor="nameEn">Tên tiếng Anh</Label>
              <Input
                id="nameEn"
                placeholder="vd: Finance & Banking"
                value={newPackNameEn}
                onChange={(e) => setNewPackNameEn(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetCreateForm();
            }}>
              Hủy
            </Button>
            <Button 
              onClick={handleCreatePack}
              disabled={!newPackCode || !newPackCountryId || !newPackNameVi || isCreating}
            >
              {isCreating ? 'Đang tạo...' : 'Tạo Pack'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pack Dialog */}
      <Dialog open={!!editPackId} onOpenChange={(open) => !open && setEditPackId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Chỉnh sửa Pack: {packToEdit?.name || packToEdit?.code}
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin của Industry Memory Pack
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Danh mục ngành</Label>
              <Select value={editPackCategoryId} onValueChange={setEditPackCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.code}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label>Đối tượng mục tiêu</Label>
              <Select value={editPackTargetAudience} onValueChange={setEditPackTargetAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B - Doanh nghiệp</SelectItem>
                  <SelectItem value="B2C">B2C - Người tiêu dùng</SelectItem>
                  <SelectItem value="B2B2C">B2B2C - Cả hai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name Vietnamese */}
            <div className="space-y-2">
              <Label>Tên tiếng Việt *</Label>
              <Input
                placeholder="vd: Tài chính - Ngân hàng"
                value={editPackNameVi}
                onChange={(e) => setEditPackNameVi(e.target.value)}
              />
            </div>

            {/* Name English */}
            <div className="space-y-2">
              <Label>Tên tiếng Anh</Label>
              <Input
                placeholder="vd: Finance & Banking"
                value={editPackNameEn}
                onChange={(e) => setEditPackNameEn(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPackId(null)}>
              Hủy
            </Button>
            <Button 
              onClick={handleUpdatePack}
              disabled={!editPackNameVi || isUpdatingPack}
            >
              {isUpdatingPack ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Glossary Editor Dialog */}
      {glossaryPackId && glossaryPack && (
        <IndustryGlossaryEditor
          open={!!glossaryPackId}
          onOpenChange={(open) => !open && setGlossaryPackId(null)}
          packId={glossaryPackId}
          packName={glossaryPack.name || glossaryPack.code || 'Pack'}
        />
      )}

      {/* Personas Editor Dialog */}
      {personasPackId && personasPack && (
        <IndustryPersonasEditor
          open={!!personasPackId}
          onOpenChange={(open) => !open && setPersonasPackId(null)}
          industryTemplateId={personasPackId}
          packName={personasPack.name || personasPack.code || 'Pack'}
        />
      )}
    </div>
  );
}
