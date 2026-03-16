import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  Square, CircleDot, Droplets, Sparkles, Eye, Layers
} from 'lucide-react';

export type LogoPosition = 
  | 'auto'
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type LogoStyle = 'clean' | 'shadow' | 'glass' | 'pill' | 'outline' | 'subtle';

interface LogoOptionsPanelProps {
  position: LogoPosition;
  onPositionChange: (position: LogoPosition) => void;
  style: LogoStyle;
  onStyleChange: (style: LogoStyle) => void;
  size: number; // 5-30%
  onSizeChange: (size: number) => void;
  opacity: number; // 30-100%
  onOpacityChange: (opacity: number) => void;
  logoPreviewUrl?: string;
}

const POSITION_GRID: LogoPosition[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['center-left', 'center', 'center-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

const LOGO_STYLES: { value: LogoStyle; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'clean', label: 'Gốc', icon: <Square className="w-3.5 h-3.5" />, description: 'Không hiệu ứng' },
  { value: 'shadow', label: 'Shadow', icon: <Layers className="w-3.5 h-3.5" />, description: 'Đổ bóng mềm' },
  { value: 'glass', label: 'Glass', icon: <Droplets className="w-3.5 h-3.5" />, description: 'Nền kính mờ' },
  { value: 'pill', label: 'Badge', icon: <CircleDot className="w-3.5 h-3.5" />, description: 'Nền bo tròn' },
  { value: 'subtle', label: 'Mờ', icon: <Eye className="w-3.5 h-3.5" />, description: 'Watermark' },
];

export function LogoOptionsPanel({
  position,
  onPositionChange,
  style,
  onStyleChange,
  size,
  onSizeChange,
  opacity,
  onOpacityChange,
  logoPreviewUrl,
}: LogoOptionsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Position Grid */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Vị trí logo</Label>
        <div className="flex items-center gap-4">
          {/* 3x3 Grid Picker */}
          <div className="relative w-24 h-24 rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
            {/* Preview image placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            
            {/* Grid overlay */}
            <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-0.5">
              {POSITION_GRID.flat().map((pos) => {
                const isSelected = position === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => onPositionChange(pos)}
                    className={cn(
                      "flex items-center justify-center rounded transition-all duration-200",
                      isSelected 
                        ? "bg-primary shadow-sm" 
                        : "hover:bg-primary/20 bg-transparent"
                    )}
                    title={pos}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      isSelected 
                        ? "bg-primary-foreground scale-100" 
                        : "bg-muted-foreground/40 scale-75 hover:scale-90"
                    )} />
                  </button>
                );
              })}
            </div>
            
            {/* Logo preview indicator */}
            {logoPreviewUrl && (
              <div 
                className={cn(
                  "absolute w-5 h-5 rounded overflow-hidden border border-white/50 shadow-sm transition-all duration-300",
                  position.includes('top') && 'top-1',
                  position.includes('center') && !position.includes('left') && !position.includes('right') && 'top-1/2 -translate-y-1/2',
                  position.includes('bottom') && 'bottom-1',
                  position.includes('left') && 'left-1',
                  position === 'center' && 'left-1/2 -translate-x-1/2',
                  position === 'top-center' && 'left-1/2 -translate-x-1/2',
                  position === 'bottom-center' && 'left-1/2 -translate-x-1/2',
                  position.includes('right') && 'right-1',
                )}
                style={{ opacity: opacity / 100 }}
              >
                <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-contain bg-white/80" />
              </div>
            )}
          </div>

          {/* Position Labels */}
          <div className="flex-1 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">
              {position === 'top-left' && 'Góc trên trái'}
              {position === 'top-center' && 'Trên giữa'}
              {position === 'top-right' && 'Góc trên phải'}
              {position === 'center-left' && 'Giữa trái'}
              {position === 'center' && 'Chính giữa'}
              {position === 'center-right' && 'Giữa phải'}
              {position === 'bottom-left' && 'Góc dưới trái'}
              {position === 'bottom-center' && 'Dưới giữa'}
              {position === 'bottom-right' && 'Góc dưới phải'}
            </p>
            <p>Click để chọn vị trí</p>
          </div>
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Phong cách</Label>
        <div className="flex flex-wrap gap-1.5">
          {LOGO_STYLES.map((s) => {
            const isSelected = style === s.value;
            return (
              <button
                key={s.value}
                onClick={() => onStyleChange(s.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-md border-2 transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                )}
                title={s.description}
              >
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Kích thước</Label>
          <span className="text-xs font-medium text-primary">{size}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-6">5%</span>
          <Slider
            value={[size]}
            onValueChange={([v]) => onSizeChange(v)}
            min={5}
            max={30}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8">30%</span>
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'Nhỏ', value: 8 },
            { label: 'Vừa', value: 15 },
            { label: 'Lớn', value: 22 },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => onSizeChange(preset.value)}
              className={cn(
                "px-2 py-1 rounded text-[10px] border transition-colors",
                size === preset.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Độ trong suốt</Label>
          <span className="text-xs font-medium text-primary">{opacity}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-8">30%</span>
          <Slider
            value={[opacity]}
            onValueChange={([v]) => onOpacityChange(v)}
            min={30}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-10">100%</span>
        </div>
        {opacity < 60 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Chế độ watermark
          </p>
        )}
      </div>
    </div>
  );
}
