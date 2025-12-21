import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Check, X, Hash, Link as LinkIcon, MessageSquare, Smile, Target, AlignLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ChannelSettings, DEFAULT_CHANNEL_SETTINGS } from '@/types/channelSettings';
import { Channel } from '@/types/multichannel';

interface ChannelRulesPanelProps {
  channel: Channel;
  settings?: ChannelSettings;
  brandOverrides?: Partial<ChannelSettings>;
  defaultOpen?: boolean;
}

interface RuleItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  isOverridden?: boolean;
  originalValue?: string;
}

function RuleItem({ icon, label, value, isOverridden, originalValue }: RuleItemProps) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{label}:</span>
          <span className="text-sm font-medium">{value}</span>
          {isOverridden && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                    Override
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mặc định: {originalValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}

function BooleanBadge({ value, trueLabel = 'Có', falseLabel = 'Không' }: { 
  value: boolean; 
  trueLabel?: string; 
  falseLabel?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${value ? 'text-emerald-500' : 'text-muted-foreground'}`}>
      {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {value ? trueLabel : falseLabel}
    </span>
  );
}

export function ChannelRulesPanel({ channel, settings, brandOverrides, defaultOpen = false }: ChannelRulesPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const defaultSettings = DEFAULT_CHANNEL_SETTINGS[channel];
  const mergedSettings = settings || defaultSettings;
  
  // Check which fields are overridden
  const isOverridden = (key: keyof ChannelSettings): boolean => {
    if (!brandOverrides) return false;
    return key in brandOverrides && brandOverrides[key] !== defaultSettings[key];
  };
  
  const getOriginalValue = (key: keyof ChannelSettings): string => {
    const val = defaultSettings[key];
    if (typeof val === 'boolean') return val ? 'Có' : 'Không';
    return String(val ?? '');
  };
  
  const unitLabel = mergedSettings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc',
    soft: 'Mềm (không bán)',
    optional: 'Tuỳ chọn',
    none: 'Không có',
  };
  
  const lineBreakLabels: Record<string, string> = {
    many: 'Nhiều xuống dòng',
    short: 'Đoạn ngắn',
    normal: 'Bình thường',
    minimal: 'Tối giản',
  };
  
  const linkLabels: Record<string, string> = {
    body: 'Trong bài',
    end: 'Cuối bài',
    allowed: 'Cho phép',
    none: 'Không link',
  };
  
  const hasOverrides = brandOverrides && Object.keys(brandOverrides).length > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between h-auto py-2 px-3 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Channel Rules</span>
            {hasOverrides && (
              <Badge variant="secondary" className="text-xs">
                Brand Override
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border/50 mt-2">
          {/* Length */}
          <RuleItem
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            label="Độ dài"
            value={mergedSettings.min_length 
              ? `${mergedSettings.min_length}–${mergedSettings.max_length} ${unitLabel}`
              : `Tối đa ${mergedSettings.max_length} ${unitLabel}`
            }
            isOverridden={isOverridden('max_length') || isOverridden('min_length')}
            originalValue={defaultSettings.min_length 
              ? `${defaultSettings.min_length}–${defaultSettings.max_length}`
              : `Tối đa ${defaultSettings.max_length}`
            }
          />
          
          {/* Hook */}
          <RuleItem
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            label="Hook"
            value={
              <span className="flex items-center gap-1.5">
                <BooleanBadge value={mergedSettings.hook_required} trueLabel="Bắt buộc" falseLabel="Không bắt buộc" />
                {mergedSettings.hook_style && (
                  <span className="text-muted-foreground text-xs">({mergedSettings.hook_style})</span>
                )}
              </span>
            }
            isOverridden={isOverridden('hook_required')}
            originalValue={getOriginalValue('hook_required')}
          />
          
          {/* CTA */}
          <RuleItem
            icon={<Target className="w-3.5 h-3.5" />}
            label="CTA"
            value={ctaLabels[mergedSettings.cta_policy] || mergedSettings.cta_policy}
            isOverridden={isOverridden('cta_policy')}
            originalValue={ctaLabels[defaultSettings.cta_policy]}
          />
          
          {/* Emoji */}
          <RuleItem
            icon={<Smile className="w-3.5 h-3.5" />}
            label="Emoji"
            value={
              mergedSettings.emoji_allowed 
                ? `Tối đa ${mergedSettings.emoji_limit || 3}` 
                : 'Không'
            }
            isOverridden={isOverridden('emoji_allowed') || isOverridden('emoji_limit')}
            originalValue={defaultSettings.emoji_allowed 
              ? `Tối đa ${defaultSettings.emoji_limit || 3}` 
              : 'Không'
            }
          />
          
          {/* Hashtag */}
          <RuleItem
            icon={<Hash className="w-3.5 h-3.5" />}
            label="Hashtag"
            value={
              mergedSettings.hashtag_limit > 0 
                ? `Tối đa ${mergedSettings.hashtag_limit}, ${mergedSettings.hashtag_position === 'end' ? 'cuối bài' : 'trong bài'}`
                : 'Không'
            }
            isOverridden={isOverridden('hashtag_limit')}
            originalValue={defaultSettings.hashtag_limit > 0 
              ? `Tối đa ${defaultSettings.hashtag_limit}` 
              : 'Không'
            }
          />
          
          {/* Link */}
          <RuleItem
            icon={<LinkIcon className="w-3.5 h-3.5" />}
            label="Link"
            value={linkLabels[mergedSettings.link_position] || mergedSettings.link_position}
            isOverridden={isOverridden('link_position')}
            originalValue={linkLabels[defaultSettings.link_position]}
          />
          
          {/* Format */}
          {mergedSettings.format_description && (
            <RuleItem
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Format"
              value={mergedSettings.format_description}
            />
          )}
          
          {/* Line break style */}
          <RuleItem
            icon={<AlignLeft className="w-3.5 h-3.5" />}
            label="Xuống dòng"
            value={lineBreakLabels[mergedSettings.line_break_style] || mergedSettings.line_break_style}
            isOverridden={isOverridden('line_break_style')}
            originalValue={lineBreakLabels[defaultSettings.line_break_style]}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
