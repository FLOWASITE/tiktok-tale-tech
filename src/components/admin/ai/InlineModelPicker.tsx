import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIFunctionType, MODELS_BY_TYPE, getModelInfo, ModelInfo, isKieModel, isPoyoModel, isLovableAIModel } from '@/hooks/useAIConfig';
import { Check, ChevronDown, Search, Sparkles, Zap, Star, Coins, Scale, Turtle, Clock } from 'lucide-react';

interface InlineModelPickerProps {
  functionType: AIFunctionType;
  selectedModel: string | null;
  defaultModel: string;
  onSelect: (model: string | null) => void;
  hasOpenRouterApiKey?: boolean;
  compact?: boolean;
}

interface PresetItem {
  id: string;
  label: string;
  model: string | null;
  icon: React.ReactNode;
  description: string;
}

const isGeminigenModel = (id: string) => id.startsWith('geminigen/');
const isDashScopeModel = (id: string) => ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-long'].includes(id);
const isOpenRouterModel = (id: string) => {
  const info = getModelInfo(id);
  return info.provider === 'openrouter';
};

const TEXT_PRESETS: PresetItem[] = [
  { id: 'default', label: 'Mặc định', model: null, icon: <Sparkles className="h-3.5 w-3.5" />, description: 'Cấu hình hệ thống' },
  { id: 'fast', label: 'Nhanh', model: 'google/gemini-2.5-flash', icon: <Zap className="h-3.5 w-3.5" />, description: 'Tốc độ & chất lượng' },
  { id: 'quality', label: 'Chất lượng', model: 'google/gemini-3-pro-preview', icon: <Star className="h-3.5 w-3.5" />, description: 'Model mạnh nhất' },
  { id: 'economy', label: 'Tiết kiệm', model: 'google/gemini-2.5-flash-lite', icon: <Coins className="h-3.5 w-3.5" />, description: 'Chi phí thấp nhất' },
  { id: 'balanced', label: 'Cân bằng', model: 'openai/gpt-5-mini', icon: <Scale className="h-3.5 w-3.5" />, description: 'Chất lượng tốt, giá hợp lý' },
];

const IMAGE_PRESETS: PresetItem[] = [
  { id: 'default', label: 'Mặc định', model: null, icon: <Sparkles className="h-3.5 w-3.5" />, description: 'Cấu hình hệ thống' },
  { id: 'poyo-nano', label: 'Nano Banana Pro', model: 'poyo/nano-banana-2', icon: <Star className="h-3.5 w-3.5" />, description: 'PoYo.ai - 4K, text rendering' },
  { id: 'gemini-img', label: 'Gemini 3 Image', model: 'google/gemini-3-pro-image-preview', icon: <Star className="h-3.5 w-3.5" />, description: 'Lovable AI - chất lượng cao' },
  { id: 'flux', label: 'Flux Kontext Pro', model: 'flux-kontext-pro', icon: <Zap className="h-3.5 w-3.5" />, description: 'KIE.ai - nhanh, giá rẻ' },
];

// Provider styling
const PROVIDER_DOTS: Record<string, { color: string; label: string; emoji: string }> = {
  lovable: { color: 'bg-blue-500', label: 'Lovable AI', emoji: '✨' },
  poyo: { color: 'bg-teal-500', label: 'PoYo.ai', emoji: '🐱' },
  kie: { color: 'bg-violet-500', label: 'KIE.ai', emoji: '🔮' },
  geminigen: { color: 'bg-emerald-500', label: 'GeminiGen.ai', emoji: '💎' },
  dashscope: { color: 'bg-orange-500', label: 'DashScope', emoji: '☁️' },
  openrouter: { color: 'bg-purple-500', label: 'OpenRouter', emoji: '🔗' },
};

// Speed/Cost indicators
function SpeedIcon({ speed }: { speed: string }) {
  if (speed === 'fast') return <span title="Nhanh"><Zap className="h-3.5 w-3.5 text-green-500" /></span>;
  if (speed === 'slow') return <span title="Chậm"><Turtle className="h-3.5 w-3.5 text-orange-500" /></span>;
  return <span title="Trung bình"><Clock className="h-3.5 w-3.5 text-yellow-500" /></span>;
}

function CostBadge({ cost }: { cost: string }) {
  const config = {
    low: { label: '$', className: 'text-green-600' },
    medium: { label: '$$', className: 'text-yellow-600' },
    high: { label: '$$$', className: 'text-red-500' },
  }[cost] || { label: '$$', className: 'text-yellow-600' };
  
  return <span className={cn("text-[10px] font-bold flex-shrink-0", config.className)} title={`Chi phí: ${cost}`}>{config.label}</span>;
}

