import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AIFunctionType, AIFunctionTag, AIFunctionConfig, getModelInfo, ModelInfo } from '@/hooks/useAIConfig';
import { ProviderIndicator } from './ModelCard';
import { FunctionTagBadges } from './FunctionTagBadges';
import { Settings, Check, X, Zap, Star, Sparkles, Clock, ChevronDown, Coins, Scale, LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AIFunction {
  name: string;
  description: string;
  category: string;
  type: AIFunctionType;
  currentModel: string;
  tags?: AIFunctionTag[];
}

interface FunctionCardProps {
  fn: AIFunction;
  config?: AIFunctionConfig;
  modelInfo: ModelInfo;
  onEdit: () => void;
  onQuickModelChange?: (model: string | null) => void;
  compact?: boolean;
}

const TYPE_BADGES: Record<AIFunctionType, { label: string; className: string }> = {
  text: { label: 'Text', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  image: { label: 'Image', className: 'bg-purple-500/20 text-purple-600 border-purple-500/30' },
  'image-direct': { label: 'Image', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  search: { label: 'Search', className: 'bg-green-500/20 text-green-600 border-green-500/30' },
};

const CATEGORY_BORDER: Record<string, string> = {
  content: 'border-l-blue-500',
  chat: 'border-l-green-500',
  ideation: 'border-l-yellow-500',
  research: 'border-l-purple-500',
  image: 'border-l-pink-500',
  brand: 'border-l-orange-500',
  analysis: 'border-l-cyan-500',
  utility: 'border-l-gray-500',
};

interface QuickPreset {
  id: string;
  label: string;
  model: string | null;
  icon: LucideIcon;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
  useCase: string;
  color: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { 
    id: 'default', 
    label: 'Mặc định', 
    model: null, 
    icon: Sparkles,
    description: 'Cấu hình mặc định hệ thống',
    speed: 'fast',
    cost: 'low',
    useCase: 'Phù hợp cho hầu hết tác vụ',
    color: 'blue',
  },
  { 
    id: 'economy', 
    label: 'Tiết kiệm', 
    model: 'google/gemini-2.5-flash-lite', 
    icon: Coins,
    description: 'Chi phí thấp nhất, tốc độ nhanh',
    speed: 'fast',
    cost: 'low',
    useCase: 'Tác vụ đơn giản, khối lượng lớn',
    color: 'green',
  },
  { 
    id: 'fast', 
    label: 'Nhanh', 
    model: 'google/gemini-2.5-flash', 
    icon: Zap,
    description: 'Cân bằng tốc độ và chất lượng',
    speed: 'fast',
    cost: 'low',
    useCase: 'Phản hồi realtime, chat',
    color: 'yellow',
  },
  { 
    id: 'balanced', 
    label: 'Cân bằng', 
    model: 'openai/gpt-5-mini', 
    icon: Scale,
    description: 'Chất lượng tốt, chi phí hợp lý',
    speed: 'medium',
    cost: 'medium',
    useCase: 'Nội dung marketing, blog',
    color: 'cyan',
  },
  { 
    id: 'quality', 
    label: 'Chất lượng', 
    model: 'google/gemini-3-pro-preview', 
    icon: Star,
    description: 'Model mạnh nhất, tính năng mới',
    speed: 'medium',
    cost: 'high',
    useCase: 'Nội dung quan trọng, sáng tạo',
    color: 'purple',
  },
];

const shortenModelName = (model: string): string => {
  const parts = model.split('/');
  const name = parts.length > 1 ? parts[1] : model;
  return name.replace(/-\d{8}$/, '').replace(/-preview$/, '');
};

const getSpeedLabel = (speed: 'fast' | 'medium' | 'slow') => {
  switch (speed) {
    case 'fast': return { icon: '⚡', text: 'Nhanh' };
    case 'medium': return { icon: '🕐', text: 'Trung bình' };
    case 'slow': return { icon: '🐢', text: 'Chậm' };
  }
};

const getCostLabel = (cost: 'low' | 'medium' | 'high') => {
  switch (cost) {
    case 'low': return { icon: '💵', text: 'Thấp' };
    case 'medium': return { icon: '💵💵', text: 'Trung bình' };
    case 'high': return { icon: '💵💵💵', text: 'Cao' };
  }
};

const getPresetColorClasses = (color: string, isSelected: boolean) => {
  if (isSelected) {
    switch (color) {
      case 'blue': return 'bg-blue-500 text-white border-blue-500';
      case 'green': return 'bg-green-500 text-white border-green-500';
      case 'yellow': return 'bg-yellow-500 text-white border-yellow-500';
      case 'cyan': return 'bg-cyan-500 text-white border-cyan-500';
      case 'purple': return 'bg-purple-500 text-white border-purple-500';
      default: return 'bg-primary text-primary-foreground';
    }
  }
  switch (color) {
    case 'blue': return 'hover:border-blue-500/50 hover:bg-blue-500/10';
    case 'green': return 'hover:border-green-500/50 hover:bg-green-500/10';
    case 'yellow': return 'hover:border-yellow-500/50 hover:bg-yellow-500/10';
    case 'cyan': return 'hover:border-cyan-500/50 hover:bg-cyan-500/10';
    case 'purple': return 'hover:border-purple-500/50 hover:bg-purple-500/10';
    default: return '';
  }
};

export function FunctionCard({ fn, config, modelInfo, onEdit, onQuickModelChange, compact }: FunctionCardProps) {
  const typeBadge = TYPE_BADGES[fn.type];
  const borderClass = CATEGORY_BORDER[fn.category] || 'border-l-muted';
  const displayModel = config?.modelOverride || fn.currentModel;
  const hasOverride = !!config?.modelOverride;
  const isDisabled = config && !config.isEnabled;
  const temperature = config?.temperature ?? 0.7;
  const cacheHours = config?.cacheTtlHours ?? 24;

  const getCurrentPreset = () => {
    if (!config?.modelOverride) return 'default';
    const preset = QUICK_PRESETS.find(p => p.model === config.modelOverride);
    return preset?.id || 'custom';
  };

  const currentPresetId = getCurrentPreset();
  const currentPreset = QUICK_PRESETS.find(p => p.id === currentPresetId);
  const isCustom = currentPresetId === 'custom';

  if (compact) {
    return (
      <div
        className={cn(
          "group relative p-3 rounded-lg border border-l-4 bg-card transition-all hover:shadow-sm",
          borderClass,
          isDisabled && "opacity-50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm truncate">{fn.name}</span>
              <FunctionTagBadges tags={fn.tags} compact />
              {hasOverride && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/30">
                  Override
                </Badge>
              )}
              {isDisabled && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1">
                  <X className="h-2.5 w-2.5 mr-0.5" />Off
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fn.description}</p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Model Info Row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <ProviderIndicator provider={modelInfo.provider} />
                  <span className="text-xs font-medium truncate max-w-[120px]">{modelInfo.shortName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{modelInfo.shortName}</p>
                <p className="text-xs text-muted-foreground">{modelInfo.description}</p>
                <p className="text-[10px] font-mono mt-1">{displayModel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>T: {temperature}</span>
            <span>•</span>
            <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{cacheHours}h</span>
          </div>
        </div>

        {/* Quick Model Dropdown for Text functions */}
        {fn.type === 'text' && onQuickModelChange && (
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-full text-xs justify-between">
                  <span className="flex items-center gap-1">
                    {isCustom ? (
                      <>
                        <Settings className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{shortenModelName(config?.modelOverride || '')}</span>
                      </>
                    ) : (
                      <>
                        {currentPreset && <currentPreset.icon className="h-3 w-3" />}
                        {currentPreset?.label || 'Mặc định'}
                      </>
                    )}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {QUICK_PRESETS.map((preset) => {
                  const speed = getSpeedLabel(preset.speed);
                  const cost = getCostLabel(preset.cost);
                  const isSelected = currentPresetId === preset.id;
                  
                  return (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => onQuickModelChange(preset.model)}
                      className="flex flex-col items-start py-2 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2 font-medium">
                          <preset.icon className="h-3.5 w-3.5" />
                          {preset.label}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      {preset.model && (
                        <span className="text-[10px] text-muted-foreground ml-5.5 mt-0.5">
                          {shortenModelName(preset.model)} • {speed.icon} {speed.text} • {cost.icon}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/70 ml-5.5">
                        {preset.useCase}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                
                {isCustom && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex flex-col items-start py-2 bg-muted/50" disabled>
                      <span className="flex items-center gap-2 font-medium">
                        <Settings className="h-3.5 w-3.5" />
                        Custom
                        <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-5.5 mt-0.5">
                        {shortenModelName(config?.modelOverride || '')}
                      </span>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit} className="text-xs">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Cấu hình chi tiết...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  }

  // Expanded Card View
  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border border-l-4 bg-card transition-all hover:shadow-md",
        borderClass,
        isDisabled && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm">{fn.name}</h4>
            <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", typeBadge.className)}>
              {typeBadge.label}
            </Badge>
            <FunctionTagBadges tags={fn.tags} />
            {hasOverride && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30">
                Override
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{fn.description}</p>
        </div>

        <div className="flex items-center gap-1">
          {isDisabled ? (
            <Badge variant="secondary" className="text-xs">
              <X className="h-3 w-3 mr-1" />Off
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs bg-green-500">
              <Check className="h-3 w-3 mr-1" />On
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Model Section */}
      <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIndicator provider={modelInfo.provider} />
            <div>
              <p className="text-sm font-medium">{modelInfo.shortName}</p>
              <p className="text-xs text-muted-foreground">{modelInfo.description}</p>
            </div>
          </div>
          
          {fn.type === 'text' && onQuickModelChange && (
            <div className="flex items-center gap-1">
              {QUICK_PRESETS.map((preset) => {
                const isSelected = currentPresetId === preset.id;
                const speed = getSpeedLabel(preset.speed);
                const cost = getCostLabel(preset.cost);
                
                return (
                  <TooltipProvider key={preset.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            "h-7 w-7 transition-all",
                            getPresetColorClasses(preset.color, isSelected)
                          )}
                          onClick={() => onQuickModelChange(preset.model)}
                        >
                          <preset.icon className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="font-medium text-xs">{preset.label}</p>
                        <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                        {preset.model && (
                          <p className="text-[10px] mt-1 font-mono">{shortenModelName(preset.model)}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span>{speed.icon} {speed.text}</span>
                          <span>•</span>
                          <span>{cost.icon} Chi phí {cost.text.toLowerCase()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{preset.useCase}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Parameters Row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium">Temperature:</span> {temperature}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span className="font-medium">Cache:</span> {cacheHours}h
        </span>
        {config?.priorityLevel && config.priorityLevel !== 'normal' && (
          <Badge variant="outline" className="text-[10px] py-0">
            {config.priorityLevel === 'high' ? '⚡ High' : '🔻 Low'}
          </Badge>
        )}
      </div>
    </div>
  );
}
