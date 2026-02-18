import { useState } from 'react';
import { ChevronDown, Settings2, Camera, Brush, LayoutGrid, Box, Layers, Droplets, Film, Sparkles, Leaf, TrendingUp, Wheat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LogoOptionsPanel, type LogoPosition, type LogoStyle } from './LogoOptionsPanel';
import { VisualTextPositionPreview } from './VisualTextPositionPreview';
import type { AspectRatioOption, ImageStylePreset } from '@/hooks/useAutoImageGeneration';
import type { TextPosition, TypographyStyle } from '@/hooks/useSocialImageGeneration';
import type { StyleSuggestion } from '@/utils/imageStyleSuggestion';
import type { Channel } from '@/types/multichannel';


const ROLE_CONFIG = {
  seed: { label: 'Seed 🌱', icon: Leaf, className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  sprout: { label: 'Sprout 🌿', icon: TrendingUp, className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  harvest: { label: 'Harvest 🌾', icon: Wheat, className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
} as const;

interface ImageAdvancedOptionsProps {
  // Style
  imageStyle: ImageStylePreset | 'auto';
  onImageStyleChange: (style: ImageStylePreset | 'auto') => void;
  styleSuggestions?: StyleSuggestion[];

  // Aspect ratio
  aspectRatio: AspectRatioOption;
  onAspectRatioChange: (ratio: AspectRatioOption) => void;

  // Logo
  includeLogo: boolean;
  onIncludeLogoChange: (include: boolean) => void;
  logoPosition: LogoPosition;
  onLogoPositionChange: (pos: LogoPosition) => void;
  logoStyle: LogoStyle;
  onLogoStyleChange: (style: LogoStyle) => void;
  logoSize: number;
  onLogoSizeChange: (size: number) => void;
  logoOpacity: number;
  onLogoOpacityChange: (opacity: number) => void;
  brandLogoUrl?: string | null;

  // Text position (only when has text)
  hasText?: boolean;
  textPosition?: TextPosition;
  onTextPositionChange?: (pos: TextPosition) => void;
  typographyStyle?: TypographyStyle;
  onTypographyStyleChange?: (style: TypographyStyle) => void;
  textPreview?: string;

  // Negative prompt
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;

  // Strategic context
  contentRole?: 'seed' | 'sprout' | 'harvest';
  contentAngle?: string;
  selectedChannels?: Channel[];
  hookMessages?: Record<Channel, { hookMessage?: string; hookType?: string }>;

  className?: string;
}

const IMAGE_STYLES: { value: ImageStylePreset | 'auto'; label: string; icon: React.ReactNode }[] = [
  { value: 'auto', label: 'Tự động', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: 'photorealistic', label: 'Chân thực', icon: <Camera className="w-3.5 h-3.5" /> },
  { value: 'illustration', label: 'Minh họa', icon: <Brush className="w-3.5 h-3.5" /> },
  { value: 'minimalist', label: 'Tối giản', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { value: '3d_render', label: '3D', icon: <Box className="w-3.5 h-3.5" /> },
  { value: 'flat_design', label: 'Flat', icon: <Layers className="w-3.5 h-3.5" /> },
  { value: 'watercolor', label: 'Màu nước', icon: <Droplets className="w-3.5 h-3.5" /> },
  { value: 'cinematic', label: 'Điện ảnh', icon: <Film className="w-3.5 h-3.5" /> },
];

const ASPECT_RATIOS: { value: AspectRatioOption; label: string; desc: string }[] = [
  { value: 'auto', label: 'Tự động', desc: 'Tối ưu theo kênh' },
  { value: '16:9', label: '16:9', desc: 'Website' },
  { value: '1:1', label: '1:1', desc: 'Feed' },
  { value: '4:5', label: '4:5', desc: 'Portrait' },
  { value: '9:16', label: '9:16', desc: 'Stories' },
];

export function ImageAdvancedOptions({
  imageStyle, onImageStyleChange, styleSuggestions,
  aspectRatio, onAspectRatioChange,
  includeLogo, onIncludeLogoChange,
  logoPosition, onLogoPositionChange,
  logoStyle, onLogoStyleChange,
  logoSize, onLogoSizeChange,
  logoOpacity, onLogoOpacityChange,
  brandLogoUrl,
  hasText, textPosition, onTextPositionChange,
  typographyStyle, onTypographyStyleChange, textPreview,
  negativePrompt, onNegativePromptChange,
  contentRole, contentAngle, selectedChannels, hookMessages,
  className,
}: ImageAdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Find recommended style
  const recommended = styleSuggestions?.find(s => s.isRecommended);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tùy chỉnh nâng cao</span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-5 px-1">
        {/* Style Grid */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Phong cách ảnh</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {IMAGE_STYLES.map(s => {
              const isSelected = imageStyle === s.value;
              const isRec = recommended?.style === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onImageStyleChange(s.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  {s.icon}
                  <span className="font-medium leading-tight">{s.label}</span>
                  {isRec && !isSelected && (
                    <span className="text-[9px] text-primary">★ Gợi ý</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tỉ lệ khung hình</Label>
          <div className="flex flex-wrap gap-1.5">
            {ASPECT_RATIOS.map(r => (
              <button
                key={r.value}
                onClick={() => onAspectRatioChange(r.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  aspectRatio === r.value
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Toggle + Options */}
        {brandLogoUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Logo overlay</Label>
              <Switch checked={includeLogo} onCheckedChange={onIncludeLogoChange} />
            </div>
            {includeLogo && (
              <LogoOptionsPanel
                position={logoPosition}
                onPositionChange={onLogoPositionChange}
                style={logoStyle}
                onStyleChange={onLogoStyleChange}
                size={logoSize}
                onSizeChange={onLogoSizeChange}
                opacity={logoOpacity}
                onOpacityChange={onLogoOpacityChange}
                logoPreviewUrl={brandLogoUrl}
              />
            )}
          </div>
        )}

        {/* Text Position & Typography (only when has text) */}
        {hasText && textPosition && onTextPositionChange && typographyStyle && onTypographyStyleChange && (
          <VisualTextPositionPreview
            textPosition={textPosition}
            typographyStyle={typographyStyle}
            textPreview={textPreview}
            onPositionChange={onTextPositionChange}
            onTypographyChange={onTypographyStyleChange}
          />
        )}

        {/* Negative Prompt */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Không bao gồm (Negative prompt)</Label>
          <Textarea
            value={negativePrompt}
            onChange={e => onNegativePromptChange(e.target.value)}
            placeholder="VD: text, watermark, logo, blurry..."
            className="h-16 text-xs resize-none"
          />
        </div>

        {/* Strategic Context */}
        {(contentRole || contentAngle || (selectedChannels && hookMessages && selectedChannels.some(ch => hookMessages[ch]?.hookMessage))) && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ngữ cảnh chiến lược</Label>
            <div className="flex flex-wrap gap-1.5">
              {contentRole && (() => {
                const cfg = ROLE_CONFIG[contentRole];
                return (
                  <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", cfg.className)}>
                    {cfg.label}
                  </span>
                );
              })()}
              {contentAngle && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted/40 text-muted-foreground">
                  📐 {contentAngle}
                </span>
              )}
              {selectedChannels && hookMessages && selectedChannels.slice(0, 3).map(ch => {
                const h = hookMessages[ch];
                if (!h?.hookMessage) return null;
                return (
                  <span key={ch} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-primary/5 text-primary/70 border-primary/20 max-w-[180px] truncate">
                    {ch}: {h.hookMessage.slice(0, 40)}{h.hookMessage.length > 40 ? '...' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
