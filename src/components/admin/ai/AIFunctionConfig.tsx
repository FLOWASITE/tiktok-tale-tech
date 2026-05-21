import { useState, useMemo, useDeferredValue } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useAIConfig, AI_FUNCTIONS, AIFunctionType, AIFunctionTag, AIFunctionConfig as FunctionConfigType, getModelInfo, ModelInfo } from '@/hooks/useAIConfig';
import { useGroupModelConfig } from '@/hooks/useGroupModelConfig';
import { useOpenRouterModels, openRouterModelToModelInfo } from '@/hooks/useOpenRouterModels';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { ProviderIndicator } from './ModelCard';

import { FunctionCategoryGroup } from './FunctionCategoryGroup';
import { CategoryManager } from './CategoryManager';
import { GroupDefaultsPanel } from './GroupDefaultsPanel';
import { AIFunction } from './FunctionCard';
import { countByTag } from './FunctionTagBadges';
import { Settings, Search, Image, Type, Globe, LayoutGrid, List, FolderOpen, Network, Video, Music, Film, X as XIcon, ChevronDown } from 'lucide-react';
import { getVideoModelCaps, VIDEO_PROVIDER_LABEL } from '@/lib/videoModelCaps';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  smartSearchFunctions,
  parseQuery,
  type FunctionStatus,
  type FunctionProvider,
} from '@/lib/functionConfigSearch';

interface AIFunctionConfigProps {
  organizationId?: string;
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Tất cả', icon: null },
  { id: 'text', label: 'Text', icon: <Type className="h-3 w-3" /> },
  { id: 'image', label: 'Image', icon: <Image className="h-3 w-3" /> },
  { id: 'video', label: 'Video', icon: <Video className="h-3 w-3" /> },
  { id: 'audio', label: 'Audio', icon: <Music className="h-3 w-3" /> },
  { id: 'search', label: 'Search', icon: <Globe className="h-3 w-3" /> },
  { id: 'knowledge-graph', label: 'Knowledge Graph', icon: <Network className="h-3 w-3" />, isTagFilter: true },
];


