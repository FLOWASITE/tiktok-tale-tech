import { useState } from 'react';
import { Wand2, Palette, PenLine, HelpCircle } from 'lucide-react';
import { ChevronDown, Settings2, Camera, Brush, LayoutGrid, Box, Layers, Droplets, Film, Sparkles, Leaf, TrendingUp, Wheat, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LogoOptionsPanel, type LogoPosition, type LogoStyle } from './LogoOptionsPanel';
import { VisualTextPositionPreview } from './VisualTextPositionPreview';
import type { AspectRatioOption, ImageStylePreset } from '@/hooks/useAutoImageGeneration';
import type { ImageContentType, TextPosition, TypographyStyle, PromptMode } from '@/hooks/useSocialImageGeneration';
import type { SuggestionV3 } from '@/lib/imageSuggestionEngine';
import type { Channel } from '@/types/multichannel';
import { toast } from 'sonner';


const ROLE_CONFIG = {
  seed: { label: 'Seed 🌱', icon: Leaf, className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  sprout: { label: 'Sprout 🌿', icon: TrendingUp, className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  harvest: { label: 'Harvest 🌾', icon: Wheat, className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
} as const;

interface ImageAdvancedOptionsProps {
  // Style
  imageStyle: ImageStylePreset | 'auto';
  onImageStyleChange: (style: ImageStylePreset | 'auto') => void;
  v3Suggestions?: SuggestionV3[];

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

  // Text overlay (moved from main form)
  imageContentType: ImageContentType;
  onImageContentTypeChange: (type: ImageContentType) => void;
  useSharedText: boolean;
  onUseSharedTextChange: (shared: boolean) => void;
  textToInclude: string;
  onTextToIncludeChange: (text: string) => void;
  textsPerChannel: Record<Channel, string>;
  onTextsPerChannelChange: (texts: Record<Channel, string>) => void;
  // Prompt mode
  promptMode: PromptMode;
  onPromptModeChange: (mode: PromptMode) => void;
  // Refine text callback
  onRefineTextContent?: (text: string) => void;
  isRefiningText?: boolean;
  hidePromptModeSelector?: boolean;
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
  imageStyle, onImageStyleChange, v3Suggestions,
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
  imageContentType, onImageContentTypeChange,
  useSharedText, onUseSharedTextChange,
  textToInclude, onTextToIncludeChange,
  textsPerChannel, onTextsPerChannelChange,
  promptMode, onPromptModeChange,
  onRefineTextContent, isRefiningText,
  hidePromptModeSelector,
  className,
}: ImageAdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Find V3 suggestion for a style (to show score badge)
  const getV3Score = (style: string): SuggestionV3 | undefined =>
    v3Suggestions?.find(s => s.style === style);

  // Top V3 suggestion
  const topSuggestion = v3Suggestions?.[0];

  const enableTextOverlay = imageContentType === 'with_text';

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
        {/* Prompt Mode Selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            Mức độ kiểm soát AI
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Chọn mức độ AI can thiệp vào prompt tạo ảnh. Mặc định AI sẽ lo tất cả.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'full' as const, label: 'Để AI lo', icon: <Wand2 className="w-3.5 h-3.5" />, desc: 'AI tối ưu toàn bộ' },
              { value: 'brand_only' as const, label: 'Giữ brand', icon: <Palette className="w-3.5 h-3.5" />, desc: 'Bạn viết ý tưởng, AI giữ brand' },
              { value: 'raw' as const, label: 'Toàn quyền', icon: <PenLine className="w-3.5 h-3.5" />, desc: 'Bạn kiểm soát 100%' },
            ]).map(mode => (
              <button
                key={mode.value}
                type="button"
                onClick={() => onPromptModeChange(mode.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all",
                  promptMode === mode.value
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border/50 hover:border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {mode.icon}
                <span className="text-[11px] font-medium leading-tight">{mode.label}</span>
                <span className="text-[9px] opacity-70 leading-tight">{mode.desc}</span>
              </button>
            ))}
          </div>
          <p className={cn(
            "text-[10px] rounded-md px-2.5 py-1.5 border",
            promptMode === 'full' && "text-primary/80 bg-primary/5 border-primary/15",
            promptMode === 'brand_only' && "text-amber-700 dark:text-amber-400 bg-amber-500/5 border-amber-500/15",
            promptMode === 'raw' && "text-violet-700 dark:text-violet-400 bg-violet-500/5 border-violet-500/15",
          )}>
            {promptMode === 'full' && '✨ AI tự chọn phong cách, bố cục, vị trí text. Bạn chỉ cần duyệt.'}
            {promptMode === 'brand_only' && '🎨 Giữ logo & màu brand. Bạn tự chọn bố cục text & vị trí.'}
            {promptMode === 'raw' && '⚡ Bạn kiểm soát mọi thứ: phong cách, logo, text, bố cục.'}
          </p>
        </div>

        {/* Style Grid — only in raw mode (user picks manually) */}
        {promptMode === 'raw' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Phong cách ảnh</Label>
            <p className="text-[10px] text-muted-foreground/70 -mt-1">
              Chọn phong cách ảnh bạn muốn. Toàn quyền quyết định.
            </p>
            {topSuggestion && (
              <p className="text-[10px] text-muted-foreground/70 -mt-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-muted-foreground/40">
                        V3 gợi ý
                        <HelpCircle className="w-2.5 h-2.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                      Hệ thống V3 phân tích nội dung, kênh và mục tiêu để gợi ý phong cách ảnh phù hợp nhất.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                : <span className="font-medium text-primary">{topSuggestion.style}</span> ({topSuggestion.matchPercentage}%)
              </p>
            )}
            <div className="grid grid-cols-4 gap-1.5">
              {IMAGE_STYLES.map(s => {
                const isSelected = imageStyle === s.value;
                const v3 = s.value !== 'auto' ? getV3Score(s.value) : undefined;
                const isTop = topSuggestion?.style === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => onImageStyleChange(s.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs relative",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30 text-muted-foreground"
                    )}
                  >
                    {s.icon}
                    <span className="font-medium leading-tight">{s.label}</span>
                    {v3 && (
                      <span className={cn(
                        "text-[9px]",
                        isTop ? "text-primary font-semibold" : "text-muted-foreground/60"
                      )}>
                        {isTop ? `★ ${v3.matchPercentage}%` : `${v3.matchPercentage}%`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* V3 Compact Read-only — only in full mode */}
        {promptMode === 'full' && v3Suggestions && v3Suggestions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">AI đã chọn phong cách</Label>
            <div className="flex flex-wrap gap-1.5">
              {v3Suggestions.slice(0, 3).map((s, i) => (
                <span key={s.id} className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border",
                  i === 0 ? "bg-primary/10 border-primary/25 text-primary" : "bg-muted/40 border-border/40 text-muted-foreground"
                )}>
                  {i === 0 && '★ '}{s.style} · {s.matchPercentage}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tỉ lệ khung hình</Label>
          <p className="text-[10px] text-muted-foreground/70 -mt-1">
            "Tự động" sẽ chọn tỉ lệ tối ưu cho từng mạng xã hội.
          </p>
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

        {/* Logo Toggle + Options — all 3 modes */}
        {brandLogoUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Logo overlay</Label>
                <p className="text-[10px] text-muted-foreground/60">Logo thương hiệu sẽ được đặt lên ảnh ở vị trí bạn chọn.</p>
              </div>
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

        {/* Text Overlay Toggle — all 3 modes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">Thêm text lên ảnh</Label>
              </div>
              <p className="text-[10px] text-muted-foreground/60 ml-6">Thêm tiêu đề hoặc hook message trực tiếp lên ảnh.</p>
            </div>
            <Switch
              checked={enableTextOverlay}
              onCheckedChange={(checked) => onImageContentTypeChange(checked ? 'with_text' : 'background_only')}
            />
          </div>

          {enableTextOverlay && (
            <div className="space-y-3 pl-1">
              {/* Shared / Per-channel toggle */}
              <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-lg w-fit">
                <button
                  onClick={() => onUseSharedTextChange(true)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md transition-all font-medium",
                    useSharedText ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chung
                </button>
                <button
                  onClick={() => {
                    onUseSharedTextChange(false);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md transition-all font-medium",
                    !useSharedText ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Theo kênh
                </button>
              </div>

              {useSharedText ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Text trên ảnh</Label>
                    {onRefineTextContent && textToInclude.trim() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onRefineTextContent(textToInclude)}
                        disabled={isRefiningText}
                      >
                        {isRefiningText ? (
                          <>
                            <Wand2 className="w-3.5 h-3.5 animate-spin" />
                            Đang sửa...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5" />
                            AI sửa chữ
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={textToInclude}
                    onChange={e => onTextToIncludeChange(e.target.value)}
                    placeholder="Nhập text hiển thị trên ảnh..."
                    className="h-20 text-sm resize-none"
                  />
                </div>
              ) : (
                selectedChannels && selectedChannels.length > 0 && (
                  <Tabs defaultValue={selectedChannels[0]} className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                      {selectedChannels.map(ch => (
                        <TabsTrigger key={ch} value={ch} className="text-xs px-2 py-1 h-auto">
                          {ch}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {selectedChannels.map(ch => (
                      <TabsContent key={ch} value={ch} className="mt-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Text – {ch}</Label>
                        <Textarea
                          value={textsPerChannel[ch] || ''}
                          onChange={e => onTextsPerChannelChange({ ...textsPerChannel, [ch]: e.target.value })}
                          placeholder={`Text cho ${ch}...`}
                          className="h-16 text-sm resize-none"
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )
              )}
            </div>
          )}
        </div>

        {/* Text Position & Typography — hidden in full mode (AI handles layout) */}
        {promptMode !== 'full' && hasText && textPosition && onTextPositionChange && typographyStyle && onTypographyStyleChange && (
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
          <p className="text-[10px] text-muted-foreground/60 -mt-1">Liệt kê những gì KHÔNG muốn xuất hiện trong ảnh.</p>
          <Textarea
            value={negativePrompt}
            onChange={e => onNegativePromptChange(e.target.value)}
            placeholder="VD: text, watermark, logo, blurry..."
            className="h-16 text-xs resize-none"
          />
        </div>

        {/* Strategic Context — only in full mode */}
        {promptMode === 'full' && (contentRole || contentAngle || (selectedChannels && hookMessages && selectedChannels.some(ch => hookMessages[ch]?.hookMessage))) && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              Ngữ cảnh chiến lược
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    Thông tin về vai trò nội dung (Seed/Sprout/Harvest) và góc tiếp cận marketing.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
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
