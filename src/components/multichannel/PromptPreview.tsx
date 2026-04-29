import { useState } from 'react';
import { ChevronDown, Palette, Ratio, Users, Target, MessageSquare, Type, Globe, Sparkles, Shield, SlidersHorizontal, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Channel } from '@/types/multichannel';
import type { PromptMode } from '@/hooks/useSocialImageGeneration';
import type { ContentRole, ContentAngle } from '@/config/visualScoringConfig';
import { CHANNEL_OPTIMAL_ASPECT_RATIO } from '@/config/channelImageConfig';

interface PromptPreviewProps {
  channels: Channel[];
  promptMode: PromptMode;
  imageStyle: string;
  brandPrimaryColor?: string | null;
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  hookType?: string;
  imageContentType: 'background_only' | 'with_text';
  countryCode?: string;
  personaName?: string;
  className?: string;
}

const MODE_META: Record<PromptMode, { label: string; icon: React.ReactNode; colorBrand: string }> = {
  full: { label: 'Để AI lo', icon: <Sparkles className="w-3.5 h-3.5" />, colorBrand: 'Dominant' },
  brand_only: { label: 'Giữ Brand', icon: <Shield className="w-3.5 h-3.5" />, colorBrand: 'Accent' },
  raw: { label: 'Toàn quyền', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, colorBrand: 'Không áp dụng' },
};

const STYLE_LABELS: Record<string, string> = {
  auto: 'Tự động', photorealistic: 'Chân thực', illustration: 'Minh họa', minimalist: 'Tối giản',
  '3d_render': '3D', flat_design: 'Flat', watercolor: 'Màu nước', cinematic: 'Điện ảnh',
  abstract: 'Trừu tượng', geometric: 'Hình học', isometric: 'Isometric', gradient: 'Gradient',
};

const ROLE_LABELS: Record<string, string> = {
  seed: '🌱 Seed — Thu hút', sprout: '🌿 Sprout — Xây dựng tin tưởng', harvest: '🌾 Harvest — Chuyển đổi',
};

const ANGLE_LABELS: Record<string, string> = {
  educational: 'Giáo dục', storytelling: 'Kể chuyện', promotional: 'Quảng bá',
  social_proof: 'Bằng chứng xã hội', behind_the_scenes: 'Hậu trường', qa_faq: 'Hỏi đáp',
};

const CHANNEL_LAYOUT_LABELS: Partial<Record<Channel, string>> = {
  tiktok: 'Vertical storytelling',
  instagram: 'Visual-first, text tối thiểu',
  pinterest: 'Visual-first, text tối thiểu',
  youtube: 'Thumbnail style',
  linkedin: 'Professional layout',
  email: 'Hero banner',
};

type RowState = 'active' | 'partial' | 'inactive';

interface InfoRow {
  icon: React.ReactNode;
  label: string;
  value: string;
  state: RowState;
}

