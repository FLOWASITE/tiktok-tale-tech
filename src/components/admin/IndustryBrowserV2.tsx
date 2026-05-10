/**
 * IndustryBrowserV2 - Scientific industry classification browser
 * Features: Category sidebar, advanced filters, Core/Sub tabs, multi-mode search
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIndustryHierarchy, useIndustryTree, useIndustryStats } from '@/hooks/useIndustryHierarchy';
import { useUpdateGlobalPack } from '@/hooks/useGlobalPack';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  Eye,
  Globe,
  MapPin,
  Users,
  Briefcase,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Building2,
  FolderTree,
  Grid3X3,
  List,
  Filter,
  X,
  Code,
  ShoppingCart,
  Heart,
  Zap,
  Home,
  Truck,
  GraduationCap,
  Stethoscope,
  Utensils,
  Factory,
  Leaf,
  Gamepad2,
  Plane,
  Megaphone,
  Wrench,
  Building,
  Cpu,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IndustryPackWithChildren, IndustryGlobalPack } from '@/types/industryParkV2';

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  finance: Briefcase,
  technology: Cpu,
  commerce: ShoppingCart,
  services: Users,
  lifestyle: Heart,
  healthcare: Stethoscope,
  education: GraduationCap,
  real_estate: Building,
  logistics: Truck,
  manufacturing: Factory,
  food: Utensils,
  energy: Zap,
  environment: Leaf,
  gaming: Gamepad2,
  travel: Plane,
  media: Megaphone,
  construction: Wrench,
  agriculture: Leaf,
  mining: Factory,
  wholesale: ShoppingCart,
};

interface IndustryBrowserV2Props {
  onSelectPack?: (packId: string) => void;
  selectedPackId?: string | null;
}

interface CategoryItem {
  id: string;
  code: string;
  label: string;
  icon_name: string | null;
  color: string | null;
  count: number;
}

type ViewMode = 'tree' | 'grid' | 'list';
type LevelFilter = 'all' | 'core' | 'sub';

export function IndustryBrowserV2({ onSelectPack, selectedPackId }: IndustryBrowserV2Props) {
  // State
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('industryBrowser.sidebarCollapsed') === '1';
  });
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('industryBrowser.sidebarCollapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Fetch categories with counts
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['industry-categories-with-counts', showActiveOnly],
    queryFn: async () => {
      // Get categories
      const { data: cats, error: catError } = await supabase
        .from('industry_categories')
        .select('id, code, label, icon_name, color')
        .eq('is_active', true)
        .order('sort_order');

      if (catError) throw catError;

      // Get counts per category
      let countQuery = supabase
        .from('industry_global_packs')
        .select('category_id');
        
      if (showActiveOnly) {
        countQuery = countQuery.eq('is_active', true);
      }

      const { data: counts, error: countError } = await countQuery;
      if (countError) throw countError;

      // Build counts map
      const countMap = new Map<string, number>();
      counts?.forEach(p => {
        if (p.category_id) {
          countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
        }
      });

      return (cats || []).map(cat => ({
        ...cat,
        count: countMap.get(cat.id) || 0,
      })) as CategoryItem[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch industries based on filters
  const { data: treeData, isLoading, refetch } = useIndustryTree({
    categoryId: selectedCategory,
    activeOnly: showActiveOnly,
    languageCode: 'vi',
  });

  const { data: stats } = useIndustryStats();
  const { mutate: updatePack } = useUpdateGlobalPack();

  // Filter and search logic
  const filteredData = useMemo(() => {
    if (!treeData) return [];

    let result = [...treeData];

    // Level filter
    if (levelFilter === 'core') {
      result = result.map(pack => ({ ...pack, children: [] }));
    } else if (levelFilter === 'sub') {
      // Flatten and show only subs
      const allSubs: IndustryPackWithChildren[] = [];
      result.forEach(pack => {
        if (pack.children?.length) {
          pack.children.forEach(child => {
            allSubs.push({ ...child, children: [] } as IndustryPackWithChildren);
          });
        }
      });
      return allSubs.filter(pack => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        const name = (pack as any).name || pack.industry_code;
        return pack.industry_code.toLowerCase().includes(searchLower) ||
               name.toLowerCase().includes(searchLower);
      });
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(pack => {
        const name = (pack as any).name || pack.industry_code;
        const matchesPack = 
          pack.industry_code.toLowerCase().includes(searchLower) ||
          name.toLowerCase().includes(searchLower);
        
        const matchesChildren = pack.children?.some(child => {
          const childName = (child as any).name || child.industry_code;
          return child.industry_code.toLowerCase().includes(searchLower) ||
                 childName.toLowerCase().includes(searchLower);
        });
        
        return matchesPack || matchesChildren;
      });
    }

    return result;
  }, [treeData, search, levelFilter]);

  // Handlers
  const handleToggleActive = useCallback((packId: string, currentActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updatePack(
      { packId, updates: { is_active: !currentActive } },
      {
        onSuccess: () => {
          toast.success(currentActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
          refetch();
        },
        onError: () => toast.error('Lỗi khi cập nhật'),
      }
    );
  }, [updatePack, refetch]);

  const toggleExpand = useCallback((packId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPacks(prev => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!filteredData) return;
    const allIds = filteredData.filter(p => p.children && p.children.length > 0).map(p => p.id);
    setExpandedPacks(new Set(allIds));
  }, [filteredData]);

  const collapseAll = useCallback(() => {
    setExpandedPacks(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory(null);
    setLevelFilter('all');
  }, []);

  const hasActiveFilters = search || selectedCategory || levelFilter !== 'all';

  // Config
  const targetAudienceConfig: Record<string, { icon: LucideIcon; color: string }> = {
    B2B: { icon: Briefcase, color: 'text-blue-500 bg-blue-500/10' },
    B2C: { icon: Users, color: 'text-green-500 bg-green-500/10' },
    both: { icon: Globe, color: 'text-purple-500 bg-purple-500/10' },
  };

  const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    core: { label: 'Core', color: 'text-primary', bgColor: 'bg-primary/10' },
    sub: { label: 'Sub', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  };

  // Get icon for category
  const getCategoryIcon = (iconName: string | null): LucideIcon => {
    if (!iconName) return Layers;
    return CATEGORY_ICONS[iconName.toLowerCase()] || Layers;
  };

  // Render industry row (for tree view)
  const renderPackRow = (pack: IndustryPackWithChildren, isChild = false) => {
    const targetConfig = targetAudienceConfig[pack.target_audience] || targetAudienceConfig.both;
    const TargetIcon = targetConfig.icon;
    const isSelected = selectedPackId === pack.id;
    const hasChildren = pack.children && pack.children.length > 0;
    const isExpanded = expandedPacks.has(pack.id);
    const level = levelConfig[pack.industry_level || 'core'];
    const name = (pack as any).name || pack.industry_code;

    return (
      <div key={pack.id}>
        <div
          className={`
            flex items-center gap-2 p-3 cursor-pointer transition-all border-b
            ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'}
            ${isChild ? 'pl-10 bg-muted/20' : ''}
          `}
          onClick={() => onSelectPack?.(pack.id)}
        >
          {/* Expand/Collapse */}
          <div className="w-5 flex-shrink-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => toggleExpand(pack.id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : null}
          </div>

          {/* Icon */}
          <div className={`p-1.5 rounded ${isChild ? 'bg-muted' : level.bgColor}`}>
            {isChild ? (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Layers className={`h-3.5 w-3.5 ${level.color}`} />
            )}
          </div>

          {/* Code & Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono font-medium">
                {pack.industry_code}
              </code>
              {!isChild && hasChildren && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {pack.children.length} sub
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm mt-0.5 truncate">{name}</p>
          </div>

          {/* Target Audience */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={`flex-shrink-0 h-6 ${targetConfig.color}`}>
                  <TargetIcon className="h-3 w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pack.target_audience}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status */}
          {pack.is_active ? (
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelectPack?.(pack.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleToggleActive(pack.id, pack.is_active, e as unknown as React.MouseEvent)}>
                {pack.is_active ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Vô hiệu hóa
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Kích hoạt
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {pack.children.map(child => renderPackRow({ ...child, children: [] } as IndustryPackWithChildren, true))}
          </div>
        )}
      </div>
    );
  };

  // Render grid item
  const renderGridItem = (pack: IndustryPackWithChildren | IndustryGlobalPack) => {
    const targetConfig = targetAudienceConfig[pack.target_audience] || targetAudienceConfig.both;
    const TargetIcon = targetConfig.icon;
    const isSelected = selectedPackId === pack.id;
    const level = levelConfig[pack.industry_level || 'core'];
    const name = (pack as any).name || pack.industry_code;
    const packWithChildren = pack as IndustryPackWithChildren;
    const childCount = packWithChildren.children?.length || 0;

    return (
      <Card
        key={pack.id}
        className={`
          cursor-pointer transition-all hover:shadow-md
          ${isSelected ? 'ring-2 ring-primary' : ''}
        `}
        onClick={() => onSelectPack?.(pack.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${level.bgColor}`}>
              <Layers className={`h-4 w-4 ${level.color}`} />
            </div>
            <Badge variant="outline" className={level.bgColor + ' ' + level.color}>
              {level.label}
            </Badge>
          </div>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono block mb-1">
            {pack.industry_code}
          </code>
          <p className="font-medium text-sm line-clamp-2">{name}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Badge className={`h-5 text-[10px] ${targetConfig.color}`}>
              <TargetIcon className="h-2.5 w-2.5 mr-0.5" />
              {pack.target_audience}
            </Badge>
            {childCount > 0 && (
              <span className="text-xs text-muted-foreground">{childCount} sub</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalCategories = categories?.length || 0;
  const totalFiltered = useMemo(() => {
    if (levelFilter === 'sub') return filteredData.length;
    return filteredData.reduce((acc, pack) => {
      return acc + 1 + (pack.children?.length || 0);
    }, 0);
  }, [filteredData, levelFilter]);

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Category Sidebar */}
      <Card className="w-72 flex-shrink-0">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Danh mục ({totalCategories})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="px-2 pb-2">
              {/* All categories option */}
              <button
                className={`
                  w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors
                  flex items-center justify-between gap-2
                  ${!selectedCategory ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}
                `}
                onClick={() => setSelectedCategory(null)}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Tất cả</span>
                </div>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {stats?.total || 0}
                </Badge>
              </button>

              {/* Category list */}
              {categoriesLoading ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                categories?.filter(cat => cat.count > 0).map(cat => {
                  const Icon = getCategoryIcon(cat.icon_name);
                  const isSelected = selectedCategory === cat.id;
                  
                  return (
                    <button
                      key={cat.id}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors
                        flex items-center justify-between gap-2
                        ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}
                      `}
                      onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon 
                          className="h-4 w-4 flex-shrink-0" 
                          style={{ color: cat.color || undefined }}
                        />
                        <span className="text-sm truncate">{cat.label}</span>
                      </div>
                      <Badge variant="secondary" className="h-5 text-[10px] flex-shrink-0">
                        {cat.count}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          {/* Top bar with stats and view mode */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Industry Packs
              </CardTitle>
              {stats && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-primary/5">
                    {stats.coreCount} Core
                  </Badge>
                  <Badge variant="outline" className="bg-orange-500/5 text-orange-600">
                    {stats.subCount} Sub
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('tree')}
                >
                  <FolderTree className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="h-7" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm code hoặc tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Level filter tabs */}
            <Tabs value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs h-7">
                  Tất cả
                </TabsTrigger>
                <TabsTrigger value="core" className="text-xs h-7">
                  <Layers className="h-3 w-3 mr-1" />
                  Core
                </TabsTrigger>
                <TabsTrigger value="sub" className="text-xs h-7">
                  <Building2 className="h-3 w-3 mr-1" />
                  Sub
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Active filter */}
            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              {showActiveOnly ? 'Active' : 'Tất cả'}
            </Button>

            {/* Expand/Collapse (only for tree view) */}
            {viewMode === 'tree' && levelFilter !== 'sub' && (
              <>
                <Button variant="outline" size="sm" className="h-9" onClick={expandAll}>
                  Mở rộng
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={collapseAll}>
                  Thu gọn
                </Button>
              </>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* Active filters indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Đang hiển thị {totalFiltered} kết quả</span>
              {selectedCategory && categories && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === selectedCategory)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory(null)} />
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !filteredData.length ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderTree className="h-12 w-12 mb-2 opacity-50" />
              <p>Không tìm thấy Industry Pack nào</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <ScrollArea className="h-full">
              <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredData.map(pack => renderGridItem(pack))}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y">
                {filteredData.map(pack => renderPackRow(pack))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
