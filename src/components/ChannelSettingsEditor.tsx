import { useState, useMemo, useCallback } from 'react';
import { Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, ChevronDown, ChevronUp, RotateCcw, Info, Music2, AtSign, Zap, FileText, Eye, Copy, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
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

// Footer info type for preview
export interface BrandFooterInfo {
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  social_links?: Record<string, string>;
}

interface ChannelSettingsEditorProps {
  value: ChannelOverrides;
  onChange: (value: ChannelOverrides) => void;
  defaultExpanded?: boolean;
  showWrapper?: boolean;
  // Props for footer preview
  footerInfo?: BrandFooterInfo | null;
  brandAllowEmoji?: boolean;
  companyName?: string;
  tagline?: string;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <XIcon className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <ZaloIcon className="w-4 h-4" />,
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

// Valid footer template variables
const VALID_TEMPLATE_VARIABLES = ['phone', 'email', 'website', 'address', 'company'] as const;
type TemplateVariable = typeof VALID_TEMPLATE_VARIABLES[number];

interface TemplateValidation {
  isValid: boolean;
  usedVariables: TemplateVariable[];
  invalidVariables: string[];
  missingData: { variable: TemplateVariable; label: string }[];
}

// Validate footer template
function validateFooterTemplate(
  template: string,
  footerInfo: BrandFooterInfo | null | undefined,
  companyName?: string
): TemplateValidation {
  const result: TemplateValidation = {
    isValid: true,
    usedVariables: [],
    invalidVariables: [],
    missingData: [],
  };

  if (!template?.trim()) return result;

  // Find all {variable} patterns in template
  const variablePattern = /\{(\w+)\}/g;
  let match;
  const foundVariables = new Set<string>();

  while ((match = variablePattern.exec(template)) !== null) {
    foundVariables.add(match[1]);
  }

  // Check each found variable
  foundVariables.forEach((variable) => {
    if (VALID_TEMPLATE_VARIABLES.includes(variable as TemplateVariable)) {
      result.usedVariables.push(variable as TemplateVariable);
      
      // Check if data exists for this variable
      const dataMap: Record<TemplateVariable, { exists: boolean; label: string }> = {
        phone: { exists: !!footerInfo?.phone, label: 'Số điện thoại' },
        email: { exists: !!footerInfo?.email, label: 'Email' },
        website: { exists: !!footerInfo?.website, label: 'Website' },
        address: { exists: !!footerInfo?.address, label: 'Địa chỉ' },
        company: { exists: !!(companyName || footerInfo?.company_name), label: 'Tên công ty' },
      };

      const varData = dataMap[variable as TemplateVariable];
      if (!varData.exists) {
        result.missingData.push({ variable: variable as TemplateVariable, label: varData.label });
      }
    } else {
      result.invalidVariables.push(variable);
      result.isValid = false;
    }
  });

  return result;
}

// Template Validation Display Component
interface TemplateValidationDisplayProps {
  template: string;
  footerInfo: BrandFooterInfo | null | undefined;
  companyName?: string;
}

function TemplateValidationDisplay({ template, footerInfo, companyName }: TemplateValidationDisplayProps) {
  const validation = useMemo(
    () => validateFooterTemplate(template, footerInfo, companyName),
    [template, footerInfo, companyName]
  );

  if (!template?.trim()) return null;

  const hasIssues = validation.invalidVariables.length > 0 || validation.missingData.length > 0;
  if (!hasIssues) return null;

  return (
    <div className="space-y-1.5">
      {/* Invalid variables - Error */}
      {validation.invalidVariables.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-destructive">Biến không hợp lệ:</p>
            <p className="text-destructive/80">
              {validation.invalidVariables.map(v => `{${v}}`).join(', ')}
            </p>
            <p className="text-muted-foreground mt-1">
              Biến hợp lệ: {VALID_TEMPLATE_VARIABLES.map(v => `{${v}}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Missing data - Warning */}
      {validation.missingData.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-amber-600 dark:text-amber-400">Thiếu dữ liệu:</p>
            <ul className="list-disc list-inside text-amber-600/80 dark:text-amber-400/80">
              {validation.missingData.map(({ variable, label }) => (
                <li key={variable}>
                  <code className="bg-amber-500/20 px-1 rounded">{`{${variable}}`}</code> - {label}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1">
              Vui lòng cập nhật Footer Info ở Step 1 để hiển thị đúng.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Generate footer preview - client-side equivalent of formatFooterInfo
function generateFooterPreview(
  channel: Channel,
  footer: BrandFooterInfo,
  useEmoji: boolean,
  companyName?: string,
  tagline?: string,
  customTemplate?: string
): string {
  // If custom template exists, replace variables
  if (customTemplate?.trim()) {
    return customTemplate
      .replace(/\{phone\}/g, footer.phone || '[Phone]')
      .replace(/\{email\}/g, footer.email || '[Email]')
      .replace(/\{website\}/g, footer.website || '[Website]')
      .replace(/\{address\}/g, footer.address || '[Địa chỉ]')
      .replace(/\{company\}/g, companyName || footer.company_name || '[Company]');
  }

  const divider = '━━━━━━━━━━━━━━━━━━━━';
  const hasAnyInfo = footer.phone || footer.email || footer.website || footer.address;
  if (!hasAnyInfo) return '';

  // FACEBOOK / INSTAGRAM / LINKEDIN - Card Style
  if (['facebook', 'instagram', 'linkedin'].includes(channel)) {
    const lines: string[] = [divider];
    if (useEmoji) {
      lines.push('✨ LIÊN HỆ NGAY ✨', '');
      if (footer.phone) lines.push(`📞 Hotline: ${footer.phone}`);
      if (footer.email) lines.push(`📧 Email: ${footer.email}`);
      if (footer.website) lines.push(`🌐 Website: ${footer.website}`);
      if (footer.address) lines.push(`📍 Địa chỉ: ${footer.address}`);
    } else {
      lines.push('→ LIÊN HỆ NGAY', '');
      if (footer.phone) lines.push(`• Hotline: ${footer.phone}`);
      if (footer.email) lines.push(`• Email: ${footer.email}`);
      if (footer.website) lines.push(`• Website: ${footer.website}`);
      if (footer.address) lines.push(`• Địa chỉ: ${footer.address}`);
    }
    lines.push(divider);
    return lines.join('  \n');
  }

  // EMAIL - Professional Signature
  if (channel === 'email') {
    const lines: string[] = ['---'];
    if (companyName) lines.push(`\n${companyName}`);
    if (tagline) lines.push(tagline);
    lines.push('');
    if (footer.phone) lines.push(`Tel: ${footer.phone}`);
    if (footer.email) lines.push(`Email: ${footer.email}`);
    if (footer.website) lines.push(`Web: ${footer.website}`);
    if (footer.address) lines.push(`\n${footer.address}`);
    return lines.join('  \n');
  }

  // WEBSITE - Author Box
  if (channel === 'website') {
    const lines: string[] = ['---', ''];
    if (companyName) lines.push(`**${companyName}**`);
    if (tagline) lines.push(`_${tagline}_`);
    lines.push('');
    const contacts: string[] = [];
    if (footer.phone) contacts.push(footer.phone);
    if (footer.email) contacts.push(footer.email);
    if (footer.website) contacts.push(footer.website);
    if (contacts.length > 0) lines.push(contacts.join(' | '));
    return lines.join('  \n');
  }

  // TWITTER / TIKTOK / YOUTUBE - Compact CTA
  if (['twitter', 'tiktok', 'youtube', 'threads'].includes(channel)) {
    const parts: string[] = [];
    if (useEmoji) {
      if (footer.website) parts.push(`🔗 ${footer.website}`);
      else if (footer.phone) parts.push(`📞 ${footer.phone}`);
    } else {
      if (footer.website) parts.push(`→ ${footer.website}`);
      else if (footer.phone) parts.push(`Tel: ${footer.phone}`);
    }
    return parts.join('  \n');
  }

  // ZALO OA / TELEGRAM - Clean Professional
  if (['zalo_oa', 'telegram'].includes(channel)) {
    const lines: string[] = ['───────────────'];
    if (useEmoji) {
      if (footer.phone) lines.push(`📱 ${footer.phone}`);
      if (footer.website) lines.push(`🌐 ${footer.website}`);
    } else {
      if (footer.phone) lines.push(`Hotline: ${footer.phone}`);
      if (footer.website) lines.push(`Web: ${footer.website}`);
    }
    return lines.join('  \n');
  }

  // Default format
  const lines: string[] = [];
  if (footer.phone) lines.push(useEmoji ? `📞 ${footer.phone}` : `Tel: ${footer.phone}`);
  if (footer.email) lines.push(useEmoji ? `📧 ${footer.email}` : `Email: ${footer.email}`);
  if (footer.website) lines.push(useEmoji ? `🌐 ${footer.website}` : `Web: ${footer.website}`);
  return lines.join('  \n');
}

// Footer Preview Component
interface FooterPreviewProps {
  channel: Channel;
  footerInfo: BrandFooterInfo | null | undefined;
  useEmoji: boolean;
  companyName?: string;
  tagline?: string;
  customTemplate?: string;
  footerEnabled?: boolean;
}

function FooterPreview({
  channel,
  footerInfo,
  useEmoji,
  companyName,
  tagline,
  customTemplate,
  footerEnabled = true,
}: FooterPreviewProps) {
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => {
    if (!footerEnabled || !footerInfo) return null;
    
    const hasAnyInfo = footerInfo.phone || footerInfo.email || footerInfo.website || footerInfo.address;
    if (!hasAnyInfo && !customTemplate?.trim()) return null;
    
    return generateFooterPreview(channel, footerInfo, useEmoji, companyName, tagline, customTemplate);
  }, [channel, footerInfo, useEmoji, companyName, tagline, customTemplate, footerEnabled]);

  const handleCopy = useCallback(async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [preview]);

  if (!footerEnabled) return null;

  if (!footerInfo || (!footerInfo.phone && !footerInfo.email && !footerInfo.website && !footerInfo.address)) {
    return (
      <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground italic">
        Chưa có thông tin liên hệ. Vui lòng cập nhật Footer Info ở Step 1.
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Preview
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="p-3 rounded-lg border border-border/50 bg-background text-xs whitespace-pre-wrap font-mono leading-relaxed">
        {preview}
      </div>
    </div>
  );
}

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
  footerInfo,
  brandAllowEmoji,
  companyName,
  tagline,
}: { 
  channel: Channel; 
  override: ChannelOverride | undefined;
  onUpdate: (update: ChannelOverride) => void;
  onReset: () => void;
  compact?: boolean;
  footerInfo?: BrandFooterInfo | null;
  brandAllowEmoji?: boolean;
  companyName?: string;
  tagline?: string;
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
          {/* Word Count / Length */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Độ dài tối thiểu ({defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'})</Label>
              <Input
                type="number"
                min={0}
                max={currentMaxLength}
                value={currentMinLength}
                onChange={(e) => onUpdate({ min_length: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Độ dài tối đa ({defaults.length_unit === 'chars' ? 'ký tự' : 'chữ'})</Label>
              <Input
                type="number"
                min={currentMinLength}
                max={10000}
                value={currentMaxLength}
                onChange={(e) => onUpdate({ max_length: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs"
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
              <>
                <Textarea
                  placeholder={`Ví dụ:\n━━━━━━━━━━━━━━━━━━━━\n✨ LIÊN HỆ NGAY ✨\n📞 Hotline: {phone}\n📧 Email: {email}\n🌐 Website: {website}`}
                  value={currentFooterTemplate}
                  onChange={(e) => onUpdate({ footer_template: e.target.value })}
                  className="text-xs min-h-[80px] resize-y"
                />
                
                {/* Template Validation */}
                <TemplateValidationDisplay
                  template={currentFooterTemplate}
                  footerInfo={footerInfo}
                  companyName={companyName}
                />
                
                {/* Footer Preview */}
                <FooterPreview
                  channel={channel}
                  footerInfo={footerInfo}
                  useEmoji={brandAllowEmoji ?? true}
                  companyName={companyName}
                  tagline={tagline}
                  customTemplate={currentFooterTemplate}
                  footerEnabled={currentFooterEnabled}
                />
              </>
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

export function ChannelSettingsEditor({ 
  value, 
  onChange, 
  defaultExpanded = false, 
  showWrapper = true,
  footerInfo,
  brandAllowEmoji,
  companyName,
  tagline,
}: ChannelSettingsEditorProps) {
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
            footerInfo={footerInfo}
            brandAllowEmoji={brandAllowEmoji}
            companyName={companyName}
            tagline={tagline}
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
