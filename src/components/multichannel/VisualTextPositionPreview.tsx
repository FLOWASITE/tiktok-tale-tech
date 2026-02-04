import { cn } from '@/lib/utils';
import { TextPosition, TypographyStyle } from '@/hooks/useSocialImageGeneration';
import { 
  AlignCenter, AlignLeft, AlignRight, 
  ArrowUpLeft, ArrowUp, ArrowDown, ArrowDownRight,
  Type, Feather, Bold, Minus
} from 'lucide-react';

interface VisualTextPositionPreviewProps {
  textPosition: TextPosition;
  typographyStyle: TypographyStyle;
  textPreview?: string;
  onPositionChange: (position: TextPosition) => void;
  onTypographyChange: (style: TypographyStyle) => void;
  className?: string;
}

const POSITION_CONFIG: Record<TextPosition, { 
  icon: React.ReactNode; 
  label: string; 
  labelShort: string;
  alignClass: string;
}> = {
  'top-left': { 
    icon: <ArrowUpLeft className="w-3.5 h-3.5" />, 
    label: 'Trên trái', 
    labelShort: 'TL',
    alignClass: 'items-start justify-start pt-4 pl-4 text-left'
  },
  'top': { 
    icon: <ArrowUp className="w-3.5 h-3.5" />, 
    label: 'Trên giữa', 
    labelShort: 'T',
    alignClass: 'items-center justify-start pt-4 text-center'
  },
  'center': { 
    icon: <AlignCenter className="w-3.5 h-3.5" />, 
    label: 'Giữa', 
    labelShort: 'C',
    alignClass: 'items-center justify-center text-center'
  },
  'bottom': { 
    icon: <ArrowDown className="w-3.5 h-3.5" />, 
    label: 'Dưới giữa', 
    labelShort: 'B',
    alignClass: 'items-center justify-end pb-4 text-center'
  },
  'bottom-right': { 
    icon: <ArrowDownRight className="w-3.5 h-3.5" />, 
    label: 'Dưới phải', 
    labelShort: 'BR',
    alignClass: 'items-end justify-end pb-4 pr-4 text-right'
  },
};

const GRID_POSITIONS: { position: TextPosition | null; row: number; col: number }[] = [
  { position: 'top-left', row: 0, col: 0 },
  { position: 'top', row: 0, col: 1 },
  { position: null, row: 0, col: 2 },
  { position: null, row: 1, col: 0 },
  { position: 'center', row: 1, col: 1 },
  { position: null, row: 1, col: 2 },
  { position: null, row: 2, col: 0 },
  { position: 'bottom', row: 2, col: 1 },
  { position: 'bottom-right', row: 2, col: 2 },
];

