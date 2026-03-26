import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModelCard } from './ModelCard';
import { 
  MODELS_BY_TYPE, 
  MODELS_BY_PROVIDER, 
  getModelInfo,
  isKieModel,
  isPoyoModel,
  isDashScopeModel,
  AIFunctionType,
  ModelInfo 
} from '@/hooks/useAIConfig';
import { useOpenRouterModels, openRouterModelToModelInfo, groupModelsByProvider } from '@/hooks/useOpenRouterModels';
import { Search, Sparkles, ExternalLink, Zap, Star, DollarSign, Loader2, RefreshCw, Brain, Code, Image, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ModelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: string | null;
  onSelectModel: (model: string | null) => void;
  functionType: AIFunctionType;
  defaultModel: string;
  hasOpenRouterApiKey: boolean;
}

type FilterType = 'all' | 'fast' | 'quality' | 'cheap' | 'reasoning' | 'coding' | 'multimodal';
type ProviderFilter = 'all' | 'lovable' | 'kie' | 'poyo' | 'dashscope' | 'openrouter';

export function ModelSelector({
  open,
  onOpenChange,
  selectedModel,
  onSelectModel,
  functionType,
  defaultModel,
  hasOpenRouterApiKey,
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');

  // Fetch OpenRouter models dynamically
  const { 
    data: openRouterModels = [], 
    isLoading: isLoadingModels, 
    refetch: refetchModels,
    isRefetching 
  } = useOpenRouterModels(hasOpenRouterApiKey && functionType === 'text');

  // Get available models based on function type
  const availableModels = useMemo(() => {
    const allLovableModels = MODELS_BY_TYPE[functionType] || MODELS_BY_TYPE.text;
    
    return {
      lovable: allLovableModels,
      openrouter: openRouterModels,
    };
  }, [functionType, openRouterModels]);

  // Group OpenRouter models by provider
  const groupedOpenRouterModels = useMemo(() => {
    return groupModelsByProvider(openRouterModels);
  }, [openRouterModels]);

  // Split Lovable/KIE/PoYo/DashScope models
  const { kieModels: availableKieModels, poyoModels: availablePoyoModels, dashscopeModels: availableDashScopeModels, lovableOnlyModels: availableLovableOnlyModels } = useMemo(() => {
    const kie = availableModels.lovable.filter(id => isKieModel(id));
    const poyo = availableModels.lovable.filter(id => isPoyoModel(id));
    const dashscope = availableModels.lovable.filter(id => isDashScopeModel(id));
    const lovableOnly = availableModels.lovable.filter(id => !isKieModel(id) && !isPoyoModel(id) && !isDashScopeModel(id));
    return {
      kieModels: kie,
      poyoModels: poyo,
      dashscopeModels: dashscope,
      lovableOnlyModels: lovableOnly,
    };
  }, [availableModels.lovable]);

  // Filter models based on search, filter, and provider
  const filteredModels = useMemo(() => {
    // Filter Lovable models
    const filterLovableFn = (modelId: string) => {
      const info = getModelInfo(modelId);
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          modelId.toLowerCase().includes(query) ||
          info.shortName.toLowerCase().includes(query) ||
          info.description.toLowerCase().includes(query) ||
          info.bestFor.some(b => b.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Type filter
      switch (activeFilter) {
        case 'fast':
          return info.speed === 'fast';
        case 'quality':
          return info.quality === 'premium';
        case 'cheap':
          return info.cost === 'low';
        default:
          return true;
      }
    };

    // Filter OpenRouter models
    const filterOpenRouterFn = (model: typeof openRouterModels[0]) => {
      const info = openRouterModelToModelInfo(model);
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          model.id.toLowerCase().includes(query) ||
          model.name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          (model.description?.toLowerCase().includes(query) || false);
        if (!matchesSearch) return false;
      }

      // Category filters
      switch (activeFilter) {
        case 'fast':
          return info.speed === 'fast' || model.category === 'fast';
        case 'quality':
          return info.quality === 'premium' || model.category === 'flagship';
        case 'cheap':
          return info.cost === 'low' || model.category === 'cheap';
        case 'reasoning':
          return model.category === 'reasoning';
        case 'coding':
          return model.category === 'coding';
        case 'multimodal':
          return model.category === 'multimodal';
        default:
          return true;
      }
    };

    let lovableFiltered = availableModels.lovable.filter(filterLovableFn);
    let openrouterFiltered = availableModels.openrouter.filter(filterOpenRouterFn);

    // Apply provider filter
    if (providerFilter === 'lovable') {
      openrouterFiltered = [];
      lovableFiltered = lovableFiltered.filter(id => !isKieModel(id) && !isPoyoModel(id) && !isDashScopeModel(id));
    } else if (providerFilter === 'kie') {
      openrouterFiltered = [];
      lovableFiltered = lovableFiltered.filter(id => isKieModel(id));
    } else if (providerFilter === 'poyo') {
      openrouterFiltered = [];
      lovableFiltered = lovableFiltered.filter(id => isPoyoModel(id));
    } else if (providerFilter === 'dashscope') {
      openrouterFiltered = [];
      lovableFiltered = lovableFiltered.filter(id => isDashScopeModel(id));
    } else if (providerFilter === 'openrouter') {
      lovableFiltered = [];
    }

    // Split into provider groups
    const kieFiltered = lovableFiltered.filter(id => isKieModel(id));
    const poyoFiltered = lovableFiltered.filter(id => isPoyoModel(id));
    const dashscopeFiltered = lovableFiltered.filter(id => isDashScopeModel(id));
    const lovableOnlyFiltered = lovableFiltered.filter(id => !isKieModel(id) && !isPoyoModel(id) && !isDashScopeModel(id));

    return {
      lovable: lovableOnlyFiltered,
      kie: kieFiltered,
      poyo: poyoFiltered,
      dashscope: dashscopeFiltered,
      openrouter: openrouterFiltered,
    };
  }, [availableModels, searchQuery, activeFilter, providerFilter, functionType]);

  // Group filtered OpenRouter models
  const filteredGroupedOpenRouter = useMemo(() => {
    return groupModelsByProvider(filteredModels.openrouter);
  }, [filteredModels.openrouter]);

  const handleSelectModel = (modelId: string | null) => {
    onSelectModel(modelId);
    onOpenChange(false);
  };

  const totalModels = filteredModels.lovable.length + filteredModels.kie.length + filteredModels.poyo.length + filteredModels.dashscope.length + filteredModels.openrouter.length;
  const hasOpenRouter = hasOpenRouterApiKey && functionType === 'text';
  const hasDashScope = availableDashScopeModels.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Chọn AI Model
          </DialogTitle>
        </DialogHeader>

        {/* Provider Tabs */}
        {(hasOpenRouter || functionType === 'image') && (
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <ProviderTab
              active={providerFilter === 'all'}
              onClick={() => setProviderFilter('all')}
              count={availableModels.lovable.length + availableModels.openrouter.length}
            >
              Tất cả
            </ProviderTab>
            {functionType === 'image' && availablePoyoModels.length > 0 && (
              <ProviderTab
                active={providerFilter === 'poyo'}
                onClick={() => setProviderFilter('poyo')}
                provider="poyo"
                count={availablePoyoModels.length}
              >
                PoYo.ai
              </ProviderTab>
            )}
            {functionType === 'image' && availableKieModels.length > 0 && (
              <ProviderTab
                active={providerFilter === 'kie'}
                onClick={() => setProviderFilter('kie')}
                provider="kie"
                count={availableKieModels.length}
              >
                KIE.ai
              </ProviderTab>
            )}
            {hasOpenRouter && (
              <ProviderTab
                active={providerFilter === 'openrouter'}
                onClick={() => setProviderFilter('openrouter')}
                provider="openrouter"
                count={availableModels.openrouter.length}
                isLoading={isLoadingModels}
              >
                <span className="hidden sm:inline">OpenRouter</span>
                <span className="sm:hidden">OR</span>
              </ProviderTab>
            )}
            <ProviderTab
              active={providerFilter === 'lovable'}
              onClick={() => setProviderFilter('lovable')}
              provider="lovable"
              count={availableLovableOnlyModels.length}
            >
              <span className="hidden sm:inline">Lovable AI</span>
              <span className="sm:hidden">Lovable</span>
            </ProviderTab>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-2 sm:space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
            {hasOpenRouter && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => refetchModels()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <FilterButton 
              active={activeFilter === 'all'} 
              onClick={() => setActiveFilter('all')}
            >
              Tất cả
            </FilterButton>
            <FilterButton 
              active={activeFilter === 'fast'} 
              onClick={() => setActiveFilter('fast')}
              icon={<Zap className="h-3 w-3" />}
              hideTextOnMobile
            >
              Nhanh
            </FilterButton>
            <FilterButton 
              active={activeFilter === 'quality'} 
              onClick={() => setActiveFilter('quality')}
              icon={<Star className="h-3 w-3" />}
              hideTextOnMobile
            >
              Premium
            </FilterButton>
            <FilterButton 
              active={activeFilter === 'cheap'} 
              onClick={() => setActiveFilter('cheap')}
              icon={<DollarSign className="h-3 w-3" />}
              hideTextOnMobile
            >
              Rẻ
            </FilterButton>
            {hasOpenRouter && (
              <>
                <FilterButton 
                  active={activeFilter === 'reasoning'} 
                  onClick={() => setActiveFilter('reasoning')}
                  icon={<Brain className="h-3 w-3" />}
                  hideTextOnMobile
                >
                  Reasoning
                </FilterButton>
                <FilterButton 
                  active={activeFilter === 'coding'} 
                  onClick={() => setActiveFilter('coding')}
                  icon={<Code className="h-3 w-3" />}
                  hideTextOnMobile
                >
                  Coding
                </FilterButton>
                <FilterButton 
                  active={activeFilter === 'multimodal'} 
                  onClick={() => setActiveFilter('multimodal')}
                  icon={<Image className="h-3 w-3" />}
                  hideTextOnMobile
                >
                  Vision
                </FilterButton>
              </>
            )}
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
              {totalModels} models
            </span>
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 min-h-0 -mx-4 sm:-mx-6 overflow-y-auto">
          <div className="space-y-4 sm:space-y-6 py-2 px-4 sm:px-6">
            {/* Default Option */}
            <div className="space-y-2">
              <ModelCard
                modelId={defaultModel}
                info={{
                  ...getModelInfo(defaultModel),
                  shortName: `Mặc định (${getModelInfo(defaultModel).shortName})`,
                  description: 'Sử dụng model mặc định của function',
                }}
                isSelected={selectedModel === null || selectedModel === '_default'}
                isDefault
                onClick={() => handleSelectModel(null)}
                compact
              />
            </div>

            {/* PoYo.ai Models (only for image functions) */}
            {filteredModels.poyo.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 sticky top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <Key className="h-4 w-4 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-teal-700 dark:text-teal-400">PoYo.ai</h3>
                    <p className="text-[10px] sm:text-xs text-teal-600/70 dark:text-teal-400/70 truncate">
                      GPT-4o Image, Z-Image, Flux 2, Seedream, Grok
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/30">
                    {filteredModels.poyo.length}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-teal-500/5 border border-teal-500/10 flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-teal-600/80 dark:text-teal-400/80">
                    Yêu cầu <code className="font-mono font-medium">POYO_API_KEY</code> trong Secrets
                  </p>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                  {filteredModels.poyo.map((modelId) => (
                    <ModelCard
                      key={modelId}
                      modelId={modelId}
                      info={getModelInfo(modelId)}
                      isSelected={selectedModel === modelId}
                      onClick={() => handleSelectModel(modelId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* KIE.ai Models (only for image functions) */}
            {filteredModels.kie.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 sticky top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <Key className="h-4 w-4 text-violet-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-violet-700 dark:text-violet-400">KIE.ai</h3>
                    <p className="text-[10px] sm:text-xs text-violet-600/70 dark:text-violet-400/70 truncate">
                      Flux Kontext, GPT-Image — giá tốt, chất lượng cao
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/30">
                    {filteredModels.kie.length}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/10 flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-violet-600/80 dark:text-violet-400/80">
                    Yêu cầu <code className="font-mono font-medium">KIE_API_KEY</code> trong Secrets
                  </p>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                  {filteredModels.kie.map((modelId) => (
                    <ModelCard
                      key={modelId}
                      modelId={modelId}
                      info={getModelInfo(modelId)}
                      isSelected={selectedModel === modelId}
                      onClick={() => handleSelectModel(modelId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* OpenRouter Models (BEFORE Lovable AI for text functions) */}
            {hasOpenRouter && (
              <>
                {isLoadingModels ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Đang tải models từ OpenRouter...</span>
                  </div>
                ) : filteredModels.openrouter.length > 0 ? (
                  <div className="space-y-4">
                    {/* OpenRouter Header */}
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 sticky top-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <ExternalLink className="h-4 w-4 text-orange-500" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm text-orange-700 dark:text-orange-400">OpenRouter</h3>
                        <p className="text-[10px] sm:text-xs text-orange-600/70 dark:text-orange-400/70 truncate">
                          {Object.keys(filteredGroupedOpenRouter).length} providers, {filteredModels.openrouter.length} models
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                        API Key ✓
                      </Badge>
                    </div>

                    {/* Models grouped by provider */}
                    {Object.entries(filteredGroupedOpenRouter).map(([providerName, models]) => (
                      <div key={providerName} className="space-y-2">
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-xs font-medium text-muted-foreground">{providerName}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-muted-foreground">{models.length}</span>
                        </div>
                        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                          {models.map((model) => {
                            const modelInfo = openRouterModelToModelInfo(model);
                            return (
                              <ModelCard
                                key={model.id}
                                modelId={model.id}
                                info={modelInfo as ModelInfo}
                                isSelected={selectedModel === model.id}
                                onClick={() => handleSelectModel(model.id)}
                                pricing={model.pricing}
                                contextLength={model.contextLength}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : providerFilter === 'openrouter' && searchQuery ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">Không tìm thấy model OpenRouter phù hợp</p>
                  </div>
                ) : null}
              </>
            )}

            {/* Lovable AI Models */}
            {filteredModels.lovable.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 sticky top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-blue-700 dark:text-blue-400">Lovable AI</h3>
                    <p className="text-[10px] sm:text-xs text-blue-600/70 dark:text-blue-400/70 truncate">
                      Tích hợp sẵn, không cần API key
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                    {filteredModels.lovable.length}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                  {filteredModels.lovable.map((modelId) => (
                    <ModelCard
                      key={modelId}
                      modelId={modelId}
                      info={getModelInfo(modelId)}
                      isSelected={selectedModel === modelId}
                      onClick={() => handleSelectModel(modelId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {totalModels === 0 && !isLoadingModels && (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <p className="text-sm">Không tìm thấy model phù hợp</p>
                <p className="text-xs sm:text-sm">Thử thay đổi bộ lọc hoặc từ khóa</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Provider tab component
interface ProviderTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  provider?: 'lovable' | 'kie' | 'poyo' | 'openrouter';
  count?: number;
  isLoading?: boolean;
}

function ProviderTab({ active, onClick, children, provider, count, isLoading }: ProviderTabProps) {
  const providerColors: Record<string, string> = {
    lovable: 'text-blue-600 bg-blue-500/10',
    kie: 'text-violet-600 bg-violet-500/10',
    poyo: 'text-teal-600 bg-teal-500/10',
    openrouter: 'text-orange-600 bg-orange-500/10',
  };

  const dotColors: Record<string, string> = {
    lovable: 'bg-blue-500',
    kie: 'bg-violet-500',
    poyo: 'bg-teal-500',
    openrouter: 'bg-orange-500',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-medium transition-all",
        active 
          ? "bg-background text-foreground shadow-sm" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {provider && (
        <span className={cn("w-2 h-2 rounded-full", dotColors[provider])} />
      )}
      {children}
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : count !== undefined ? (
        <Badge variant="secondary" className={cn(
          "text-[8px] sm:text-[9px] py-0 px-1 ml-0.5",
          active && provider ? providerColors[provider] : ""
        )}>
          {count}
        </Badge>
      ) : null}
    </button>
  );
}

// Filter button component
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hideTextOnMobile?: boolean;
}

function FilterButton({ active, onClick, icon, children, hideTextOnMobile }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all",
        active 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      <span className={hideTextOnMobile ? "hidden sm:inline" : ""}>{children}</span>
    </button>
  );
}
