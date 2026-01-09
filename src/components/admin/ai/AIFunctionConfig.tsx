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
import { useAIConfig, AI_FUNCTIONS, AIFunctionType, AIFunctionConfig as FunctionConfigType, getModelInfo, ModelInfo } from '@/hooks/useAIConfig';
import { useOpenRouterModels, openRouterModelToModelInfo } from '@/hooks/useOpenRouterModels';
import { ModelSelector } from './ModelSelector';
import { QuickSelectButton, ProviderIndicator } from './ModelCard';
import { FunctionCategoryGroup } from './FunctionCategoryGroup';
import { AIFunction } from './FunctionCard';
import { Settings, Search, Zap, MessageSquare, Lightbulb, Image, Wand2, Type, Globe, ChevronRight, Sparkles, Star, LayoutGrid, List } from 'lucide-react';
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
];

const CATEGORY_ORDER = ['content', 'ideation', 'chat', 'brand', 'image', 'analysis', 'research'];

const QUICK_PRESETS = {
  default: { label: 'Mặc định', description: 'Model được khuyến nghị cho function này', icon: <Sparkles className="h-5 w-5" /> },
  fast: { label: 'Nhanh nhất', description: 'Gemini 2.5 Flash Lite - Phản hồi cực nhanh', icon: <Zap className="h-5 w-5" />, model: 'google/gemini-2.5-flash-lite' },
  quality: { label: 'Chất lượng cao', description: 'Gemini 3 Pro - Kết quả tốt nhất', icon: <Star className="h-5 w-5" />, model: 'google/gemini-3-pro-preview' },
};

