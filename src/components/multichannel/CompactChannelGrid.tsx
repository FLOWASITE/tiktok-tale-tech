import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  Square,
  ChevronDown,
  Settings2,
  Globe,
  Users,
  Star,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Channel, CHANNELS } from '@/types/multichannel';

interface ChannelCategoryConfig {
  name: string;
  key: string;
  icon: React.ReactNode;
  channels: typeof CHANNELS[number][];
}

interface CompactChannelGridProps {
  selectedChannels: Channel[];
  onChannelToggle: (channel: Channel) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  channelIcons: Record<Channel, React.ReactNode>;
  brandTemplate?: { channel_overrides?: Record<string, unknown> } | null;
  disabled?: boolean;
  frequentChannels?: Channel[];
  frequentCounts?: Partial<Record<Channel, number>>;
  onSelectFrequent?: () => void;
}

export function CompactChannelGrid({
  selectedChannels,
  onChannelToggle,
  onSelectAll,
  onDeselectAll,
  channelIcons,
  brandTemplate,
  disabled,
  frequentChannels = [],
  frequentCounts = {},
  onSelectFrequent,
}: CompactChannelGridProps) {
  const channelCategories: ChannelCategoryConfig[] = [
    { name: 'Website & Long-form', key: 'longform', icon: <Globe className="w-4 h-4" />, channels: CHANNELS.filter(c => c.category === 'longform') },
    { name: 'Mạng xã hội', key: 'social', icon: <Users className="w-4 h-4" />, channels: CHANNELS.filter(c => c.category === 'social') },
  ];

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    longform: true,
    social: true,
  });
  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCategoryCount = (channels: typeof CHANNELS[number][]) => {
    return channels.filter(c => selectedChannels.includes(c.value)).length;
  };

  return (
    <div className="space-y-3">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {selectedChannels.length}/{CHANNELS.length} kênh
        </Badge>
        <div className="flex items-center gap-1.5">
          {frequentChannels.length > 0 && onSelectFrequent && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectFrequent}
              disabled={disabled}
              className="text-xs h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Kênh thường dùng
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            Tất cả
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            <Square className="w-3 h-3 mr-1" />
            Bỏ chọn
          </Button>
        </div>
      </div>

      {/* Frequent channels section */}
      {frequentChannels.length > 0 && (
        <div className="rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-700/30 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Kênh thường xuyên chọn
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400/60 text-amber-700 dark:text-amber-400">
              {frequentChannels.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frequentChannels.map((ch) => {
              const channel = CHANNELS.find((c) => c.value === ch);
              if (!channel) return null;
              const isSelected = selectedChannels.includes(ch);
              const useCount = frequentCounts[ch] || 0;
              return (
                <Tooltip key={ch}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onChannelToggle(ch)}
                      disabled={disabled}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all',
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-900 dark:text-amber-100'
                          : 'bg-background/60 border-border/50 hover:border-amber-400/60',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span className={isSelected ? 'text-amber-600' : 'text-muted-foreground'}>
                        {channelIcons[ch]}
                      </span>
                      <span className="truncate max-w-[100px]">{channel.label}</span>
                      <span className="text-[9px] font-medium px-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        ×{useCount}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Đã chọn {useCount} lần
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Category groups */}
      {channelCategories.map((category) => {
        const count = getCategoryCount(category.channels);
        const total = category.channels.length;
        const isExpanded = expandedCategories[category.key];

        return (
          <Collapsible
            key={category.key}
            open={isExpanded}
            onOpenChange={() => toggleCategory(category.key)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left",
                  count > 0
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                  {count > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 min-w-[28px] justify-center">
                      {count}/{total}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Compact icon preview when collapsed */}
                  {!isExpanded && count > 0 && (
                    <div className="flex items-center -space-x-1">
                      {category.channels
                        .filter(c => selectedChannels.includes(c.value))
                        .slice(0, 4)
                        .map(c => (
                          <Tooltip key={c.value}>
                            <TooltipTrigger asChild>
                              <span className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-primary">
                                {channelIcons[c.value]}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{c.label}</TooltipContent>
                          </Tooltip>
                        ))}
                      {count > 4 && (
                        <span className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                          +{count - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 pt-2 pl-1">
                {category.channels.map((channel) => {
                  const isSelected = selectedChannels.includes(channel.value);
                  const hasOverride = brandTemplate?.channel_overrides &&
                    Object.keys(brandTemplate.channel_overrides).includes(channel.value);

                  return (
                    <Tooltip key={channel.value}>
                      <TooltipTrigger asChild>
                        <label
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm",
                            isSelected
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border/30 hover:border-border/60',
                            disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onChannelToggle(channel.value)}
                            disabled={disabled}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-primary">
                            {channelIcons[channel.value]}
                          </span>
                          <span className="truncate flex-1 text-xs">{channel.label}</span>
                          {hasOverride && (
                            <Settings2 className="w-3 h-3 text-purple-500 shrink-0" />
                          )}
                        </label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">{channel.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
