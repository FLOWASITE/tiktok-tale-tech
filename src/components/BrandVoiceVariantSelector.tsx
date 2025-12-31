import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Beaker, CheckCircle2, FlaskConical, Info, Loader2 } from 'lucide-react';
import { useBrandVoiceVariants, BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';
import { cn } from '@/lib/utils';

interface BrandVoiceVariantSelectorProps {
  brandTemplateId: string | undefined;
  value: string | undefined;
  onValueChange: (variantId: string | undefined, variant: BrandVoiceVariant | undefined) => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function BrandVoiceVariantSelector({
  brandTemplateId,
  value,
  onValueChange,
  disabled = false,
  showLabel = true,
  className,
}: BrandVoiceVariantSelectorProps) {
  const { variants, loading, hasControl } = useBrandVoiceVariants(brandTemplateId);
  
  // Don't render if no brand template or no variants
  if (!brandTemplateId || (variants.length === 0 && !loading)) {
    return null;
  }

  const selectedVariant = variants.find(v => v.id === value);
  
  const handleValueChange = (newValue: string) => {
    if (newValue === 'default') {
      onValueChange(undefined, undefined);
    } else {
      const variant = variants.find(v => v.id === newValue);
      onValueChange(newValue, variant);
    }
  };

  const getVariantLabel = (variant: BrandVoiceVariant) => {
    const parts: string[] = [];
    
    if (variant.formality_level) {
      const formalityLabels: Record<string, string> = {
        casual: 'Thân thiện',
        neutral: 'Trung lập',
        formal: 'Trang trọng',
      };
      parts.push(formalityLabels[variant.formality_level] || variant.formality_level);
    }
    
    if (variant.tone_of_voice?.length) {
      parts.push(variant.tone_of_voice.slice(0, 2).join(', '));
    }
    
    return parts.join(' • ') || 'Variant';
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-1.5', className)}>
        {showLabel && (
          <div className="flex items-center gap-2">
            <Label className="text-xs xs:text-sm flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-primary" />
              A/B Testing Voice
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">
                  Chọn variant để test các phong cách content khác nhau. 
                  Hệ thống sẽ track số lượng content được tạo với mỗi variant.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        <Select
          value={value || 'default'}
          onValueChange={handleValueChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className="h-9 text-sm bg-muted/30 border-border hover:border-primary/50 transition-colors">
            <SelectValue placeholder={loading ? 'Đang tải...' : 'Chọn voice variant...'}>
              {loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang tải...
                </span>
              ) : value && selectedVariant ? (
                <span className="flex items-center gap-2">
                  {selectedVariant.is_control ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Beaker className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="truncate">{selectedVariant.name}</span>
                  {selectedVariant.is_control && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">Control</Badge>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Mặc định (Brand Template)</span>
              )}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent>
            <SelectItem value="default" className="text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5" />
                <span>Mặc định (Brand Template)</span>
              </span>
            </SelectItem>
            
            {variants.map((variant) => (
              <SelectItem
                key={variant.id}
                value={variant.id}
                className="text-sm"
              >
                <span className="flex items-center gap-2 w-full">
                  {variant.is_control ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Beaker className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="truncate">{variant.name}</span>
                    {variant.is_control && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] flex-shrink-0">
                        Control
                      </Badge>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {variant.content_count} content
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Selected variant info */}
        {selectedVariant && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{getVariantLabel(selectedVariant)}</span>
            {selectedVariant.allow_emoji !== null && (
              <span>• {selectedVariant.allow_emoji ? 'Có emoji' : 'Không emoji'}</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
