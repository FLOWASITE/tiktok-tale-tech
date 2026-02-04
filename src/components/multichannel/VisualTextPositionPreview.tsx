import { cn } from '@/lib/utils';
import { TextPosition, TypographyStyle } from '@/hooks/useSocialImageGeneration';
import { Check } from 'lucide-react';

interface VisualTextPositionPreviewProps {
  textPosition: TextPosition;
  typographyStyle: TypographyStyle;
  textPreview?: string;
  onPositionChange: (position: TextPosition) => void;
  onTypographyChange: (style: TypographyStyle) => void;
  className?: string;
}

const POSITION_MAP: Record<TextPosition, { row: number; col: number }> = {
  'top-left': { row: 0, col: 0 },
  'top': { row: 0, col: 1 },
  'center': { row: 1, col: 1 },
  'bottom': { row: 2, col: 1 },
  'bottom-right': { row: 2, col: 2 },
};

const GRID_POSITIONS: { position: TextPosition | null; row: number; col: number }[] = [
  { position: 'top-left', row: 0, col: 0 },
  { position: 'top', row: 0, col: 1 },
  { position: null, row: 0, col: 2 }, // top-right (not available)
  { position: null, row: 1, col: 0 }, // center-left (not available)
  { position: 'center', row: 1, col: 1 },
  { position: null, row: 1, col: 2 }, // center-right (not available)
  { position: null, row: 2, col: 0 }, // bottom-left (not available)
  { position: 'bottom', row: 2, col: 1 },
  { position: 'bottom-right', row: 2, col: 2 },
];

const POSITION_STYLES: Record<TextPosition, string> = {
  'center': 'items-center justify-center',
  'top': 'items-center justify-start pt-4',
  'bottom': 'items-center justify-end pb-4',
  'top-left': 'items-start justify-start pt-4 pl-4',
  'bottom-right': 'items-end justify-end pb-4 pr-4',
};

const TYPOGRAPHY_OPTIONS: { value: TypographyStyle; label: string; fontClass: string; example: string }[] = [
  { value: 'modern', label: 'Modern', fontClass: 'font-sans font-semibold', example: 'Aa' },
  { value: 'classic', label: 'Classic', fontClass: 'font-serif font-medium', example: 'Aa' },
  { value: 'bold', label: 'Bold', fontClass: 'font-sans font-black', example: 'Aa' },
  { value: 'minimal', label: 'Minimal', fontClass: 'font-sans font-light', example: 'Aa' },
];

export function VisualTextPositionPreview({
  textPosition,
  typographyStyle,
  textPreview,
  onPositionChange,
  onTypographyChange,
  className,
}: VisualTextPositionPreviewProps) {
  const typoConfig = TYPOGRAPHY_OPTIONS.find(t => t.value === typographyStyle) || TYPOGRAPHY_OPTIONS[0];
  const displayText = textPreview 
    ? textPreview.length > 60 ? textPreview.slice(0, 60) + '...' : textPreview
    : 'Text sẽ hiển thị ở đây';

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Preview Area */}
      <div className="flex gap-4">
        {/* Large Visual Mockup */}
        <div className="relative">
          {/* Frame */}
          <div className="w-[200px] aspect-[4/5] rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60 overflow-hidden shadow-inner">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-40">
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/3 rounded-full bg-primary/15 blur-2xl" />
              <div className="absolute bottom-1/3 right-1/4 w-1/3 h-1/4 rounded-full bg-secondary/25 blur-xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-accent/10 blur-3xl" />
            </div>
            
            {/* Grid overlay for position reference */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-dashed border-muted-foreground/30" />
                ))}
              </div>
            </div>
            
            {/* Text Preview at selected position */}
            <div className={cn(
              "absolute inset-0 flex flex-col p-3",
              POSITION_STYLES[textPosition]
            )}>
              <div className={cn(
                "px-3 py-2 rounded-lg max-w-[90%] backdrop-blur-sm shadow-lg transition-all duration-300",
                "bg-foreground/90 text-background",
                textPosition === 'center' && "text-center",
                textPosition === 'top-left' && "text-left",
                textPosition === 'bottom-right' && "text-right"
              )}>
                <p className={cn(
                  "text-xs leading-tight break-words",
                  typoConfig.fontClass
                )}>
                  {displayText}
                </p>
              </div>
            </div>
            
            {/* Position indicator dot */}
            <div className="absolute bottom-2 right-2">
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground font-mono shadow-sm">
                {textPosition}
              </span>
            </div>
          </div>
          
          {/* Typography badge */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border shadow-sm">
            <span className={cn("text-sm", typoConfig.fontClass)}>
              {typoConfig.example}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {typographyStyle}
            </span>
          </div>
        </div>

        {/* Interactive Position Grid */}
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Chọn vị trí text</label>
            
            {/* 3x3 Visual Grid */}
            <div className="w-[120px] aspect-[4/5] rounded-lg border-2 border-border bg-muted/30 p-1 grid grid-cols-3 grid-rows-3 gap-0.5">
              {GRID_POSITIONS.map((pos, idx) => {
                const isSelected = pos.position === textPosition;
                const isAvailable = pos.position !== null;
                
                return (
                  <button
                    key={idx}
                    disabled={!isAvailable}
                    onClick={() => pos.position && onPositionChange(pos.position)}
                    className={cn(
                      "rounded transition-all duration-200 flex items-center justify-center",
                      isAvailable 
                        ? isSelected
                          ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                          : "bg-background hover:bg-primary/10 border border-border/50 hover:border-primary/50"
                        : "bg-muted/50 cursor-not-allowed"
                    )}
                    title={pos.position || 'Không khả dụng'}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {isAvailable && !isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Position labels */}
            <div className="flex flex-wrap gap-1">
              {(['top-left', 'top', 'center', 'bottom', 'bottom-right'] as TextPosition[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => onPositionChange(pos)}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded transition-all",
                    textPosition === pos
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {pos === 'top-left' && 'Trên-trái'}
                  {pos === 'top' && 'Trên'}
                  {pos === 'center' && 'Giữa'}
                  {pos === 'bottom' && 'Dưới'}
                  {pos === 'bottom-right' && 'Dưới-phải'}
                </button>
              ))}
            </div>
          </div>

          {/* Typography Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Kiểu chữ</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPOGRAPHY_OPTIONS.map(typo => {
                const isSelected = typographyStyle === typo.value;
                
                return (
                  <button
                    key={typo.value}
                    onClick={() => onTypographyChange(typo.value)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 transition-all duration-200",
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border/50 hover:border-primary/40"
                    )}
                  >
                    <span className={cn(
                      "text-lg w-6 text-center",
                      typo.fontClass,
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {typo.example}
                    </span>
                    <span className={cn(
                      "text-xs",
                      isSelected ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {typo.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
