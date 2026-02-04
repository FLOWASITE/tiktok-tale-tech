import { cn } from '@/lib/utils';
import { TextPosition, TypographyStyle } from '@/hooks/useSocialImageGeneration';

interface TextPositionMockupProps {
  textPosition: TextPosition;
  typographyStyle: TypographyStyle;
  textPreview?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const POSITION_STYLES: Record<TextPosition, string> = {
  'center': 'items-center justify-center',
  'top': 'items-center justify-start pt-3',
  'bottom': 'items-center justify-end pb-3',
  'top-left': 'items-start justify-start pt-3 pl-3',
  'bottom-right': 'items-end justify-end pb-3 pr-3',
};

const TYPOGRAPHY_STYLES: Record<TypographyStyle, { font: string; weight: string; label: string }> = {
  'modern': { font: 'font-sans', weight: 'font-semibold', label: 'Aa' },
  'classic': { font: 'font-serif', weight: 'font-medium', label: 'Aa' },
  'bold': { font: 'font-sans', weight: 'font-black', label: 'Aa' },
  'minimal': { font: 'font-sans', weight: 'font-light', label: 'Aa' },
};

const SIZE_CLASSES = {
  sm: 'max-w-[140px]',
  md: 'max-w-[180px]',
  lg: 'max-w-[220px]',
};

const TEXT_SIZE_CLASSES = {
  sm: 'text-[9px]',
  md: 'text-[11px]',
  lg: 'text-[13px]',
};

export function TextPositionMockup({ 
  textPosition, 
  typographyStyle, 
  textPreview,
  className,
  size = 'md',
}: TextPositionMockupProps) {
  const positionClass = POSITION_STYLES[textPosition];
  const typoStyle = TYPOGRAPHY_STYLES[typographyStyle];
  const sizeClass = SIZE_CLASSES[size];
  const textSizeClass = TEXT_SIZE_CLASSES[size];
  
  // Truncate text for preview
  const maxLength = size === 'lg' ? 50 : size === 'md' ? 35 : 25;
  const displayText = textPreview 
    ? textPreview.length > maxLength ? textPreview.slice(0, maxLength) + '...' : textPreview
    : 'Your text here';

  return (
    <div className={cn("relative", className)}>
      {/* Mockup Frame */}
      <div className={cn(
        "aspect-[4/5] w-full rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-muted/50 to-muted overflow-hidden",
        sizeClass
      )}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/3 rounded-full bg-primary/20 blur-xl" />
          <div className="absolute bottom-1/3 right-1/4 w-1/3 h-1/4 rounded-full bg-secondary/30 blur-lg" />
        </div>
        
        {/* Text Position Indicator */}
        <div className={cn(
          "absolute inset-0 flex flex-col p-2",
          positionClass
        )}>
          {/* Text Block */}
          <div className={cn(
            "px-2 py-1.5 rounded-md bg-foreground/90 max-w-[90%] backdrop-blur-sm shadow-lg",
            textPosition === 'center' && "text-center",
            textPosition === 'top-left' && "text-left",
            textPosition === 'bottom-right' && "text-right"
          )}>
            <p className={cn(
              "leading-tight text-background break-words",
              textSizeClass,
              typoStyle.font,
              typoStyle.weight
            )}>
              {displayText}
            </p>
          </div>
        </div>
        
        {/* Position Label */}
        <div className="absolute bottom-1 right-1">
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground font-mono">
            {textPosition}
          </span>
        </div>
      </div>
      
      {/* Typography Preview Badge */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background border shadow-sm">
        <span className={cn(
          "text-xs",
          typoStyle.font,
          typoStyle.weight
        )}>
          {typoStyle.label}
        </span>
        <span className="text-[10px] text-muted-foreground capitalize">
          {typographyStyle}
        </span>
      </div>
    </div>
  );
}