export function AIFunctionConfigComponent({ organizationId }: AIFunctionConfigProps) {
  const { functions, providers, isLoading, upsertFunction } = useAIConfig(organizationId);
  const [editingFunction, setEditingFunction] = useState<Partial<FunctionConfigType> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
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
      result = result.filter(fn => {
        if (typeFilter === 'image') {
          return fn.type === 'image' || fn.type === 'image-direct';
        }
        return fn.type === typeFilter;
      });
    }
    
    return result;
  }, [searchQuery, typeFilter]);

  // Group functions by category
  const groupedFunctions = useMemo(() => {
    const groups = new Map<string, AIFunction[]>();
    
    filteredFunctions.forEach(fn => {
      const category = fn.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(fn);
    });

    // Sort by category order
    const sortedGroups = new Map<string, AIFunction[]>();
    CATEGORY_ORDER.forEach(category => {
      if (groups.has(category)) {
        sortedGroups.set(category, groups.get(category)!);
      }
    });
    // Add any remaining categories
    groups.forEach((fns, category) => {
      if (!sortedGroups.has(category)) {
        sortedGroups.set(category, fns);
      }
    });

    return sortedGroups;
  }, [filteredFunctions]);

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

  const getCurrentQuickPreset = (): 'default' | 'fast' | 'quality' | 'custom' => {
    if (!editingFunction?.modelOverride) return 'default';
    if (editingFunction.modelOverride === QUICK_PRESETS.fast.model) return 'fast';
    if (editingFunction.modelOverride === QUICK_PRESETS.quality.model) return 'quality';
    return 'custom';
  };

  const currentFunctionMeta = editingFunction?.functionName 
    ? AI_FUNCTIONS.find(f => f.name === editingFunction.functionName) 
    : null;
  const currentModel = editingFunction?.modelOverride || currentFunctionMeta?.currentModel || '';
  const currentModelInfo = getEnhancedModelInfo(currentModel);

  if (isLoading) {
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{stats.total} functions</Badge>
            {stats.overrides > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {stats.overrides} override
              </Badge>
            )}
            {stats.disabled > 0 && (
              <Badge variant="outline">{stats.disabled} disabled</Badge>
            )}
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
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={typeFilter === filter.id ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setTypeFilter(filter.id)}
              >
                {filter.icon}
                <span className={filter.icon ? "ml-1" : ""}>{filter.label}</span>
                {filter.id !== 'all' && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                    {AI_FUNCTIONS.filter(fn => {
                      if (filter.id === 'image') return fn.type === 'image' || fn.type === 'image-direct';
                      return fn.type === filter.id;
                    }).length}
                  </Badge>
                )}
              </Button>
            ))}
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

      {/* Function Groups */}
      <div className="space-y-3">
        {Array.from(groupedFunctions.entries()).map(([category, fns]) => (
          <FunctionCategoryGroup
            key={category}
            category={category}
            functions={fns}
            configs={configsMap}
            onEdit={openEditDialog}
            onQuickModelChange={handleQuickModelChange}
            onBulkReset={handleBulkReset}
            defaultExpanded={category === 'content' || category === 'ideation'}
            getEnhancedModelInfo={getEnhancedModelInfo}
          />
        ))}

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
            <Tabs defaultValue="model" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="model" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                >
                  Model
                </TabsTrigger>
                {currentFunctionMeta?.type === 'text' && (
                  <TabsTrigger 
                    value="params" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                  >
                    Parameters
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="cache" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs sm:text-sm"
                >
                  Cache & Priority
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

                <TabsContent value="model" className="mt-0 space-y-3">
                  {/* Quick Select Buttons */}
                  <div className="grid gap-2">
                    <QuickSelectButton
                      label={QUICK_PRESETS.default.label}
                      description={`${currentFunctionMeta?.currentModel ? getModelInfo(currentFunctionMeta.currentModel).shortName : 'Auto'} - ${QUICK_PRESETS.default.description}`}
                      icon={QUICK_PRESETS.default.icon}
                      isSelected={getCurrentQuickPreset() === 'default'}
                      onClick={() => setEditingFunction({ ...editingFunction, modelOverride: null })}
                    />
                    
                    {currentFunctionMeta?.type === 'text' && (
                      <>
                        <QuickSelectButton
                          label={QUICK_PRESETS.fast.label}
                          description={QUICK_PRESETS.fast.description}
                          icon={QUICK_PRESETS.fast.icon}
                          isSelected={getCurrentQuickPreset() === 'fast'}
                          onClick={() => setEditingFunction({ ...editingFunction, modelOverride: QUICK_PRESETS.fast.model })}
                        />
                        <QuickSelectButton
                          label={QUICK_PRESETS.quality.label}
                          description={QUICK_PRESETS.quality.description}
                          icon={QUICK_PRESETS.quality.icon}
                          isSelected={getCurrentQuickPreset() === 'quality'}
                          onClick={() => setEditingFunction({ ...editingFunction, modelOverride: QUICK_PRESETS.quality.model })}
                        />
                      </>
                    )}
                  </div>

                  {/* Custom Model Selection */}
                  <button
                    onClick={() => setIsModelSelectorOpen(true)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                      getCurrentQuickPreset() === 'custom'
                        ? "border-primary bg-primary/5"
                        : "border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        getCurrentQuickPreset() === 'custom' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Settings className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        {getCurrentQuickPreset() === 'custom' ? (
                          <>
                            <p className="font-medium text-sm truncate">{currentModelInfo.shortName}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentModelInfo.description}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm">Chọn model khác...</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {hasOpenRouterApiKey && currentFunctionMeta?.type === 'text'
                                ? 'Lovable AI + OpenRouter models'
                                : 'Xem tất cả models khả dụng'
                              }
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>

                  {/* Current Selection Info */}
                  {editingFunction.modelOverride && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ProviderIndicator provider={currentModelInfo.provider} />
                          <span className="font-medium text-sm truncate">{currentModelInfo.shortName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditingFunction({ ...editingFunction, modelOverride: null })}
                        >
                          Reset
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                        {editingFunction.modelOverride}
                      </p>
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

      {/* Model Selector Dialog */}
      {editingFunction && (
        <ModelSelector
          open={isModelSelectorOpen}
          onOpenChange={setIsModelSelectorOpen}
          selectedModel={editingFunction.modelOverride || null}
          onSelectModel={(model) => setEditingFunction({ ...editingFunction, modelOverride: model })}
          functionType={currentFunctionMeta?.type || 'text'}
          defaultModel={currentFunctionMeta?.currentModel || 'google/gemini-2.5-flash'}
          hasOpenRouterApiKey={hasOpenRouterApiKey}
        />
      )}
    </div>
  );
}
