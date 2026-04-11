import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AIFunctionType, AIFunctionTag, AIFunctionConfig, ModelInfo } from '@/hooks/useAIConfig';
import { ProviderIndicator } from './ModelCard';
import { FunctionTagBadges } from './FunctionTagBadges';
import { InlineModelPicker } from './InlineModelPicker';
import { Settings, Check, X, Clock } from 'lucide-react';

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
  modelSource?: 'individual' | 'group' | 'default';
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

export function FunctionCard({ fn, config, modelInfo, modelSource = 'default', onEdit, onQuickModelChange, compact }: FunctionCardProps) {
  const typeBadge = TYPE_BADGES[fn.type];
  const borderClass = CATEGORY_BORDER[fn.category] || 'border-l-muted';
  const displayModel = config?.modelOverride || fn.currentModel;
  const hasOverride = !!config?.modelOverride;
  const isDisabled = config && !config.isEnabled;
  const temperature = config?.temperature ?? 0.7;
  const cacheHours = config?.cacheTtlHours ?? 24;

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
              {modelSource === 'individual' && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/30">
                  Override
                </Badge>
              )}
              {modelSource === 'group' && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-violet-500/10 text-violet-600 border-violet-500/30">
                  Group
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
                  <ProviderIndicator provider={modelInfo.provider} showLabel />
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

        {/* Inline Model Picker */}
        {onQuickModelChange && (
          <div className="mt-2">
            <InlineModelPicker
              functionType={fn.type}
              selectedModel={config?.modelOverride || null}
              defaultModel={fn.currentModel}
              onSelect={onQuickModelChange}
              compact
            />
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
            <ProviderIndicator provider={modelInfo.provider} showLabel />
            <div>
              <p className="text-sm font-medium">{modelInfo.shortName}</p>
              <p className="text-xs text-muted-foreground">{modelInfo.description}</p>
            </div>
          </div>
          
          {onQuickModelChange && (
            <InlineModelPicker
              functionType={fn.type}
              selectedModel={config?.modelOverride || null}
              defaultModel={fn.currentModel}
              onSelect={onQuickModelChange}
            />
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
