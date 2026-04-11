import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ModelInfo, ModelSpeed, ModelQuality, ModelCost } from '@/hooks/useAIConfig';
import { Zap, Clock, Turtle, Sparkles, DollarSign, Check, ExternalLink, Image } from 'lucide-react';

interface ModelCardProps {
  modelId: string;
  info: ModelInfo;
  isSelected?: boolean;
  isDefault?: boolean;
  onClick?: () => void;
  compact?: boolean;
  pricing?: { prompt: number; completion: number };
  contextLength?: number;
}

const SPEED_CONFIG: Record<ModelSpeed, { icon: React.ReactNode; label: string; className: string }> = {
  fast: { icon: <Zap className="h-3 w-3" />, label: 'Nhanh', className: 'text-green-600 bg-green-500/10' },
  medium: { icon: <Clock className="h-3 w-3" />, label: 'Trung bình', className: 'text-yellow-600 bg-yellow-500/10' },
  slow: { icon: <Turtle className="h-3 w-3" />, label: 'Chậm', className: 'text-orange-600 bg-orange-500/10' },
};

const QUALITY_CONFIG: Record<ModelQuality, { label: string; className: string }> = {
  standard: { label: 'Tiêu chuẩn', className: 'text-muted-foreground bg-muted' },
  high: { label: 'Cao', className: 'text-blue-600 bg-blue-500/10' },
  premium: { label: 'Premium', className: 'text-purple-600 bg-purple-500/10' },
};

const COST_CONFIG: Record<ModelCost, { icon: React.ReactNode; label: string; className: string }> = {
  low: { icon: <DollarSign className="h-3 w-3" />, label: 'Thấp', className: 'text-green-600 bg-green-500/10' },
  medium: { icon: <DollarSign className="h-3 w-3" />, label: 'Trung bình', className: 'text-yellow-600 bg-yellow-500/10' },
  high: { icon: <DollarSign className="h-3 w-3" />, label: 'Cao', className: 'text-red-600 bg-red-500/10' },
};

// Provider-based styling
const PROVIDER_STYLES: Record<string, {
  border: string;
  badge: string;
  icon: React.ReactNode;
  label: string;
}> = {
  lovable: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    icon: <Sparkles className="h-3 w-3" />,
    label: 'Lovable AI',
  },
  openrouter: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    icon: <ExternalLink className="h-3 w-3" />,
    label: 'OpenRouter',
  },
  kie: {
    border: 'border-l-violet-500',
    badge: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
    icon: <Image className="h-3 w-3" />,
    label: 'KIE.ai',
  },
  poyo: {
    border: 'border-l-teal-500',
    badge: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
    icon: <Image className="h-3 w-3" />,
    label: 'PoYo.ai',
  },
  dashscope: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    icon: <Sparkles className="h-3 w-3" />,
    label: 'DashScope',
  },
  geminigen: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: <Sparkles className="h-3 w-3" />,
    label: 'GeminiGen.ai',
  },
};