const TYPOGRAPHY_OPTIONS: { 
  value: TypographyStyle; 
  label: string; 
  description: string;
  fontClass: string; 
  icon: React.ReactNode;
  sampleText: string;
}[] = [
  { 
    value: 'modern', 
    label: 'Modern', 
    description: 'Sans-serif, sạch sẽ',
    fontClass: 'font-sans font-semibold tracking-tight', 
    icon: <Type className="w-4 h-4" />,
    sampleText: 'Thiết kế hiện đại'
  },
  { 
    value: 'classic', 
    label: 'Classic', 
    description: 'Serif, trang trọng',
    fontClass: 'font-serif font-medium', 
    icon: <Feather className="w-4 h-4" />,
    sampleText: 'Phong cách cổ điển'
  },
  { 
    value: 'bold', 
    label: 'Bold', 
    description: 'Đậm, mạnh mẽ',
    fontClass: 'font-sans font-black uppercase tracking-wide', 
    icon: <Bold className="w-4 h-4" />,
    sampleText: 'NỔI BẬT'
  },
  { 
    value: 'minimal', 
    label: 'Minimal', 
    description: 'Nhẹ nhàng, tinh tế',
    fontClass: 'font-sans font-light tracking-widest', 
    icon: <Minus className="w-4 h-4" />,
    sampleText: 'tối giản'
  },
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
  const posConfig = POSITION_CONFIG[textPosition];
  const displayText = textPreview 
    ? textPreview.length > 50 ? textPreview.slice(0, 50) + '...' : textPreview
    : 'Nội dung mẫu';

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Preview Area */}
      <div className="flex gap-4">
        {/* Large Visual Mockup */}
        <div className="relative flex-shrink-0">
          {/* Frame */}
          <div className="w-[180px] aspect-[4/5] rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60 overflow-hidden shadow-inner">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-40">
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/3 rounded-full bg-primary/15 blur-2xl" />
              <div className="absolute bottom-1/3 right-1/4 w-1/3 h-1/4 rounded-full bg-secondary/25 blur-xl" />
            </div>
            
            {/* Grid overlay for position reference */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-dashed border-muted-foreground/40" />
                ))}
              </div>
            </div>
            
            {/* Text Preview at selected position */}
            <div className={cn(
              "absolute inset-0 flex flex-col p-2",
              posConfig.alignClass
            )}>
              <div className={cn(
                "px-2.5 py-1.5 rounded-lg max-w-[95%] backdrop-blur-sm shadow-lg transition-all duration-300",
                "bg-foreground/90 text-background"
              )}>
                <p className={cn(
                  "text-[10px] leading-snug break-words",
                  typoConfig.fontClass
                )}>
                  {displayText}
                </p>
              </div>
            </div>
          </div>
          
          {/* Current config badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border shadow-sm text-[9px]">
            {posConfig.icon}
            <span className="text-muted-foreground">+</span>
            <span className={typoConfig.fontClass}>{typoConfig.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Position Grid */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Vị trí</label>
            
            {/* 3x3 Visual Grid with Icons */}
            <div className="w-[100px] aspect-square rounded-lg border border-border bg-muted/20 p-1 grid grid-cols-3 grid-rows-3 gap-0.5">
              {GRID_POSITIONS.map((pos, idx) => {
                const isSelected = pos.position === textPosition;
                const isAvailable = pos.position !== null;
                const config = pos.position ? POSITION_CONFIG[pos.position] : null;
                
                return (
                  <button
                    key={idx}
                    disabled={!isAvailable}
                    onClick={() => pos.position && onPositionChange(pos.position)}
                    className={cn(
                      "rounded flex items-center justify-center transition-all duration-200",
                      isAvailable 
                        ? isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background hover:bg-primary/10 border border-border/50 hover:border-primary/50"
                        : "bg-muted/30"
                    )}
                    title={config?.label || 'Không khả dụng'}
                  >
                    {isAvailable && config && (
                      <span className={cn(
                        "transition-transform",
                        isSelected && "scale-110"
                      )}>
                        {config.icon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography Grid with Font Preview */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Kiểu chữ</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPOGRAPHY_OPTIONS.map(typo => {
                const isSelected = typographyStyle === typo.value;
                
                return (
                  <button
                    key={typo.value}
                    onClick={() => onTypographyChange(typo.value)}
                    className={cn(
                      "relative overflow-hidden rounded-lg border-2 transition-all duration-200 text-left",
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border/50 hover:border-primary/40 bg-background"
                    )}
                  >
                    {/* Font Sample Preview */}
                    <div className={cn(
                      "px-2 pt-2 pb-1 text-sm leading-tight truncate",
                      typo.fontClass,
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {typo.sampleText}
                    </div>
                    
                    {/* Label row */}
                    <div className="px-2 pb-1.5 flex items-center gap-1">
                      <span className={cn(
                        "opacity-60",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {typo.icon}
                      </span>
                      <span className={cn(
                        "text-[10px]",
                        isSelected ? "text-primary font-medium" : "text-muted-foreground"
                      )}>
                        {typo.label}
                      </span>
                    </div>
                    
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
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