interface ProviderGroup {
  key: string;
  label: string;
  emoji: string;
  dotColor: string;
  models: string[];
}

function getProviderGroups(allModels: string[]): ProviderGroup[] {
  const groups: ProviderGroup[] = [];
  const openrouter = allModels.filter(isOpenRouterModel);
  const lovable = allModels.filter(id => !isKieModel(id) && !isPoyoModel(id) && !isGeminigenModel(id) && !isDashScopeModel(id) && !isOpenRouterModel(id));
  const poyo = allModels.filter(isPoyoModel);
  const kie = allModels.filter(isKieModel);
  const geminigen = allModels.filter(isGeminigenModel);
  const dashscope = allModels.filter(isDashScopeModel);

  if (lovable.length) groups.push({ key: 'lovable', label: 'Lovable AI', emoji: '✨', dotColor: 'bg-blue-500', models: lovable });
  if (openrouter.length) groups.push({ key: 'openrouter', label: 'OpenRouter', emoji: '🔀', dotColor: 'bg-purple-500', models: openrouter });
  if (poyo.length) groups.push({ key: 'poyo', label: 'PoYo.ai', emoji: '🐱', dotColor: 'bg-teal-500', models: poyo });
  if (kie.length) groups.push({ key: 'kie', label: 'KIE.ai', emoji: '🔮', dotColor: 'bg-violet-500', models: kie });
  if (geminigen.length) groups.push({ key: 'geminigen', label: 'GeminiGen.ai', emoji: '💎', dotColor: 'bg-emerald-500', models: geminigen });
  if (dashscope.length) groups.push({ key: 'dashscope', label: 'DashScope', emoji: '☁️', dotColor: 'bg-orange-500', models: dashscope });

  return groups;
}

function ModelRow({ 
  modelId, info, isSelected, onSelect, isHighlighted 
}: { 
  modelId: string; info: ModelInfo; isSelected: boolean; onSelect: () => void; isHighlighted?: boolean;
}) {
  const dot = PROVIDER_DOTS[info.provider] || PROVIDER_DOTS.lovable;
  
  return (
    <button
      onClick={onSelect}
      data-highlighted={isHighlighted || undefined}
      title={`${info.shortName} — ${info.description}`}
      className={cn(
        "w-full flex items-start gap-2 px-2.5 py-2 rounded-md text-left transition-colors text-xs group",
        isSelected 
          ? "bg-accent border-l-2 border-l-primary" 
          : isHighlighted 
            ? "bg-accent/60" 
            : "hover:bg-accent/50"
      )}
    >
      {/* Provider dot */}
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", dot.color)} />
      
      {/* Name + Description */}
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{info.shortName}</span>
        {info.description && (
          <span className="text-[10px] text-muted-foreground line-clamp-1 block">{info.description}</span>
        )}
      </div>
      
      {/* Speed indicator */}
      <SpeedIcon speed={info.speed} />
      
      {/* Cost badge */}
      <CostBadge cost={info.cost} />
      
      {/* Selected check */}
      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />}
    </button>
  );
}

