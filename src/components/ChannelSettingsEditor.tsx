import { useState } from 'react';
import { Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, ChevronDown, ChevronUp, RotateCcw, Info, Music2, AtSign, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';

// Partial settings that can be overridden per channel
export type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position'
>> & {
  footer_template?: string; // Custom footer template for this channel
  footer_enabled?: boolean; // Enable/disable footer for this channel
};

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
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

// Popular channels to show first
const POPULAR_CHANNELS: Channel[] = ['facebook', 'instagram', 'linkedin', 'website', 'tiktok'];

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

// Presets
const CHANNEL_PRESETS = {
  standard: {
    label: 'Chuẩn',
    description: 'Cài đặt mặc định cho tất cả kênh',
    overrides: {} as ChannelOverrides,
  },
  social: {
    label: 'Social-focused',
    description: 'Tối ưu cho mạng xã hội: emoji nhiều, hashtag phù hợp',
    overrides: {
      facebook: { emoji_allowed: true, emoji_limit: 5, hashtag_limit: 5 },
      instagram: { emoji_allowed: true, emoji_limit: 8, hashtag_limit: 20 },
      tiktok: { emoji_allowed: true, emoji_limit: 6, hashtag_limit: 10 },
      twitter: { emoji_allowed: true, emoji_limit: 3, hashtag_limit: 3 },
    } as ChannelOverrides,
  },
  professional: {
    label: 'Professional',
    description: 'Ít emoji, CTA rõ ràng, phù hợp B2B',
    overrides: {
      linkedin: { emoji_allowed: false, emoji_limit: 0, cta_policy: 'required' },
      email: { emoji_allowed: false, emoji_limit: 0, cta_policy: 'required' },
      website: { emoji_allowed: false, emoji_limit: 0, cta_policy: 'required' },
    } as ChannelOverrides,
  },
};

function ChannelSettingRow({ 
  channel, 
  override, 
  onUpdate,
  onReset,
  compact = false,
}: { 
  channel: Channel; 
  override: ChannelOverride | undefined;
  onUpdate: (update: ChannelOverride) => void;
  onReset: () => void;
  compact?: boolean;
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
  const currentFooterEnabled = override?.footer_enabled ?? true;
  const currentFooterTemplate = override?.footer_template ?? '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border transition-colors",
            compact ? "p-2.5" : "p-3",
            hasOverrides ? "border-primary/30 bg-primary/5" : "border-border/50 hover:border-border"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-muted-foreground">{channelIcons[channel]}</span>
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {channelInfo?.label || channel}
            </span>
            {hasOverrides && (
              <Badge variant="secondary" className="text-[10px] h-4">
                Tuỳ chỉnh
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {currentMinLength}-{currentMaxLength} {defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'}
            </span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 border border-t-0 border-border/50 rounded-b-lg space-y-3 bg-muted/20">
          {/* Length Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                Min
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mặc định: {defaults.min_length ?? 0}</p>
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
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                Max
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mặc định: {defaults.max_length}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Hook</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  checked={currentHookRequired}
                  onCheckedChange={(checked) => onUpdate({ hook_required: checked })}
                />
                <span className="text-xs text-muted-foreground">
                  {currentHookRequired ? 'Bắt buộc' : 'Không'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA</Label>
              <Select
                value={currentCtaPolicy}
                onValueChange={(value) => onUpdate({ cta_policy: value as ChannelSettings['cta_policy'] })}
              >
                <SelectTrigger className="h-8 text-xs">
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

          {/* Emoji & Hashtag & Link */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Emoji</Label>
              <div className="flex items-center gap-1">
                <Switch
                  checked={currentEmojiAllowed}
                  onCheckedChange={(checked) => onUpdate({ emoji_allowed: checked, emoji_limit: checked ? (override?.emoji_limit ?? defaults.emoji_limit ?? 3) : 0 })}
                  className="scale-90"
                />
                {currentEmojiAllowed && (
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={currentEmojiLimit}
                    onChange={(e) => onUpdate({ emoji_limit: parseInt(e.target.value) || 0 })}
                    className="h-7 w-12 text-xs"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hashtag</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={currentHashtagLimit}
                onChange={(e) => onUpdate({ hashtag_limit: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link</Label>
              <Select
                value={currentLinkPosition}
                onValueChange={(value) => onUpdate({ link_position: value as ChannelSettings['link_position'] })}
              >
                <SelectTrigger className="h-8 text-xs">
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
          </div>

          {/* Footer Template Section */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Footer liên hệ
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Tuỳ chỉnh template footer cho kênh này. Dùng biến: {'{phone}'}, {'{email}'}, {'{website}'}, {'{address}'}, {'{company}'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Switch
                checked={currentFooterEnabled}
                onCheckedChange={(checked) => onUpdate({ footer_enabled: checked })}
                className="scale-75"
              />
            </div>
            {currentFooterEnabled && (
              <Textarea
                placeholder={`Ví dụ:\n━━━━━━━━━━━━━━━━━━━━\n✨ LIÊN HỆ NGAY ✨\n📞 Hotline: {phone}\n📧 Email: {email}\n🌐 Website: {website}`}
                value={currentFooterTemplate}
                onChange={(e) => onUpdate({ footer_template: e.target.value })}
                className="text-xs min-h-[80px] resize-y"
              />
            )}
          </div>

          {/* Reset Button */}
          {hasOverrides && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChannelSettingsEditor({ value, onChange, defaultExpanded = false, showWrapper = true }: ChannelSettingsEditorProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [showAllChannels, setShowAllChannels] = useState(false);
  
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
    // Footer fields - always keep if set
    if (newOverride.footer_enabled !== undefined && newOverride.footer_enabled !== true) {
      cleanedOverride.footer_enabled = newOverride.footer_enabled;
    }
    if (newOverride.footer_template !== undefined && newOverride.footer_template.trim() !== '') {
      cleanedOverride.footer_template = newOverride.footer_template;
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

  const handleApplyPreset = (presetKey: keyof typeof CHANNEL_PRESETS) => {
    const preset = CHANNEL_PRESETS[presetKey];
    onChange(preset.overrides);
  };

  if (!CHANNELS || CHANNELS.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
        <p className="text-sm text-muted-foreground">Không có danh sách kênh để cấu hình.</p>
      </div>
    );
  }

  // Split channels
  const popularChannelsList = CHANNELS.filter(ch => POPULAR_CHANNELS.includes(ch.value));
  const otherChannelsList = CHANNELS.filter(ch => !POPULAR_CHANNELS.includes(ch.value));
  const displayedChannels = showAllChannels ? CHANNELS : popularChannelsList;

  const channelContent = (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CHANNEL_PRESETS).map(([key, preset]) => (
          <TooltipProvider key={key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(key as keyof typeof CHANNEL_PRESETS)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Zap className="w-3 h-3" />
                  {preset.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{preset.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {hasAnyOverrides && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="h-7 text-xs text-muted-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset tất cả
          </Button>
        )}
      </div>

      {/* Channel List */}
      <div className="space-y-2">
        {!showAllChannels && (
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Kênh phổ biến
          </p>
        )}
        {displayedChannels.map((ch) => (
          <ChannelSettingRow
            key={ch.value}
            channel={ch.value}
            override={value[ch.value]}
            onUpdate={(update) => handleUpdateChannel(ch.value, update)}
            onReset={() => handleResetChannel(ch.value)}
            compact
          />
        ))}
      </div>

      {/* Show More Button */}
      {!showAllChannels && otherChannelsList.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAllChannels(true)}
          className="w-full text-xs text-muted-foreground"
        >
          Hiển thị thêm {otherChannelsList.length} kênh khác
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}

      {showAllChannels && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAllChannels(false)}
          className="w-full text-xs text-muted-foreground"
        >
          Thu gọn
          <ChevronUp className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );

  if (!showWrapper) {
    return channelContent;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border/50 rounded-lg">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Cài đặt kênh</h3>
            {hasAnyOverrides && (
              <Badge variant="secondary" className="text-xs">
                Đã tùy chỉnh
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Tuỳ chỉnh rules cho từng kênh
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0">
          {channelContent}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
