import { useState } from 'react';
import { ChevronDown, Palette, Ratio, Users, Target, MessageSquare, Type, Globe, Sparkles, Shield, SlidersHorizontal } from 'lucide-react';
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

export function PromptPreview({
  channels, promptMode, imageStyle, brandPrimaryColor,
  contentRole, contentAngle, hookType, imageContentType,
  countryCode, personaName, className,
}: PromptPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mode = MODE_META[promptMode];

  // Build info rows
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [];

  // Channels + aspect ratios
  const channelInfo = channels.map(ch => {
    const ar = CHANNEL_OPTIMAL_ASPECT_RATIO[ch] || '1:1';
    return `${ch} (${ar})`;
  }).join(', ');
  rows.push({ icon: <Ratio className="w-3.5 h-3.5" />, label: 'Kênh', value: channelInfo });

  // Style
  rows.push({ icon: <Palette className="w-3.5 h-3.5" />, label: 'Phong cách', value: STYLE_LABELS[imageStyle] || imageStyle });

  // Brand color usage
  if (brandPrimaryColor && promptMode !== 'raw') {
    rows.push({ icon: <Palette className="w-3.5 h-3.5" />, label: 'Brand color', value: `${brandPrimaryColor} (${mode.colorBrand})` });
  }

  // Persona
  if (personaName && promptMode === 'full') {
    rows.push({ icon: <Users className="w-3.5 h-3.5" />, label: 'Đối tượng', value: personaName });
  }

  // Content role
  if (contentRole && promptMode === 'full') {
    rows.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'Vai trò', value: ROLE_LABELS[contentRole] || contentRole });
  }

  // Content angle
  if (contentAngle && promptMode === 'full') {
    rows.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'Góc tiếp cận', value: ANGLE_LABELS[contentAngle] || contentAngle });
  }

  // Hook type
  if (hookType && promptMode === 'full') {
    rows.push({ icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Hook', value: hookType });
  }

  // Text overlay
  rows.push({
    icon: <Type className="w-3.5 h-3.5" />,
    label: 'Text overlay',
    value: imageContentType === 'with_text' ? 'Có' : 'Không',
  });

  // Country
  if (countryCode) {
    rows.push({ icon: <Globe className="w-3.5 h-3.5" />, label: 'Thị trường', value: countryCode });
  }

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
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground mt-0.5 shrink-0">{row.icon}</span>
              <span className="text-muted-foreground shrink-0 w-20">{row.label}:</span>
              <span className="text-foreground font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