export function ModelCard({ modelId, info, isSelected, isDefault, onClick, compact, pricing, contextLength }: ModelCardProps) {
  const speedConfig = SPEED_CONFIG[info.speed];
  const qualityConfig = QUALITY_CONFIG[info.quality];
  const costConfig = COST_CONFIG[info.cost];
  const providerStyle = PROVIDER_STYLES[info.provider];

  // Format pricing for display
  const formatPricing = (p: { prompt: number; completion: number }) => {
    const formatNum = (n: number) => n < 1 ? n.toFixed(2) : n < 10 ? n.toFixed(1) : Math.round(n).toString();
    return `$${formatNum(p.prompt)}/$${formatNum(p.completion)}`;
  };

  // Format context length
  const formatContext = (ctx: number) => {
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`;
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return ctx.toString();
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-center justify-between p-2 sm:p-3 rounded-lg border border-l-4 cursor-pointer transition-all",
          providerStyle.border,
          isSelected 
            ? "border-primary bg-primary/5 ring-1 ring-primary" 
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="font-medium text-xs sm:text-sm truncate">{info.shortName}</span>
              {info.isRecommended && (
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 px-1 bg-primary/10 text-primary hidden xs:inline-flex">
                  Khuyên dùng
                </Badge>
              )}
            </div>
            {/* Provider badge - always visible */}
            <Badge variant="outline" className={cn("text-[8px] sm:text-[9px] py-0 px-1 mt-0.5", providerStyle.badge)}>
              {providerStyle.icon}
              <span className="ml-0.5">{providerStyle.label}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5", speedConfig.className)}>
              {speedConfig.icon}
            </Badge>
            <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5", qualityConfig.className)}>
              <Sparkles className="h-2.5 w-2.5" />
            </Badge>
            <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5", costConfig.className)}>
              {costConfig.icon}
            </Badge>
          </div>
        </div>
        {isSelected && (
          <Check className="h-4 w-4 text-primary ml-1.5 sm:ml-2 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-3 sm:p-4 rounded-xl border border-l-4 cursor-pointer transition-all",
        providerStyle.border,
        isSelected 
          ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md" 
          : "border-border hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm"
      )}
    >
      {/* Recommended Badge */}
      {info.isRecommended && (
        <div className="absolute -top-2 left-2 sm:left-3">
          <Badge className="text-[9px] sm:text-[10px] py-0.5 px-1.5 sm:px-2 bg-primary text-primary-foreground shadow-sm">
            ⭐ Khuyên dùng
          </Badge>
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="pr-6 sm:pr-8">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h4 className="font-semibold text-sm sm:text-base">{info.shortName}</h4>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{info.description}</p>
        </div>

        {/* Provider Badge - Always visible */}
        <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] py-0.5 px-1.5", providerStyle.badge)}>
          {providerStyle.icon}
          <span className="ml-1">{providerStyle.label}</span>
          {info.provider === 'lovable' && (
            <span className="ml-1 text-[8px] opacity-75">- Không cần API Key</span>
          )}
        </Badge>

        {/* Indicators */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2", speedConfig.className)}>
            {speedConfig.icon}
            <span className="ml-0.5 sm:ml-1 hidden xs:inline">{speedConfig.label}</span>
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2", qualityConfig.className)}>
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="ml-0.5 sm:ml-1 hidden xs:inline">{qualityConfig.label}</span>
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] sm:text-xs py-0.5 px-1.5 sm:px-2", costConfig.className)}>
            {costConfig.icon}
            <span className="ml-0.5 sm:ml-1 hidden xs:inline">{costConfig.label}</span>
          </Badge>
        </div>

        {/* Best For - hide on mobile */}
        {info.bestFor.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Phù hợp:</span>
            {info.bestFor.map((use, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5">
                {use}
              </Badge>
            ))}
          </div>
        )}

        {/* Pricing & Context - for OpenRouter models */}
        {pricing && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="font-mono">{formatPricing(pricing)}/1M</span>
            {contextLength && contextLength > 0 && (
              <>
                <span>•</span>
                <span>{formatContext(contextLength)} ctx</span>
              </>
            )}
          </div>
        )}

        {/* Model ID - hide on mobile */}
        <p className="hidden sm:block text-[10px] font-mono text-muted-foreground truncate">
          {modelId}
        </p>
      </div>
    </div>
  );
}

// Quick select button component
interface QuickSelectButtonProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick: () => void;
}

export function QuickSelectButton({ label, description, icon, isSelected, onClick }: QuickSelectButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border text-left transition-all w-full",
        isSelected 
          ? "border-primary bg-primary/5 ring-1 ring-primary" 
          : "border-border hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <div className={cn(
        "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0",
        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs sm:text-sm">{label}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{description}</p>
      </div>
      {isSelected && (
        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
      )}
    </button>
  );
}

// Provider indicator for table view
interface ProviderIndicatorProps {
  provider: string;
  className?: string;
  showLabel?: boolean;
}

const PROVIDER_DOT_COLORS: Record<string, string> = {
  lovable: 'bg-blue-500',
  openrouter: 'bg-orange-500',
  kie: 'bg-violet-500',
  poyo: 'bg-teal-500',
  dashscope: 'bg-orange-500',
};

export function ProviderIndicator({ provider, className, showLabel }: ProviderIndicatorProps) {
  const style = PROVIDER_STYLES[provider] || PROVIDER_STYLES.lovable;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn(
        "w-2 h-2 rounded-full",
        PROVIDER_DOT_COLORS[provider] ?? 'bg-muted'
      )} />
      {showLabel && (
        <span className={cn("text-[10px] font-medium", style.badge.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground')}>
          {style.label}
        </span>
      )}
    </span>
  );
}