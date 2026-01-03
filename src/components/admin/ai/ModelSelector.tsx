import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelCard } from './ModelCard';
import { 
  MODELS_BY_TYPE, 
  MODELS_BY_PROVIDER, 
  getModelInfo,
  AIFunctionType 
} from '@/hooks/useAIConfig';
import { Search, Sparkles, ExternalLink, Zap, Star, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: string | null;
  onSelectModel: (model: string | null) => void;
  functionType: AIFunctionType;
  defaultModel: string;
  hasOpenRouterApiKey: boolean;
}

type FilterType = 'all' | 'fast' | 'quality' | 'cheap';
type ProviderFilter = 'all' | 'lovable' | 'openrouter';

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

  // Get available models based on function type
  const availableModels = useMemo(() => {
    const lovableModels = MODELS_BY_TYPE[functionType] || MODELS_BY_TYPE.text;
    const openRouterModels = hasOpenRouterApiKey && functionType === 'text' 
      ? MODELS_BY_PROVIDER.openrouter 
      : [];
    
    return {
      lovable: lovableModels,
      openrouter: openRouterModels,
    };
  }, [functionType, hasOpenRouterApiKey]);

  // Filter models based on search, filter, and provider
  const filteredModels = useMemo(() => {
    const filterFn = (modelId: string) => {
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

    let lovableFiltered = availableModels.lovable.filter(filterFn);
    let openrouterFiltered = availableModels.openrouter.filter(filterFn);

    // Apply provider filter
    if (providerFilter === 'lovable') {
      openrouterFiltered = [];
    } else if (providerFilter === 'openrouter') {
      lovableFiltered = [];
    }

    return {
      lovable: lovableFiltered,
      openrouter: openrouterFiltered,
    };
  }, [availableModels, searchQuery, activeFilter, providerFilter]);

  const handleSelectModel = (modelId: string | null) => {
    onSelectModel(modelId);
    onOpenChange(false);
  };

  const totalModels = filteredModels.lovable.length + filteredModels.openrouter.length;
  const hasOpenRouter = availableModels.openrouter.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Chọn AI Model
          </DialogTitle>
        </DialogHeader>

        {/* Provider Tabs */}
        {hasOpenRouter && (
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <ProviderTab
              active={providerFilter === 'all'}
              onClick={() => setProviderFilter('all')}
              count={availableModels.lovable.length + availableModels.openrouter.length}
            >
              Tất cả
            </ProviderTab>
            <ProviderTab
              active={providerFilter === 'lovable'}
              onClick={() => setProviderFilter('lovable')}
              provider="lovable"
              count={availableModels.lovable.length}
            >
              <span className="hidden sm:inline">Lovable AI</span>
              <span className="sm:hidden">Lovable</span>
            </ProviderTab>
            <ProviderTab
              active={providerFilter === 'openrouter'}
              onClick={() => setProviderFilter('openrouter')}
              provider="openrouter"
              count={availableModels.openrouter.length}
            >
              <span className="hidden sm:inline">OpenRouter</span>
              <span className="sm:hidden">OR</span>
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
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
              Chất lượng
            </FilterButton>
            <FilterButton 
              active={activeFilter === 'cheap'} 
              onClick={() => setActiveFilter('cheap')}
              icon={<DollarSign className="h-3 w-3" />}
              hideTextOnMobile
            >
              Tiết kiệm
            </FilterButton>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
              {totalModels} models
            </span>
          </div>
        </div>

        {/* Model List */}
        <ScrollArea className="flex-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6 py-2">
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

            {/* OpenRouter Models */}
            {filteredModels.openrouter.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20 sticky top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <ExternalLink className="h-4 w-4 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-orange-700 dark:text-orange-400">OpenRouter</h3>
                    <p className="text-[10px] sm:text-xs text-orange-600/70 dark:text-orange-400/70 truncate">
                      200+ models, yêu cầu API key
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                    API Key ✓
                  </Badge>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                  {filteredModels.openrouter.map((modelId) => (
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
            {totalModels === 0 && (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <p className="text-sm">Không tìm thấy model phù hợp</p>
                <p className="text-xs sm:text-sm">Thử thay đổi bộ lọc hoặc từ khóa</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Provider tab component
interface ProviderTabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  provider?: 'lovable' | 'openrouter';
  count?: number;
}

function ProviderTab({ active, onClick, children, provider, count }: ProviderTabProps) {
  const providerColors = {
    lovable: 'text-blue-600 bg-blue-500/10',
    openrouter: 'text-orange-600 bg-orange-500/10',
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
        <span className={cn(
          "w-2 h-2 rounded-full",
          provider === 'lovable' ? 'bg-blue-500' : 'bg-orange-500'
        )} />
      )}
      {children}
      {count !== undefined && (
        <Badge variant="secondary" className={cn(
          "text-[8px] sm:text-[9px] py-0 px-1 ml-0.5",
          active && provider ? providerColors[provider] : ""
        )}>
          {count}
        </Badge>
      )}
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