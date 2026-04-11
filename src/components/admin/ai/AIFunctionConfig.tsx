import { useState, useMemo } from 'react';
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
import { Settings, Search, Image, Type, Globe, LayoutGrid, List, FolderOpen, Network } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AIFunctionConfigProps {
  organizationId?: string;
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Tất cả', icon: null },
  { id: 'text', label: 'Text', icon: <Type className="h-3 w-3" /> },
  { id: 'image', label: 'Image', icon: <Image className="h-3 w-3" /> },
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
  const [typeFilter, setTypeFilter] = useState('all');
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

  // Filter functions
  const filteredFunctions = useMemo(() => {
    let result = [...AI_FUNCTIONS] as AIFunction[];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(fn => 
        fn.name.toLowerCase().includes(query) ||
        fn.description.toLowerCase().includes(query) ||
        fn.category.toLowerCase().includes(query)
      );
    }
    
    if (typeFilter !== 'all') {
      // Check if it's a tag filter (knowledge-graph)
      if (typeFilter === 'knowledge-graph') {
        result = result.filter(fn => fn.tags?.includes('knowledge-graph'));
      } else if (typeFilter === 'image') {
        result = result.filter(fn => fn.type === 'image' || fn.type === 'image-direct');
      } else {
        result = result.filter(fn => fn.type === typeFilter);
      }
    }
    
    return result;
  }, [searchQuery, typeFilter]);

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
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 flex-wrap">
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
                  variant={typeFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    isTagFilter && typeFilter === filter.id && "bg-violet-600 hover:bg-violet-700",
                    isTagFilter && typeFilter !== filter.id && "border-violet-500/50 text-violet-600 hover:bg-violet-500/10"
                  )}
                  onClick={() => setTypeFilter(filter.id)}
                >
                  {filter.icon}
                  <span className={filter.icon ? "ml-1" : ""}>{filter.label}</span>
                  {filter.id !== 'all' && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 ml-auto">
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
              defaultExpanded={category === 'content' || category === 'ideation'}
              getEnhancedModelInfo={getEnhancedModelInfo}
              groupModelOverride={groupConfig?.modelOverride || null}
              getEffectiveModel={getEffectiveModel}
            />
          );
        })}

        {groupedFunctions.size === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Không tìm thấy function nào phù hợp</p>
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
                  {/* Current model display */}
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ProviderIndicator provider={currentModelInfo.provider} showLabel />
                        <span className="font-medium text-sm truncate">{currentModelInfo.shortName}</span>
                      </div>
                      {editingFunction.modelOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditingFunction({ ...editingFunction, modelOverride: null, forceProvider: null })}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{currentModelInfo.description}</p>
                    {editingFunction.modelOverride && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{editingFunction.modelOverride}</p>
                    )}
                    {!editingFunction.modelOverride && (
                      <p className="text-[10px] text-muted-foreground">Đang dùng model mặc định. Chọn model khác trực tiếp trên Function Card.</p>
                    )}
                  </div>

                  {/* Force Provider Toggle - only when override is set */}
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

                <TabsContent value="cache" className="mt-0 space-y-4">
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