export function AIFunctionConfigComponent({ organizationId }: AIFunctionConfigProps) {
  const { functions, providers, isLoading, upsertFunction } = useAIConfig(organizationId);
  const { getGroupConfig, getEffectiveModel } = useGroupModelConfig(organizationId);
  const { categories, isLoading: categoriesLoading, getCategoryConfig } = useCategoryConfig(organizationId);
  const [editingFunction, setEditingFunction] = useState<Partial<FunctionConfigType> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<FunctionStatus[]>([]);
  const [providerFilter, setProviderFilter] = useState<FunctionProvider[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Check if OpenRouter provider has API key configured
  const hasOpenRouterApiKey = useMemo(() => {
    return providers.some(
      p => p.providerType === 'openrouter' && p.encryptedApiKey && p.isActive
    );
  }, [providers]);

  // Fetch OpenRouter models for enhanced model info
  const { data: openRouterModels } = useOpenRouterModels(hasOpenRouterApiKey);

  // Enhanced getModelInfo that uses dynamic OpenRouter data
  const getEnhancedModelInfo = (modelId: string): ModelInfo => {
    const hardcodedInfo = getModelInfo(modelId);
    if (hardcodedInfo.description !== 'OpenRouter model') {
      return hardcodedInfo;
    }
    const orModel = openRouterModels?.find(m => m.id === modelId);
    if (orModel) {
      return openRouterModelToModelInfo(orModel);
    }
    return hardcodedInfo;
  };

  // Build configs map for quick lookup
  const configsMap = useMemo(() => {
    const map = new Map<string, FunctionConfigType>();
    functions.forEach(config => {
      const existing = map.get(config.functionName);
      if (!existing || new Date(config.updatedAt) > new Date(existing.updatedAt)) {
        map.set(config.functionName, config);
      }
    });
    return map;
  }, [functions]);

  // Parse query to extract free-text terms (for <mark> highlight)
  const parsedQuery = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);
  const highlightTerms = useMemo(
    () => (parsedQuery.freeTokens.length ? parsedQuery.freeTokens : []),
    [parsedQuery],
  );

  // Pre-filter by type tab (legacy behavior), then run smart search + chip filters
  const filteredFunctions = useMemo(() => {
    let pool = [...AI_FUNCTIONS] as AIFunction[];

    if (typeFilter !== 'all') {
      if (typeFilter === 'knowledge-graph') {
        pool = pool.filter(fn => fn.tags?.includes('knowledge-graph'));
      } else if (typeFilter === 'image') {
        pool = pool.filter(fn => fn.type === 'image' || fn.type === 'image-direct');
      } else {
        pool = pool.filter(fn => fn.type === typeFilter);
      }
    }

    const scored = smartSearchFunctions(pool, {
      query: deferredQuery,
      configsMap,
      statusFilter,
      providerFilter,
      categoryFilter,
      getModelInfo: getEnhancedModelInfo,
    });

    return scored.map(s => s.item);
  }, [deferredQuery, typeFilter, statusFilter, providerFilter, categoryFilter, configsMap]);

  const hasActiveFilters =
    !!deferredQuery.trim() ||
    typeFilter !== 'all' ||
    statusFilter.length > 0 ||
    providerFilter.length > 0 ||
    categoryFilter.length > 0;

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter([]);
    setProviderFilter([]);
    setCategoryFilter([]);
  };

  const toggleInArray = <T,>(arr: T[], value: T, setter: (v: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]);
  };

  // Count Knowledge Graph functions
  const kgCount = useMemo(() => countByTag(AI_FUNCTIONS as unknown as { tags?: AIFunctionTag[] }[], 'knowledge-graph'), []);

  // Group functions by category using database categories
  const groupedFunctions = useMemo(() => {
    const groups = new Map<string, AIFunction[]>();
    const knownSlugs = categories.map(c => c.slug);
    
    filteredFunctions.forEach(fn => {
      // Check if category exists in database categories
      const categorySlug = knownSlugs.includes(fn.category) ? fn.category : 'other';
      if (!groups.has(categorySlug)) {
        groups.set(categorySlug, []);
      }
      groups.get(categorySlug)!.push(fn);
    });

    // Sort by category order from database
    const sortedGroups = new Map<string, AIFunction[]>();
    categories.forEach(category => {
      if (groups.has(category.slug)) {
        sortedGroups.set(category.slug, groups.get(category.slug)!);
      }
    });
    // Add any remaining categories (edge case)
    groups.forEach((fns, category) => {
      if (!sortedGroups.has(category)) {
        sortedGroups.set(category, fns);
      }
    });

    return sortedGroups;
  }, [filteredFunctions, categories]);

  // Count unknown functions for CategoryManager
  const unknownFunctionsCount = useMemo(() => {
    return groupedFunctions.get('other')?.length || 0;
  }, [groupedFunctions]);

  // Stats
  const stats = useMemo(() => {
    const total = AI_FUNCTIONS.length;
    const overrides = functions.filter(f => f.modelOverride).length;
    const disabled = functions.filter(f => !f.isEnabled).length;
    return { total, overrides, disabled };
  }, [functions]);

  const handleSaveFunction = () => {
    if (!editingFunction?.functionName) return;
    upsertFunction({
      ...editingFunction,
      functionName: editingFunction.functionName,
      temperature: editingFunction.temperature ?? null,
      maxTokens: editingFunction.maxTokens ?? null,
    });
    setIsDialogOpen(false);
    setEditingFunction(null);
  };

  const handleQuickModelChange = (functionName: string, model: string | null) => {
    const existingConfig = configsMap.get(functionName);
    upsertFunction({
      functionName,
      modelOverride: model,
      isEnabled: existingConfig?.isEnabled ?? true,
      cacheTtlHours: existingConfig?.cacheTtlHours ?? 24,
      priorityLevel: existingConfig?.priorityLevel ?? 'normal',
      temperature: existingConfig?.temperature ?? null,
      maxTokens: existingConfig?.maxTokens ?? null,
    });
  };

  const handleBulkReset = (functionNames: string[]) => {
    functionNames.forEach(name => {
      const existingConfig = configsMap.get(name);
      if (existingConfig?.modelOverride) {
        upsertFunction({
          functionName: name,
          modelOverride: null,
          isEnabled: existingConfig.isEnabled,
          cacheTtlHours: existingConfig.cacheTtlHours,
          priorityLevel: existingConfig.priorityLevel,
          temperature: existingConfig.temperature,
          maxTokens: existingConfig.maxTokens,
        });
      }
    });
  };

  const openEditDialog = (fn: AIFunction) => {
    const config = configsMap.get(fn.name);
    setEditingFunction(config || { 
      functionName: fn.name,
      isEnabled: true,
      cacheTtlHours: 24,
      priorityLevel: 'normal',
      temperature: 0.7,
      maxTokens: null,
      parameters: {},
    });
    setIsDialogOpen(true);
  };


  const currentFunctionMeta = editingFunction?.functionName 
    ? AI_FUNCTIONS.find(f => f.name === editingFunction.functionName) 
    : null;
  const currentModel = editingFunction?.modelOverride || currentFunctionMeta?.currentModel || '';
  const currentModelInfo = getEnhancedModelInfo(currentModel);

  if (isLoading || categoriesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-medium">Function Configuration</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Cấu hình AI model và parameters cho từng edge function
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Badge variant="secondary">{stats.total} functions</Badge>
            {stats.overrides > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {stats.overrides} override
              </Badge>
            )}
            {stats.disabled > 0 && (
              <Badge variant="outline">{stats.disabled} disabled</Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setIsCategoryManagerOpen(true)}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Categories
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + View toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm: tên, model, tag, hoặc status:override..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-9 w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 sm:ml-auto">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Type filter pills (scrollable on mobile) */}
          <div className="flex items-center gap-1 flex-wrap overflow-x-auto sm:overflow-visible -mx-1 px-1">
            {TYPE_FILTERS.map((filter) => {
              const isTagFilter = 'isTagFilter' in filter && filter.isTagFilter;
              const count = isTagFilter
                ? kgCount
                : AI_FUNCTIONS.filter(fn => {
                    if (filter.id === 'image') return fn.type === 'image' || fn.type === 'image-direct';
                    return fn.type === filter.id;
                  }).length;

              return (
                <Button
                  key={filter.id}
                  variant={typeFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs shrink-0',
                    isTagFilter && typeFilter === filter.id && 'bg-violet-600 hover:bg-violet-700',
                    isTagFilter && typeFilter !== filter.id && 'border-violet-500/50 text-violet-600 hover:bg-violet-500/10',
                  )}
                  onClick={() => setTypeFilter(filter.id)}
                >
                  {filter.icon}
                  <span className={filter.icon ? 'ml-1' : ''}>{filter.label}</span>
                  {filter.id !== 'all' && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Row 3: Advanced chips — Status / Provider / Category multi-select */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground mr-0.5">Status:</span>
              {(['override', 'default', 'disabled'] as FunctionStatus[]).map(s => (
                <Button
                  key={s}
                  variant={statusFilter.includes(s) ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-[11px] capitalize shrink-0"
                  onClick={() => toggleInArray(statusFilter, s, setStatusFilter)}
                >
                  {s}
                </Button>
              ))}
            </div>

            {/* Provider */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground mr-0.5">Provider:</span>
              {(['lovable', 'openrouter', 'ninerouter', 'dashscope', 'deepseek'] as FunctionProvider[]).map(p => (
                <Button
                  key={p}
                  variant={providerFilter.includes(p) ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-[11px] shrink-0"
                  onClick={() => toggleInArray(providerFilter, p, setProviderFilter)}
                >
                  {p === 'ninerouter' ? '9Router' : p === 'openrouter' ? 'OpenRouter' : p === 'dashscope' ? 'DashScope' : p === 'deepseek' ? 'DeepSeek' : 'Lovable'}
                </Button>
              ))}
            </div>

            {/* Category multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px] shrink-0">
                  Categories
                  {categoryFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                      {categoryFilter.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {categories.map(c => (
                    <label
                      key={c.slug}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={categoryFilter.includes(c.slug)}
                        onCheckedChange={() => toggleInArray(categoryFilter, c.slug, setCategoryFilter)}
                      />
                      <span className="truncate">{c.label || c.slug}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                <XIcon className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            )}

            {(deferredQuery.trim() || statusFilter.length || providerFilter.length || categoryFilter.length) ? (
              <Badge variant="outline" className="ml-auto text-[10px]">
                {filteredFunctions.length} kết quả
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Group Defaults */}
      <GroupDefaultsPanel organizationId={organizationId} functionConfigs={configsMap} />

      {/* Function Groups */}
      <div className="space-y-3">
        {Array.from(groupedFunctions.entries()).map(([category, fns]) => {
          // Determine dominant function type for this category to find group override
          const dominantType = fns[0]?.type === 'image' || fns[0]?.type === 'image-direct' ? 'image' : fns[0]?.type || 'text';
          const groupConfig = getGroupConfig(dominantType);
          
          return (
            <FunctionCategoryGroup
              key={category}
              category={category}
              functions={fns}
              configs={configsMap}
              onEdit={openEditDialog}
              onQuickModelChange={handleQuickModelChange}
              onBulkReset={handleBulkReset}
              categoryConfig={getCategoryConfig(category)}
              defaultExpanded={category === 'content' || category === 'ideation' || !!deferredQuery.trim()}
              getEnhancedModelInfo={getEnhancedModelInfo}
              groupModelOverride={groupConfig?.modelOverride || null}
              getEffectiveModel={getEffectiveModel}
              highlightTerms={highlightTerms}
            />
          );
        })}

        {groupedFunctions.size === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-muted-foreground">Không tìm thấy function nào phù hợp</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <XIcon className="h-3.5 w-3.5 mr-1" />
                  Xóa bộ lọc
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Settings className="h-4 w-4" />
              <span className="truncate">{editingFunction?.functionName}</span>
              {currentFunctionMeta && (
                <Badge variant="outline" className="text-[10px]">
                  {currentFunctionMeta.type}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {editingFunction && (
            <Tabs defaultValue={currentFunctionMeta?.type === 'text' ? 'params' : 'settings'} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                {currentFunctionMeta?.type === 'text' && (
                  <TabsTrigger 
                    value="params" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                  >
                    Parameters
                  </TabsTrigger>
                )}
                {editingFunction?.functionName === 'generate-video' && (
                  <TabsTrigger 
                    value="video" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                  >
                    <Film className="h-3 w-3 mr-1.5" />
                    Video Defaults
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="settings" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <Label className="text-sm font-medium">Kích hoạt function</Label>
                  <Switch
                    checked={editingFunction.isEnabled ?? true}
                    onCheckedChange={(checked) => setEditingFunction({ ...editingFunction, isEnabled: checked })}
                  />
                </div>

                {/* Current model info - compact display */}
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ProviderIndicator provider={currentModelInfo.provider} showLabel />
                      <span className="font-medium text-sm truncate">{currentModelInfo.shortName}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0">Chọn model trên Card</p>
                  </div>
                </div>

                <TabsContent value="params" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Temperature: {editingFunction.temperature ?? 0.7}</Label>
                    <Slider
                      value={[editingFunction.temperature ?? 0.7]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([value]) => setEditingFunction({ 
                        ...editingFunction, 
                        temperature: value,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      0 = Deterministic, 2 = Creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={editingFunction.maxTokens || ''}
                      onChange={(e) => setEditingFunction({ 
                        ...editingFunction, 
                        maxTokens: e.target.value ? parseInt(e.target.value) : null,
                      })}
                      placeholder="Default (auto)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Giới hạn tokens output. Để trống = auto
                    </p>
                  </div>
                </TabsContent>

                {editingFunction.functionName === 'generate-video' && (() => {
                  const activeModel = editingFunction.modelOverride || 'geminigen/veo-3.1-fast';
                  const caps = getVideoModelCaps(activeModel);
                  const params = (editingFunction.parameters || {}) as Record<string, any>;
                  const updateParam = (key: string, value: any) => setEditingFunction({
                    ...editingFunction,
                    parameters: { ...params, [key]: value },
                  });
                  return (
                    <TabsContent value="video" className="mt-0 space-y-4">
                      <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Model active:</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{activeModel}</Badge>
                        </div>
                        <div className="text-muted-foreground">
                          Provider: <b>{VIDEO_PROVIDER_LABEL[caps.provider]}</b> · Max duration: <b>{caps.maxDuration}s</b>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Default duration (giây)</Label>
                        <Select
                          value={String(params.default_duration ?? caps.durationChoices[0])}
                          onValueChange={(v) => updateParam('default_duration', parseInt(v, 10))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {caps.durationChoices.map(d => (
                              <SelectItem key={d} value={String(d)}>{d}s</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Áp dụng khi client (vd. agent pipeline) không gửi duration. UI scene editor vẫn override được.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Default aspect ratio</Label>
                        <Select
                          value={params.default_aspect_ratio ?? caps.aspectRatios[0]}
                          onValueChange={(v) => updateParam('default_aspect_ratio', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {caps.aspectRatios.map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Default resolution</Label>
                        <Select
                          value={params.default_resolution ?? caps.resolutionChoices[caps.resolutionChoices.length - 1]}
                          onValueChange={(v) => updateParam('default_resolution', v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {caps.resolutionChoices.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="text-[10px] text-muted-foreground p-2.5 rounded bg-amber-500/5 border border-amber-500/20">
                        💡 Đây là <b>fallback defaults</b> — khi user click Generate trên VideoGeneratorPanel,
                        giá trị họ chọn sẽ override. Defaults này chỉ áp dụng cho agent pipelines hoặc API calls không truyền tham số.
                      </div>
                    </TabsContent>
                  );
                })()}

                <TabsContent value="settings" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Cache TTL (giờ)</Label>
                    <Input
                      type="number"
                      value={editingFunction.cacheTtlHours ?? 24}
                      onChange={(e) => setEditingFunction({ 
                        ...editingFunction, 
                        cacheTtlHours: parseInt(e.target.value) || 24
                      })}
                      min={1}
                      max={168}
                    />
                    <p className="text-xs text-muted-foreground">
                      Thời gian cache response (1-168 giờ)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority Level</Label>
                    <Select
                      value={editingFunction.priorityLevel || 'normal'}
                      onValueChange={(value) => setEditingFunction({ ...editingFunction, priorityLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Queue)</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High (Priority)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editingFunction.modelOverride && (
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium">Force OpenRouter</Label>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Bỏ qua Lovable Gateway, dùng OpenRouter API key
                        </p>
                      </div>
                      <Switch
                        checked={editingFunction.forceProvider === 'openrouter'}
                        onCheckedChange={(checked) => setEditingFunction({
                          ...editingFunction,
                          forceProvider: checked ? 'openrouter' : null,
                        })}
                        disabled={!hasOpenRouterApiKey}
                      />
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}

          <DialogFooter className="p-4 pt-0 sm:p-6 sm:pt-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveFunction}>
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Category Manager Dialog */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý Categories</DialogTitle>
          </DialogHeader>
          <CategoryManager 
            organizationId={organizationId} 
            unknownFunctionsCount={unknownFunctionsCount}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
