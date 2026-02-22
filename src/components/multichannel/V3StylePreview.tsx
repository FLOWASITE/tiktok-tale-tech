import { Camera, Brush, LayoutGrid, Box, Layers, Droplets, Film, Sparkles, Palette, Hexagon, CircleDot, Blend, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuggestionV3 } from '@/lib/imageSuggestionEngine';
import type { ImageStylePreset } from '@/hooks/useAutoImageGeneration';

interface V3StylePreviewProps {
  suggestions: SuggestionV3[];
  selectedStyle: ImageStylePreset | 'auto';
  onStyleSelect: (style: ImageStylePreset) => void;
}

const STYLE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  photorealistic: { label: 'Chân thực', icon: <Camera className="w-4 h-4" /> },
  illustration: { label: 'Minh họa', icon: <Brush className="w-4 h-4" /> },
  minimalist: { label: 'Tối giản', icon: <LayoutGrid className="w-4 h-4" /> },
  '3d_render': { label: '3D Render', icon: <Box className="w-4 h-4" /> },
  flat_design: { label: 'Flat Design', icon: <Layers className="w-4 h-4" /> },
  watercolor: { label: 'Màu nước', icon: <Droplets className="w-4 h-4" /> },
  cinematic: { label: 'Điện ảnh', icon: <Film className="w-4 h-4" /> },
  abstract: { label: 'Trừu tượng', icon: <Palette className="w-4 h-4" /> },
  geometric: { label: 'Hình học', icon: <Hexagon className="w-4 h-4" /> },
  isometric: { label: 'Isometric', icon: <CircleDot className="w-4 h-4" /> },
  gradient: { label: 'Gradient', icon: <Blend className="w-4 h-4" /> },
  product_only: { label: 'Sản phẩm', icon: <Package className="w-4 h-4" /> },
};

export function V3StylePreview({ suggestions, selectedStyle, onStyleSelect }: V3StylePreviewProps) {
  if (!suggestions || suggestions.length === 0) return null;

  const top3 = suggestions.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">AI gợi ý phong cách</span>
      </div>

      <div className="grid gap-1.5">
        {top3.map((s, i) => {
          const meta = STYLE_META[s.style] ?? { label: s.style, icon: <Sparkles className="w-4 h-4" /> };
          const isSelected = selectedStyle === s.style;
          const reasonShort = s.reason.split(' | ')[0]; // Take the first part before the role/goal

          return (
            <button
              key={s.id}
              onClick={() => onStyleSelect(s.style as ImageStylePreset)}
              className={cn(
                "flex items-start gap-3 w-full text-left p-2.5 rounded-lg border-2 transition-all group",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              {/* Rank + Icon */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors",
                isSelected ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
              )}>
                {meta.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {meta.label}
                  </span>
                  {i === 0 && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      ★ Best
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                  {reasonShort}
                </p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-end shrink-0 gap-0.5">
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {s.matchPercentage}%
                </span>
                {/* Mini bar */}
                <div className="w-10 h-1 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${s.matchPercentage}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
