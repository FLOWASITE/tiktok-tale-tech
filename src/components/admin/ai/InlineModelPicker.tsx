import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIFunctionType, MODELS_BY_TYPE, getModelInfo, ModelInfo, isKieModel, isPoyoModel } from '@/hooks/useAIConfig';
import { ProviderIndicator } from './ModelCard';
import { Check, ChevronDown, Search, Sparkles, Zap, Star, Coins, Scale, Settings } from 'lucide-react';

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

interface ProviderGroup {
  key: string;
  label: string;
  emoji: string;
  colorClass: string;
  models: string[];
}

function getProviderGroups(allModels: string[]): ProviderGroup[] {
  const groups: ProviderGroup[] = [];

  const lovable = allModels.filter(id => !isKieModel(id) && !isPoyoModel(id) && !isGeminigenModel(id) && !isDashScopeModel(id));
  const poyo = allModels.filter(isPoyoModel);
  const kie = allModels.filter(isKieModel);
  const geminigen = allModels.filter(isGeminigenModel);
  const dashscope = allModels.filter(isDashScopeModel);

  if (lovable.length) groups.push({ key: 'lovable', label: 'Lovable AI', emoji: '✨', colorClass: 'text-blue-500', models: lovable });
  if (poyo.length) groups.push({ key: 'poyo', label: 'PoYo.ai', emoji: '🐱', colorClass: 'text-teal-500', models: poyo });
  if (kie.length) groups.push({ key: 'kie', label: 'KIE.ai', emoji: '🔮', colorClass: 'text-violet-500', models: kie });
  if (geminigen.length) groups.push({ key: 'geminigen', label: 'GeminiGen.ai', emoji: '💎', colorClass: 'text-emerald-500', models: geminigen });
  if (dashscope.length) groups.push({ key: 'dashscope', label: 'DashScope', emoji: '☁️', colorClass: 'text-orange-500', models: dashscope });

  return groups;
}

function ModelRow({ modelId, info, isSelected, onSelect }: { modelId: string; info: ModelInfo; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors text-xs",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
      )}
    >
      <ProviderIndicator provider={info.provider} />
      <span className="flex-1 min-w-0 truncate font-medium">{info.shortName}</span>
      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{info.description}</span>
      {isSelected && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
    </button>
  );
}

export function InlineModelPicker({ functionType, selectedModel, defaultModel, onSelect, hasOpenRouterApiKey, compact }: InlineModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'presets' | 'all'>('presets');

  const isImageFunction = functionType === 'image' || functionType === 'image-direct';
  const presets = isImageFunction ? IMAGE_PRESETS : TEXT_PRESETS;

  const allModels = useMemo(() => {
    return MODELS_BY_TYPE[functionType] || MODELS_BY_TYPE.text;
  }, [functionType]);

  const providerGroups = useMemo(() => getProviderGroups(allModels), [allModels]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return providerGroups;
    const q = search.toLowerCase();
    return providerGroups
      .map(g => ({
        ...g,
        models: g.models.filter(id => {
          const info = getModelInfo(id);
          return id.toLowerCase().includes(q) || info.shortName.toLowerCase().includes(q) || info.description.toLowerCase().includes(q);
        }),
      }))
      .filter(g => g.models.length > 0);
  }, [providerGroups, search]);

  const currentInfo = getModelInfo(selectedModel || defaultModel);
  const currentPreset = presets.find(p => p.model === selectedModel);

  const handleSelect = (model: string | null) => {
    onSelect(model);
    setOpen(false);
    setSearch('');
  };

  const triggerLabel = currentPreset
    ? currentPreset.label
    : selectedModel
      ? currentInfo.shortName
      : 'Mặc định';

  const triggerIcon = currentPreset?.icon || (selectedModel ? <Settings className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-between gap-1", compact ? "h-7 text-xs w-full" : "h-8 text-xs")}>
          <span className="flex items-center gap-1.5 min-w-0">
            {triggerIcon}
            <span className="truncate max-w-[120px]">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start" side="bottom" sideOffset={4}>
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm model..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('presets')}
            className={cn("flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
              tab === 'presets' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            ⚡ Presets
          </button>
          <button
            onClick={() => setTab('all')}
            className={cn("flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2",
              tab === 'all' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            📋 Tất cả ({allModels.length})
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[360px]">
          <div className="p-1.5">
            {tab === 'presets' && !search.trim() && (
              <div className="space-y-0.5">
                {presets.map(preset => {
                  const isSelected = preset.model === selectedModel;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelect(preset.model)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors",
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                      )}
                    >
                      <span className={cn("flex-shrink-0", isSelected && "text-primary")}>{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{preset.label}</p>
                        <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* Quick provider groups in presets tab */}
                {providerGroups.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground px-2.5 mb-1">Hoặc chọn theo provider:</p>
                    <div className="flex flex-wrap gap-1 px-2.5">
                      {providerGroups.map(g => (
                        <Badge
                          key={g.key}
                          variant="outline"
                          className="text-[10px] cursor-pointer hover:bg-accent"
                          onClick={() => { setTab('all'); }}
                        >
                          {g.emoji} {g.label} ({g.models.length})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(tab === 'all' || search.trim()) && (
              <div className="space-y-2">
                {/* Default option */}
                {!search.trim() && (
                  <button
                    onClick={() => handleSelect(null)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors",
                      selectedModel === null ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Mặc định</p>
                      <p className="text-[10px] text-muted-foreground">Sử dụng model mặc định hệ thống</p>
                    </div>
                    {selectedModel === null && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                )}

                {filteredGroups.map(group => (
                  <div key={group.key}>
                    <p className={cn("text-[10px] font-medium px-2.5 py-1", group.colorClass)}>
                      {group.emoji} {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.models.map(modelId => {
                        const info = getModelInfo(modelId);
                        return (
                          <ModelRow
                            key={modelId}
                            modelId={modelId}
                            info={info}
                            isSelected={selectedModel === modelId}
                            onSelect={() => handleSelect(modelId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredGroups.length === 0 && search.trim() && (
                  <p className="text-xs text-muted-foreground text-center py-4">
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