export function PromptPreview({
  channels, promptMode, imageStyle, brandPrimaryColor,
  contentRole, contentAngle, hookType, imageContentType,
  countryCode, personaName, className,
}: PromptPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mode = MODE_META[promptMode];
  const isFullMode = promptMode === 'full';
  const isBrandOnly = promptMode === 'brand_only';
  const isRawMode = promptMode === 'raw';

  // Build info rows
  const rows: InfoRow[] = [];
  const inactiveLabels: string[] = [];

  // Channels + aspect ratios
  const channelInfo = channels.map(ch => {
    const ar = CHANNEL_OPTIMAL_ASPECT_RATIO[ch] || '1:1';
    return `${ch} (${ar})`;
  }).join(', ');
  rows.push({ icon: <Ratio className="w-3.5 h-3.5" />, label: 'Kênh', value: channelInfo, state: 'active' });

  // Style
  rows.push({ icon: <Palette className="w-3.5 h-3.5" />, label: 'Phong cách', value: STYLE_LABELS[imageStyle] || imageStyle, state: 'active' });

  // Brand color usage
  if (isRawMode) {
    inactiveLabels.push('Brand color');
  } else if (brandPrimaryColor) {
    rows.push({ icon: <Palette className="w-3.5 h-3.5" />, label: 'Brand color', value: `${brandPrimaryColor} (${mode.colorBrand})`, state: 'active' });
  }

  // Persona — full in full mode, partial in brand_only, inactive in raw
  if (isFullMode) {
    rows.push({ icon: <Users className="w-3.5 h-3.5" />, label: 'Đối tượng', value: personaName || 'Chưa chọn', state: 'active' });
  } else if (isBrandOnly) {
    rows.push({ icon: <Users className="w-3.5 h-3.5" />, label: 'Đối tượng', value: personaName ? `${personaName} — Áp dụng nhẹ` : 'Chưa chọn', state: 'partial' });
  } else {
    inactiveLabels.push('đối tượng');
  }

  // Content role — full mode only
  if (isFullMode) {
    rows.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'Vai trò', value: contentRole ? (ROLE_LABELS[contentRole] || contentRole) : 'Chưa chọn', state: 'active' });
  } else {
    inactiveLabels.push('vai trò');
  }

  // Content angle — full mode only
  if (isFullMode) {
    rows.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'Góc tiếp cận', value: contentAngle ? (ANGLE_LABELS[contentAngle] || contentAngle) : 'Chưa chọn', state: 'active' });
  } else {
    inactiveLabels.push('góc tiếp cận');
  }

  // Hook type — full mode only
  if (isFullMode) {
    if (hookType) {
      rows.push({ icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Hook', value: hookType, state: 'active' });
    }
  } else {
    inactiveLabels.push('hook');
  }

  // Content source — differs by mode
  rows.push({
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    label: 'Nguồn nội dung',
    value: isFullMode ? 'AI từ tóm tắt' : 'Mô tả của bạn',
    state: 'active',
  });

  // Text overlay + layout type per channel
  if (imageContentType === 'with_text') {
    const layoutDetails = channels.map(ch => {
      const layoutLabel = CHANNEL_LAYOUT_LABELS[ch];
      return layoutLabel ? `${ch}: ${layoutLabel}` : `${ch}: Poster 3 phần`;
    });
    rows.push({ icon: <Type className="w-3.5 h-3.5" />, label: 'Vị trí text', value: isFullMode ? 'Channel-optimized auto' : 'Bạn chọn', state: 'active' });
    rows.push({ icon: <Type className="w-3.5 h-3.5" />, label: 'Text overlay', value: `Có — ${layoutDetails.join(', ')}`, state: 'active' });
  } else {
    rows.push({ icon: <Type className="w-3.5 h-3.5" />, label: 'Text overlay', value: 'Không', state: 'active' });
  }

  // Localization — always active for all modes
  rows.push({ icon: <Globe className="w-3.5 h-3.5" />, label: 'Bản địa hóa', value: countryCode || 'Auto', state: 'active' });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
            "border-border/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-1.5 font-medium">
            {mode.icon}
            📋 Xem AI sẽ dùng thông tin gì
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded-lg border border-border/40 bg-card/50 p-3 space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className={cn(
              "flex items-start gap-2 text-xs",
              row.state === 'partial' && "opacity-60"
            )}>
              <span className="text-muted-foreground mt-0.5 shrink-0">
                {row.state === 'partial' ? <span className="text-xs">~</span> : row.icon}
              </span>
              <span className="text-muted-foreground shrink-0 w-20">{row.label}:</span>
              <span className={cn(
                "font-medium",
                row.state === 'partial' ? "text-muted-foreground italic" : "text-foreground"
              )}>
                {row.value}
              </span>
            </div>
          ))}

          {inactiveLabels.length > 0 && (
            <p className="text-xs text-muted-foreground/60 italic pt-1 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {inactiveLabels.join(', ')} không áp dụng ở chế độ này.
                {!isFullMode && <span className="ml-1 text-primary/60">Chuyển "Để AI lo" để bật.</span>}
              </span>
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