export function InlineModelPicker({ functionType, selectedModel, defaultModel, onSelect, hasOpenRouterApiKey, compact }: InlineModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'presets' | 'all'>('presets');
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  const isImageFunction = functionType === 'image' || functionType === 'image-direct';
  const presets = isImageFunction ? IMAGE_PRESETS : TEXT_PRESETS;

  const allModels = useMemo(() => {
    return MODELS_BY_TYPE[functionType] || MODELS_BY_TYPE.text;
  }, [functionType]);

  const providerGroups = useMemo(() => getProviderGroups(allModels), [allModels]);

  // Flat list of all model IDs for keyboard nav
  const flatModels = useMemo(() => {
    let groups = providerGroups;
    if (providerFilter) {
      groups = groups.filter(g => g.key === providerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups
        .map(g => ({
          ...g,
          models: g.models.filter(id => {
            const info = getModelInfo(id);
            return id.toLowerCase().includes(q) || info.shortName.toLowerCase().includes(q) || info.description.toLowerCase().includes(q);
          }),
        }))
        .filter(g => g.models.length > 0);
    }
    return groups;
  }, [providerGroups, search, providerFilter]);

  // All visible model IDs for keyboard nav
  const visibleModelIds = useMemo(() => {
    const ids: (string | null)[] = [];
    if ((tab === 'all' || search.trim()) && !search.trim()) ids.push(null); // default option
    flatModels.forEach(g => g.models.forEach(id => ids.push(id)));
    return ids;
  }, [flatModels, tab, search]);

  const currentInfo = getModelInfo(selectedModel || defaultModel);
  const currentPreset = presets.find(p => p.model === selectedModel);

  const handleSelect = useCallback((model: string | null) => {
    onSelect(model);
    setOpen(false);
    setSearch('');
    setProviderFilter(null);
    setHighlightIndex(-1);
  }, [onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, visibleModelIds.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < visibleModelIds.length) {
      e.preventDefault();
      handleSelect(visibleModelIds[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [highlightIndex, visibleModelIds, handleSelect]);

  // Auto-focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setHighlightIndex(-1);
    }
  }, [open]);

  // Switch to all tab when searching
  useEffect(() => {
    if (search.trim()) {
      setTab('all');
    }
  }, [search]);

  const triggerLabel = currentPreset
    ? currentPreset.label
    : selectedModel
      ? currentInfo.shortName
      : 'Mặc định';

  const triggerDot = selectedModel ? PROVIDER_DOTS[currentInfo.provider] : null;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(''); setProviderFilter(null); setHighlightIndex(-1); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-between gap-1", compact ? "h-7 text-xs w-full" : "h-8 text-xs")}>
          <span className="flex items-center gap-1.5 min-w-0">
            {triggerDot ? (
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", triggerDot.color)} />
            ) : (
              <Sparkles className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate max-w-[140px]">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start" side="bottom" sideOffset={4}>
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2" onKeyDown={handleKeyDown}>
          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setHighlightIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm model..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => { setSearch(''); setTab('presets'); }} className="text-muted-foreground hover:text-foreground">
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* Tabs - hidden when searching */}
        {!search.trim() && (
          <div className="flex border-b">
            <button
              onClick={() => { setTab('presets'); setProviderFilter(null); }}
              className={cn("flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
                tab === 'presets' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              ⚡ Presets
            </button>
            <button
              onClick={() => { setTab('all'); setProviderFilter(null); }}
              className={cn("flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
                tab === 'all' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              📋 Tất cả ({allModels.length})
            </button>
          </div>
        )}

        {/* Provider filter chips - show in "all" tab or when searching */}
        {(tab === 'all' || search.trim()) && providerGroups.length > 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b overflow-x-auto">
            <button
              onClick={() => setProviderFilter(null)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors flex-shrink-0",
                providerFilter === null
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              All
            </button>
            {providerGroups.map(g => (
              <button
                key={g.key}
                onClick={() => setProviderFilter(providerFilter === g.key ? null : g.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors flex-shrink-0",
                  providerFilter === g.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", g.dotColor)} />
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <ScrollArea className="max-h-[360px]">
          <div className="p-1.5">
            {/* Presets tab */}
            {tab === 'presets' && !search.trim() && (
              <div className="space-y-0.5">
                {presets.map(preset => {
                  const isSelected = preset.model === selectedModel;
                  const presetModelInfo = preset.model ? getModelInfo(preset.model) : null;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelect(preset.model)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors",
                        isSelected ? "bg-accent border-l-2 border-l-primary" : "hover:bg-accent/50"
                      )}
                    >
                      <span className={cn("flex-shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{preset.label}</p>
                        <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        {presetModelInfo && (
                          <p className="text-[9px] text-muted-foreground/70 font-mono mt-0.5">{preset.model}</p>
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* Provider shortcuts */}
                {providerGroups.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground px-2.5 mb-1.5">Chọn theo provider:</p>
                    <div className="flex flex-wrap gap-1.5 px-2.5">
                      {providerGroups.map(g => (
                        <button
                          key={g.key}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          onClick={() => { setTab('all'); setProviderFilter(g.key); }}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", g.dotColor)} />
                          {g.label} ({g.models.length})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All models tab / search results */}
            {(tab === 'all' || search.trim()) && (
              <div className="space-y-1">
                {/* Default option - simple row */}
                {!search.trim() && !providerFilter && (
                  <button
                    onClick={() => handleSelect(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors text-xs",
                      selectedModel === null ? "bg-accent border-l-2 border-l-primary" : "hover:bg-accent/50"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 font-medium">Mặc định</span>
                    <span className="text-[10px] text-muted-foreground">Hệ thống</span>
                    {selectedModel === null && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                )}

                {flatModels.map(group => (
                  <div key={group.key}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 mt-1">
                      <span className={cn("w-2 h-2 rounded-full", group.dotColor)} />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">({group.models.length})</span>
                    </div>
                    <div className="space-y-0.5">
                      {group.models.map((modelId) => {
                        const info = getModelInfo(modelId);
                        const globalIdx = visibleModelIds.indexOf(modelId);
                        return (
                          <ModelRow
                            key={modelId}
                            modelId={modelId}
                            info={info}
                            isSelected={selectedModel === modelId}
                            onSelect={() => handleSelect(modelId)}
                            isHighlighted={highlightIndex === globalIdx}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {flatModels.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Không tìm thấy model nào
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
