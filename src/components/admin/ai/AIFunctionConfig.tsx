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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIConfig, AI_FUNCTIONS, AIFunctionType, AIFunctionConfig as FunctionConfigType, getModelInfo, ModelInfo } from '@/hooks/useAIConfig';
import { useOpenRouterModels, openRouterModelToModelInfo } from '@/hooks/useOpenRouterModels';
import { ModelSelector } from './ModelSelector';
import { ModelCard, QuickSelectButton, ProviderIndicator } from './ModelCard';
import { Settings, Check, X, Zap, MessageSquare, Lightbulb, Search, Image, Wand2, Type, Globe, ExternalLink, ChevronRight, Sparkles, Star, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AIFunctionConfigProps {
  organizationId?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  content: <Zap className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  ideation: <Lightbulb className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  brand: <Wand2 className="h-4 w-4" />,
  analysis: <Search className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  content: 'bg-blue-500/10 text-blue-500',
  chat: 'bg-green-500/10 text-green-500',
  ideation: 'bg-yellow-500/10 text-yellow-500',
  research: 'bg-purple-500/10 text-purple-500',
  image: 'bg-pink-500/10 text-pink-500',
  brand: 'bg-orange-500/10 text-orange-500',
  analysis: 'bg-cyan-500/10 text-cyan-500',
};

const TYPE_BADGES: Record<AIFunctionType, { label: string; className: string; icon: React.ReactNode }> = {
  text: { label: 'Text', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: <Type className="h-3 w-3" /> },
  image: { label: 'Image', className: 'bg-purple-500/20 text-purple-600 border-purple-500/30', icon: <Image className="h-3 w-3" /> },
  'image-direct': { label: 'Image (Direct)', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30', icon: <Image className="h-3 w-3" /> },
  search: { label: 'Search', className: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <Globe className="h-3 w-3" /> },
};

// Helper function to get function metadata
const getFunctionMeta = (functionName: string) => {
  return AI_FUNCTIONS.find(f => f.name === functionName);
};


// Quick select presets
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
    // Check hardcoded first
    const hardcodedInfo = getModelInfo(modelId);
    if (hardcodedInfo.description !== 'OpenRouter model') {
      return hardcodedInfo;
    }
    
    // Check dynamic OpenRouter models
    const orModel = openRouterModels?.find(m => m.id === modelId);
    if (orModel) {
      return openRouterModelToModelInfo(orModel);
    }
    
    // Fallback to basic info
    return hardcodedInfo;
  };

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

  const getConfiguredFunction = (name: string) => {
    // Get all configs for this function, then return the latest one
    const configs = functions.filter(f => f.functionName === name);
    if (configs.length === 0) return undefined;
    
    // Sort by updatedAt descending and return the first (latest)
    return configs.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  };

  const getCurrentQuickPreset = (): 'default' | 'fast' | 'quality' | 'custom' => {
    if (!editingFunction?.modelOverride) return 'default';
    if (editingFunction.modelOverride === QUICK_PRESETS.fast.model) return 'fast';
    if (editingFunction.modelOverride === QUICK_PRESETS.quality.model) return 'quality';
    return 'custom';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentFunctionMeta = editingFunction?.functionName ? getFunctionMeta(editingFunction.functionName) : null;
  const currentModel = editingFunction?.modelOverride || currentFunctionMeta?.currentModel || '';
  const currentModelInfo = getEnhancedModelInfo(currentModel);

  // Filter functions based on search query
  const filteredFunctions = useMemo(() => {
    if (!searchQuery.trim()) return AI_FUNCTIONS;
    const query = searchQuery.toLowerCase();
    return AI_FUNCTIONS.filter(fn => 
      fn.name.toLowerCase().includes(query) ||
      fn.description.toLowerCase().includes(query) ||
      fn.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-medium">Function Configuration</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cấu hình AI model và parameters cho từng edge function
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-full sm:w-[200px]"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {Object.entries(TYPE_BADGES).map(([type, badge]) => (
              <Badge key={type} variant="outline" className={`${badge.className} text-[10px] sm:text-xs`}>
                {badge.icon}
                <span className="ml-1 hidden xs:inline">{badge.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Function</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Model</TableHead>
                <TableHead>Cache TTL</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunctions.map((fn) => {
                const config = getConfiguredFunction(fn.name);
                const category = fn.category;
                const typeBadge = TYPE_BADGES[fn.type];
                const displayModel = config?.modelOverride || fn.currentModel;
                const modelInfo = getEnhancedModelInfo(displayModel);
                
                return (
                  <TableRow key={fn.name}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{fn.name}</p>
                        <p className="text-xs text-muted-foreground">{fn.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${typeBadge.className} text-xs`}>
                        {typeBadge.icon}
                        <span className="ml-1">{typeBadge.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={CATEGORY_COLORS[category]}>
                        <span className="mr-1">{CATEGORY_ICONS[category]}</span>
                        {category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              {/* Provider color indicator */}
                              <ProviderIndicator provider={modelInfo.provider} />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {modelInfo.shortName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {modelInfo.description}
                                </span>
                              </div>
                              {config?.modelOverride && (
                                <Badge variant="outline" className="text-xs">Override</Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold">{modelInfo.shortName}</p>
                              <p className="text-sm">{modelInfo.description}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span>Tốc độ: {modelInfo.speed}</span>
                                <span>•</span>
                                <span>Chất lượng: {modelInfo.quality}</span>
                                <span>•</span>
                                <span>Chi phí: {modelInfo.cost}</span>
                              </div>
                              {modelInfo.bestFor.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Phù hợp: {modelInfo.bestFor.join(', ')}
                                </p>
                              )}
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {displayModel}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {config?.cacheTtlHours || 24}h
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {config ? (
                        config.isEnabled ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" /> On
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" /> Off
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
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
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm sm:text-base">
              <span className="truncate">Cấu hình: {editingFunction?.functionName}</span>
              {editingFunction?.functionName && (
                <Badge variant="outline" className={cn(
                  TYPE_BADGES[getFunctionMeta(editingFunction.functionName)?.type || 'text'].className,
                  "text-[10px] sm:text-xs w-fit"
                )}>
                  {TYPE_BADGES[getFunctionMeta(editingFunction.functionName)?.type || 'text'].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {editingFunction && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Kích hoạt function</Label>
                <Switch
                  checked={editingFunction.isEnabled ?? true}
                  onCheckedChange={(checked) => setEditingFunction({ ...editingFunction, isEnabled: checked })}
                />
              </div>

              {/* Model Selection - New UI */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Chọn AI Model
                </Label>
                
                {/* Quick Select Buttons */}
                <div className="grid gap-1.5 sm:gap-2">
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
                    "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg border text-left transition-all",
                    getCurrentQuickPreset() === 'custom'
                      ? "border-primary bg-primary/5"
                      : "border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0",
                      getCurrentQuickPreset() === 'custom' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      {getCurrentQuickPreset() === 'custom' ? (
                        <>
                          <p className="font-medium text-xs sm:text-sm truncate">{currentModelInfo.shortName}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{currentModelInfo.description}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-xs sm:text-sm">Chọn model khác...</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {hasOpenRouterApiKey && currentFunctionMeta?.type === 'text'
                              ? 'Lovable AI + OpenRouter models'
                              : 'Xem tất cả models khả dụng'
                            }
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Current Selection Info */}
                {editingFunction.modelOverride && (
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                          Đang sử dụng
                        </Badge>
                        <span className="font-medium text-xs sm:text-sm truncate">{currentModelInfo.shortName}</span>
                        {currentModelInfo.provider === 'openrouter' && (
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-orange-500/20 text-orange-600 flex-shrink-0">
                            OR
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 flex-shrink-0"
                        onClick={() => setEditingFunction({ ...editingFunction, modelOverride: null })}
                      >
                        Reset
                      </Button>
                    </div>
                    <p className="text-[9px] sm:text-xs text-muted-foreground mt-1 font-mono truncate">
                      {editingFunction.modelOverride}
                    </p>
                  </div>
                )}
              </div>

              {getFunctionMeta(editingFunction.functionName!)?.type === 'text' && (
                <>
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
                </>
              )}

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
            </div>
          )}

          <DialogFooter>
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