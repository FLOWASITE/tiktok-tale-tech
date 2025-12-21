import { useState } from 'react';
import { Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, ChevronDown, ChevronUp, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Channel, CHANNELS } from '@/types/multichannel';
import { DEFAULT_CHANNEL_SETTINGS, ChannelSettings } from '@/types/channelSettings';

// Partial settings that can be overridden per channel
export type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position'
>>;

export type ChannelOverrides = Partial<Record<Channel, ChannelOverride>>;

interface ChannelSettingsEditorProps {
  value: ChannelOverrides;
  onChange: (value: ChannelOverrides) => void;
  defaultExpanded?: boolean;
  showWrapper?: boolean;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
};

const ctaPolicyOptions = [
  { value: 'required', label: 'Bắt buộc' },
  { value: 'soft', label: 'Mềm (không bán)' },
  { value: 'optional', label: 'Tuỳ chọn' },
  { value: 'none', label: 'Không có' },
];

const linkPositionOptions = [
  { value: 'body', label: 'Trong bài' },
  { value: 'end', label: 'Cuối bài' },
  { value: 'allowed', label: 'Có thể' },
  { value: 'none', label: 'Không link' },
];

function ChannelSettingRow({ 
  channel, 
  override, 
  onUpdate,
  onReset 
}: { 
  channel: Channel; 
  override: ChannelOverride | undefined;
  onUpdate: (update: ChannelOverride) => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  const channelInfo = CHANNELS.find(c => c.value === channel);
  const hasOverrides = override && Object.keys(override).length > 0;
  
  // Merged values
  const currentMaxLength = override?.max_length ?? defaults.max_length;
  const currentMinLength = override?.min_length ?? defaults.min_length ?? 0;
  const currentHookRequired = override?.hook_required ?? defaults.hook_required;
  const currentCtaPolicy = override?.cta_policy ?? defaults.cta_policy;
  const currentEmojiAllowed = override?.emoji_allowed ?? defaults.emoji_allowed;
  const currentEmojiLimit = override?.emoji_limit ?? defaults.emoji_limit ?? 0;
  const currentHashtagLimit = override?.hashtag_limit ?? defaults.hashtag_limit;
  const currentLinkPosition = override?.link_position ?? defaults.link_position;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{channelIcons[channel]}</span>
            <span className="font-medium text-sm">{channelInfo?.label || channel}</span>
            {hasOverrides && (
              <Badge variant="secondary" className="text-xs">
                Đã tùy chỉnh
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {currentMinLength}-{currentMaxLength} {defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border border-t-0 border-border/50 rounded-b-lg space-y-4 bg-muted/20">
          {/* Length Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                Độ dài tối thiểu
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mặc định: {defaults.min_length ?? 0} {defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                min={0}
                value={currentMinLength}
                onChange={(e) => onUpdate({ min_length: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                Độ dài tối đa
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mặc định: {defaults.max_length} {defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                min={1}
                value={currentMaxLength}
                onChange={(e) => onUpdate({ max_length: parseInt(e.target.value) || defaults.max_length })}
                className="h-8"
              />
            </div>
          </div>

          {/* Hook & CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Hook bắt buộc</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  checked={currentHookRequired}
                  onCheckedChange={(checked) => onUpdate({ hook_required: checked })}
                />
                <span className="text-xs text-muted-foreground">
                  {currentHookRequired ? 'Có' : 'Không'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CTA Policy</Label>
              <Select
                value={currentCtaPolicy}
                onValueChange={(value) => onUpdate({ cta_policy: value as ChannelSettings['cta_policy'] })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ctaPolicyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Emoji & Hashtag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Emoji</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={currentEmojiAllowed}
                  onCheckedChange={(checked) => onUpdate({ emoji_allowed: checked, emoji_limit: checked ? (override?.emoji_limit ?? defaults.emoji_limit ?? 3) : 0 })}
                />
                {currentEmojiAllowed && (
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={currentEmojiLimit}
                    onChange={(e) => onUpdate({ emoji_limit: parseInt(e.target.value) || 0 })}
                    className="h-8 w-16"
                    placeholder="Max"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hashtag (số lượng)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={currentHashtagLimit}
                onChange={(e) => onUpdate({ hashtag_limit: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
          </div>

          {/* Link Position */}
          <div className="space-y-1.5">
            <Label className="text-xs">Link Policy</Label>
            <Select
              value={currentLinkPosition}
              onValueChange={(value) => onUpdate({ link_position: value as ChannelSettings['link_position'] })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkPositionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          {hasOverrides && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Đặt lại mặc định
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChannelSettingsEditor({ value, onChange, defaultExpanded = false, showWrapper = true }: ChannelSettingsEditorProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  
  const hasAnyOverrides = Object.keys(value).some(
    (ch) => value[ch as Channel] && Object.keys(value[ch as Channel]!).length > 0
  );

  const handleUpdateChannel = (channel: Channel, update: ChannelOverride) => {
    const currentOverride = value[channel] || {};
    const newOverride = { ...currentOverride, ...update };
    
    // Clean up if values match defaults
    const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
    const cleanedOverride: ChannelOverride = {};
    
    if (newOverride.max_length !== undefined && newOverride.max_length !== defaults.max_length) {
      cleanedOverride.max_length = newOverride.max_length;
    }
    if (newOverride.min_length !== undefined && newOverride.min_length !== (defaults.min_length ?? 0)) {
      cleanedOverride.min_length = newOverride.min_length;
    }
    if (newOverride.hook_required !== undefined && newOverride.hook_required !== defaults.hook_required) {
      cleanedOverride.hook_required = newOverride.hook_required;
    }
    if (newOverride.cta_policy !== undefined && newOverride.cta_policy !== defaults.cta_policy) {
      cleanedOverride.cta_policy = newOverride.cta_policy;
    }
    if (newOverride.emoji_allowed !== undefined && newOverride.emoji_allowed !== defaults.emoji_allowed) {
      cleanedOverride.emoji_allowed = newOverride.emoji_allowed;
    }
    if (newOverride.emoji_limit !== undefined && newOverride.emoji_limit !== (defaults.emoji_limit ?? 0)) {
      cleanedOverride.emoji_limit = newOverride.emoji_limit;
    }
    if (newOverride.hashtag_limit !== undefined && newOverride.hashtag_limit !== defaults.hashtag_limit) {
      cleanedOverride.hashtag_limit = newOverride.hashtag_limit;
    }
    if (newOverride.link_position !== undefined && newOverride.link_position !== defaults.link_position) {
      cleanedOverride.link_position = newOverride.link_position;
    }

    const newValue = { ...value };
    if (Object.keys(cleanedOverride).length > 0) {
      newValue[channel] = cleanedOverride;
    } else {
      delete newValue[channel];
    }
    
    onChange(newValue);
  };

  const handleResetChannel = (channel: Channel) => {
    const newValue = { ...value };
    delete newValue[channel];
    onChange(newValue);
  };

  const handleResetAll = () => {
    onChange({});
  };

  // Render channel list directly without collapsible wrapper
  if (!CHANNELS || CHANNELS.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
        <p className="text-sm text-muted-foreground">Không có danh sách kênh để cấu hình.</p>
      </div>
    );
  }

  const channelList = (
    <div className="space-y-2">
      {CHANNELS.map((ch) => (
        <ChannelSettingRow
          key={ch.value}
          channel={ch.value}
          override={value[ch.value]}
          onUpdate={(update) => handleUpdateChannel(ch.value, update)}
          onReset={() => handleResetChannel(ch.value)}
        />
      ))}
    </div>
  );

  // When showWrapper is false, just render the channel list
  if (!showWrapper) {
    return channelList;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border/50 rounded-lg">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Cài đặt kênh nâng cao</h3>
            {hasAnyOverrides && (
              <Badge variant="secondary" className="text-xs">
                Đã tùy chỉnh
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Tuỳ chỉnh rules cho từng kênh
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Override cài đặt mặc định của từng kênh cho Brand này. Những setting không thay đổi sẽ dùng giá trị mặc định.
          </p>
          
          {hasAnyOverrides && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Đặt lại tất cả
            </Button>
          )}

          {channelList}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
