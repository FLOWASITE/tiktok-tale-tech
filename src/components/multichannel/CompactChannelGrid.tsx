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
  FileText,
  ImageIcon,
  Video,
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
}

export function CompactChannelGrid({
  selectedChannels,
  onChannelToggle,
  onSelectAll,
  onDeselectAll,
  channelIcons,
  brandTemplate,
  disabled,
}: CompactChannelGridProps) {
  const channelCategories: ChannelCategoryConfig[] = [
    { name: 'Thiên về Text', key: 'text', icon: <FileText className="w-4 h-4" />, channels: CHANNELS.filter(c => c.category === 'text') },
    { name: 'Thiên về Ảnh', key: 'image', icon: <ImageIcon className="w-4 h-4" />, channels: CHANNELS.filter(c => c.category === 'image') },
    { name: 'Thiên về Video', key: 'video', icon: <Video className="w-4 h-4" />, channels: CHANNELS.filter(c => c.category === 'video') },
  ];

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    text: true,
    image: true,
    video: true,
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
