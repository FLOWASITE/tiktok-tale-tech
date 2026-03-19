import { CarouselSlide, CarouselStyleType, VisualPresetType, textContentToString } from '@/types/carousel';
import { cn } from '@/lib/utils';
import { Camera, Hash, ArrowRight, Eye } from 'lucide-react';

// ============================================
// Slide Role Detection (mirrors backend logic)
// ============================================
function detectSlideRole(
  slideNumber: number,
  totalSlides: number,
  objective: string,
  carouselStyle: string,
): string {
  if (carouselStyle === 'gallery') {
    if (slideNumber === 1) return 'hook';
    if (slideNumber === totalSlides) return 'cta';
    return 'visual';
  }
  if (slideNumber === 1) return 'hook';
  if (slideNumber === totalSlides) return 'cta';
  const objLower = (objective || '').toLowerCase();
  if (objLower.includes('data') || objLower.includes('số') || objLower.includes('thống kê')) return 'dataPoint';
  return 'body';
}

// ============================================
// Preset visual tokens for CSS mockup
// ============================================
const PRESET_MOCK_STYLES: Record<string, {
  bg: string; textColor: string; accent: string; font: string; headingFont?: string;
}> = {
  minimalist: { bg: 'bg-white', textColor: 'text-gray-800', accent: 'bg-blue-500', font: 'font-sans', headingFont: 'font-sans' },
  flat_design: { bg: 'bg-gray-900', textColor: 'text-white', accent: 'bg-yellow-400', font: 'font-sans', headingFont: 'font-bold' },
  gradient: { bg: 'bg-gradient-to-br from-purple-600 to-pink-500', textColor: 'text-white', accent: 'bg-white/30', font: 'font-sans' },
  geometric: { bg: 'bg-slate-800', textColor: 'text-white', accent: 'bg-amber-400', font: 'font-serif' },
  illustration: { bg: 'bg-amber-50', textColor: 'text-amber-900', accent: 'bg-orange-400', font: 'font-sans' },
  product_only: { bg: 'bg-gray-50', textColor: 'text-gray-900', accent: 'bg-red-500', font: 'font-sans' },
};

const ROLE_LABELS: Record<string, { label: string; icon: typeof Eye }> = {
  hook: { label: 'Hook', icon: Eye },
  body: { label: 'Nội dung', icon: Hash },
  cta: { label: 'CTA', icon: ArrowRight },
  visual: { label: 'Visual', icon: Camera },
  dataPoint: { label: 'Data', icon: Hash },
};

// ============================================
// Parse structured text content for preview
// ============================================
interface ParsedText {
  headline: string;
  subtitle?: string;
  dataValue?: string;
  dataLabel?: string;
  caption?: string;
}

function parseForPreview(textContent: string | { headline: string; subtitle?: string; caption?: string; dataValue?: string; dataLabel?: string }): ParsedText {
  if (typeof textContent !== 'string') {
    return textContent;
  }
  const lines = textContent.split('\n').filter(l => l.trim());
  return {
    headline: lines[0] || '',
    subtitle: lines[1] || undefined,
    caption: lines[2] || undefined,
  };
}

// ============================================
// Component
// ============================================
interface CarouselLayoutPreviewProps {
  slides: CarouselSlide[];
  visualPreset: VisualPresetType;
  carouselStyle: CarouselStyleType;
  platform: 'facebook' | 'tiktok';
}

export function CarouselLayoutPreview({ slides, visualPreset, carouselStyle, platform }: CarouselLayoutPreviewProps) {
  const style = PRESET_MOCK_STYLES[visualPreset] || PRESET_MOCK_STYLES.minimalist;
  const aspectClass = platform === 'tiktok' ? 'aspect-[9/16]' : carouselStyle === 'gallery' ? 'aspect-[4/5]' : 'aspect-square';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>Layout Preview — {slides.length} slides</span>
      </div>
      
      <div className={cn(
        "grid gap-2",
        slides.length <= 5 ? "grid-cols-5" : slides.length <= 7 ? "grid-cols-7" : "grid-cols-5"
      )}>
        {slides.map((slide, i) => {
          const role = detectSlideRole(slide.slideNumber, slides.length, slide.objective, carouselStyle);
          const text = parseForPreview(slide.textContent);
          const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.body;
          const isVisual = role === 'visual';

          return (
            <div
              key={slide.slideNumber}
              className={cn(
                "relative rounded-lg overflow-hidden border border-border/50 transition-all hover:border-primary/40 hover:shadow-sm",
                aspectClass,
              )}
            >
              {/* Background */}
              <div className={cn("absolute inset-0", style.bg)}>
                {/* Gallery visual placeholder */}
                {isVisual && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <Camera className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}

                {/* Dark gradient for gallery hook */}
                {carouselStyle === 'gallery' && role === 'hook' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                )}
              </div>

              {/* Text overlay mockup */}
              {!isVisual && (
                <div className={cn(
                  "absolute inset-0 flex flex-col p-2",
                  role === 'hook' || role === 'cta' ? 'justify-center items-center text-center' : 'justify-end items-start text-left',
                  carouselStyle === 'gallery' && 'justify-end items-start text-left',
                )}>
                  {/* Data value */}
                  {text.dataValue && (
                    <div className={cn(
                      "text-[10px] font-black leading-none",
                      style.textColor,
                    )}>
                      {text.dataValue}
                    </div>
                  )}
                  {text.dataLabel && (
                    <div className={cn(
                      "text-[5px] uppercase tracking-wider opacity-60 mt-0.5",
                      style.textColor,
                    )}>
                      {text.dataLabel}
                    </div>
                  )}

                  {/* Headline */}
                  <div className={cn(
                    "text-[7px] font-bold leading-tight line-clamp-2",
                    style.textColor,
                    text.dataValue && 'mt-1',
                  )}>
                    {text.headline}
                  </div>

                  {/* Subtitle */}
                  {text.subtitle && (
                    <div className={cn(
                      "text-[5px] leading-tight opacity-70 mt-0.5 line-clamp-2",
                      style.textColor,
                    )}>
                      {text.subtitle}
                    </div>
                  )}

                  {/* Caption */}
                  {text.caption && (
                    <div className={cn(
                      "text-[4px] opacity-40 mt-0.5",
                      style.textColor,
                    )}>
                      {text.caption}
                    </div>
                  )}

                  {/* Accent divider for flat_design */}
                  {visualPreset === 'flat_design' && (
                    <div className={cn("w-4 h-0.5 rounded-full mt-0.5", style.accent)} />
                  )}
                </div>
              )}

              {/* Listicle number badge */}
              {carouselStyle === 'listicle' && role === 'body' && (
                <div className={cn(
                  "absolute top-1 left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[5px] font-bold text-white",
                  style.accent,
                )}>
                  {slide.slideNumber - 1}
                </div>
              )}

              {/* Role label */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <span className="text-[5px] text-white/80 font-medium">
                  {slide.slideNumber}. {roleInfo.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className={cn("w-2 h-2 rounded-sm", style.bg, "border border-border")} />
          {visualPreset.replace('_', ' ')}
        </span>
        <span>
          {platform === 'tiktok' ? '9:16' : carouselStyle === 'gallery' ? '4:5' : '1:1'}
        </span>
        <span>
          {carouselStyle}
        </span>
      </div>
    </div>
  );
}
