import { useState } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChannelOverride } from '@/components/ChannelSettingsEditor';
import { DEFAULT_CHANNEL_SETTINGS, ChannelSettings } from '@/types/channelSettings';
import { Channel } from '@/types/multichannel';
import { BrandChannelOptimizationEditor } from './BrandChannelOptimizationEditor';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Settings2,
  Globe,
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  Send,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Megaphone,
  Smile,
  Link as LinkIcon,
  Shield,
  Music2,
  AtSign,
} from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';

const ALL_CHANNELS: Channel[] = [
  'website', 'facebook', 'instagram', 'twitter', 'google_maps',
  'linkedin', 'email', 'youtube', 'zalo_oa', 'telegram'
];

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

const channelLabels: Record<Channel, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
};

const ctaPolicyLabels: Record<string, string> = {
  required: 'Bắt buộc',
  soft: 'Mềm (không bán)',
  optional: 'Tuỳ chọn',
  none: 'Không có',
};

const linkPositionLabels: Record<string, string> = {
  body: 'Trong bài',
  end: 'Cuối bài',
  allowed: 'Có thể',
  none: 'Không link',
};

interface ChannelSettingsDetailProps {
  channel: Channel;
  override: ChannelOverride | undefined;
  defaults: ChannelSettings;
  hasOverride: boolean;
}

function ChannelSettingsDetail({
  channel,
  override,
  defaults,
  hasOverride,
}: ChannelSettingsDetailProps) {
  const [isOpen, setIsOpen] = useState(false);

  const lengthUnit = defaults.length_unit === 'chars' ? 'ký tự' : 'chữ';

  const minLength = override?.min_length ?? defaults.min_length ?? 0;
  const maxLength = override?.max_length ?? defaults.max_length;
  const hookRequired = override?.hook_required ?? defaults.hook_required;
  const ctaPolicy = override?.cta_policy ?? defaults.cta_policy;
  const emojiAllowed = override?.emoji_allowed ?? defaults.emoji_allowed;
  const emojiLimit = override?.emoji_limit ?? defaults.emoji_limit ?? 0;
  const hashtagLimit = override?.hashtag_limit ?? defaults.hashtag_limit;
  const linkPosition = override?.link_position ?? defaults.link_position;

  const allSettings = [
    {
      label: 'Độ dài',
      value: `${minLength}-${maxLength} ${lengthUnit}`,
      icon: <Type className="w-3.5 h-3.5" />,
      isOverridden: override?.min_length !== undefined || override?.max_length !== undefined,
    },
    {
      label: 'Hook',
      value: hookRequired ? 'Bắt buộc' : 'Không bắt buộc',
      icon: <Megaphone className="w-3.5 h-3.5" />,
      isOverridden: override?.hook_required !== undefined,
    },
    {
      label: 'CTA',
      value: ctaPolicyLabels[ctaPolicy] || ctaPolicy,
      icon: <Megaphone className="w-3.5 h-3.5" />,
      isOverridden: override?.cta_policy !== undefined,
    },
    {
      label: 'Emoji',
      value: emojiAllowed ? `Cho phép (max ${emojiLimit})` : 'Không',
      icon: <Smile className="w-3.5 h-3.5" />,
      isOverridden: override?.emoji_allowed !== undefined || override?.emoji_limit !== undefined,
    },
    {
      label: 'Hashtag',
      value: hashtagLimit > 0 ? `Tối đa ${hashtagLimit}` : 'Không',
      icon: <Hash className="w-3.5 h-3.5" />,
      isOverridden: override?.hashtag_limit !== undefined,
    },
    {
      label: 'Link',
      value: linkPositionLabels[linkPosition] || linkPosition,
      icon: <LinkIcon className="w-3.5 h-3.5" />,
      isOverridden: override?.link_position !== undefined,
    },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`flex w-full items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
            hasOverride
              ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
              : 'border-border/50 bg-muted/20 hover:border-border'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={hasOverride ? 'text-primary' : 'text-muted-foreground'}>
              {channelIcons[channel]}
            </span>
            <span className="font-medium text-sm truncate">{channelLabels[channel]}</span>
            {hasOverride && (
              <Badge variant="default" className="text-xs">
                Tùy chỉnh
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {minLength}-{maxLength} {lengthUnit}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className={`p-4 border border-t-0 rounded-b-lg space-y-3 ${
            hasOverride ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/10'
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allSettings.map((setting, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2 rounded-md border ${
                  setting.isOverridden
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-background border-border/30'
                }`}
              >
                <span
                  className={
                    setting.isOverridden ? 'text-primary mt-0.5' : 'text-muted-foreground mt-0.5'
                  }
                >
                  {setting.icon}
                </span>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {setting.label}
                    {setting.isOverridden && (
                      <span className="text-[10px] text-primary font-medium">(tùy chỉnh)</span>
                    )}
                  </p>
                  <p className="text-sm font-medium">{setting.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface BrandViewChannelsTabProps {
  template: BrandTemplate;
}

export function BrandViewChannelsTab({ template }: BrandViewChannelsTabProps) {
  const channelOverrides = template.channel_overrides as Record<Channel, unknown> | null;
  const overrideChannels = channelOverrides ? Object.keys(channelOverrides) as Channel[] : [];

  return (
    <div className="space-y-4">
      {/* AI Channel Optimization */}
      <BrandChannelOptimizationEditor brandTemplateId={template.id} />

      {/* Channel Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Channel Settings
            {overrideChannels.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {overrideChannels.length} kênh tùy chỉnh
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cấu hình cho từng kênh. Kênh có{' '}
            <span className="text-primary font-medium">"Tùy chỉnh"</span> có settings khác với
            mặc định.
          </p>
          <div className="space-y-2">
            {ALL_CHANNELS.map((channel) => {
              const override = channelOverrides?.[channel] as ChannelOverride | undefined;
              const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
              const hasOverride = override && Object.keys(override).length > 0;

              return (
                <ChannelSettingsDetail
                  key={channel}
                  channel={channel}
                  override={override}
                  defaults={defaults}
                  hasOverride={!!hasOverride}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Compliance Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {template.compliance_rules && template.compliance_rules.length > 0 ? (
            <ul className="space-y-2">
              {template.compliance_rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có quy tắc tuân thủ</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
