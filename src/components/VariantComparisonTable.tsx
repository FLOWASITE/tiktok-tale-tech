import { BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS,
  LANGUAGE_STYLE_OPTIONS 
} from '@/components/BrandVoiceSection';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Minus, 
  ArrowLeftRight,
  Check,
  Star,
  Smile,
  Ban,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariantComparisonTableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlVariant: BrandVoiceVariant | null;
  variants: BrandVoiceVariant[];
}

// Helper to get label from option value
const getLabel = (options: { value: string; label: string }[], value: string) => {
  return options.find(o => o.value === value)?.label || value;
};

// Diff indicator component
const DiffIndicator = ({ type }: { type: 'added' | 'removed' | 'changed' | 'same' }) => {
  switch (type) {
    case 'added':
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
          <Plus className="w-3 h-3" />
        </span>
      );
    case 'removed':
      return (
        <span className="inline-flex items-center gap-0.5 text-destructive">
          <Minus className="w-3 h-3" />
        </span>
      );
    case 'changed':
      return (
        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
          <ArrowLeftRight className="w-3 h-3" />
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-0.5 text-muted-foreground/50">
          <Check className="w-3 h-3" />
        </span>
      );
  }
};

// Compare arrays and return diff info
const compareArrays = (control: string[] | null, variant: string[] | null) => {
  const controlSet = new Set(control || []);
  const variantSet = new Set(variant || []);
  
  const added = [...variantSet].filter(v => !controlSet.has(v));
  const removed = [...controlSet].filter(v => !variantSet.has(v));
  const same = [...variantSet].filter(v => controlSet.has(v));
  
  return { added, removed, same };
};

export function VariantComparisonTable({ 
  open, 
  onOpenChange, 
  controlVariant, 
  variants 
}: VariantComparisonTableProps) {
  if (!controlVariant) return null;
  
  const otherVariants = variants.filter(v => !v.is_control);
  
  // Calculate total differences for each variant
  const countDifferences = (variant: BrandVoiceVariant) => {
    let count = 0;
    
    // Positioning
    if ((variant.brand_positioning || '') !== (controlVariant.brand_positioning || '')) count++;
    
    // Formality
    if ((variant.formality_level || '') !== (controlVariant.formality_level || '')) count++;
    
    // Emoji
    if (variant.allow_emoji !== controlVariant.allow_emoji) count++;
    
    // Tone of voice
    const toneDiff = compareArrays(controlVariant.tone_of_voice, variant.tone_of_voice);
    count += toneDiff.added.length + toneDiff.removed.length;
    
    // Language style
    const styleDiff = compareArrays(controlVariant.language_style, variant.language_style);
    count += styleDiff.added.length + styleDiff.removed.length;
    
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 So sánh Brand Voice Variants
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[65vh]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[180px]">
                    Thuộc tính
                  </th>
                  <th className="text-left py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      {controlVariant.name}
                      <Badge variant="secondary" className="text-xs">Control</Badge>
                    </div>
                  </th>
                  {otherVariants.map(variant => (
                    <th key={variant.id} className="text-left py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {variant.name}
                        <Badge variant="outline" className="text-xs">
                          {countDifferences(variant)} khác biệt
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Brand Positioning */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground font-medium">Định vị</td>
                  <td className="py-3 px-4">
                    {controlVariant.brand_positioning ? (
                      <Badge variant="outline">
                        {getLabel(BRAND_POSITIONING_OPTIONS, controlVariant.brand_positioning)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {otherVariants.map(variant => {
                    const isDiff = (variant.brand_positioning || '') !== (controlVariant.brand_positioning || '');
                    const isNew = !controlVariant.brand_positioning && variant.brand_positioning;
                    const isRemoved = controlVariant.brand_positioning && !variant.brand_positioning;
                    
                    return (
                      <td key={variant.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isDiff && <DiffIndicator type={isNew ? 'added' : isRemoved ? 'removed' : 'changed'} />}
                          {variant.brand_positioning ? (
                            <Badge variant={isDiff ? 'default' : 'outline'} className={cn(isDiff && 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300')}>
                              {getLabel(BRAND_POSITIONING_OPTIONS, variant.brand_positioning)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Formality Level */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground font-medium">Mức độ trang trọng</td>
                  <td className="py-3 px-4">
                    {controlVariant.formality_level ? (
                      <Badge variant="outline">
                        {getLabel(FORMALITY_LEVEL_OPTIONS, controlVariant.formality_level)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {otherVariants.map(variant => {
                    const isDiff = (variant.formality_level || '') !== (controlVariant.formality_level || '');
                    const isNew = !controlVariant.formality_level && variant.formality_level;
                    const isRemoved = controlVariant.formality_level && !variant.formality_level;
                    
                    return (
                      <td key={variant.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isDiff && <DiffIndicator type={isNew ? 'added' : isRemoved ? 'removed' : 'changed'} />}
                          {variant.formality_level ? (
                            <Badge variant={isDiff ? 'default' : 'outline'} className={cn(isDiff && 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300')}>
                              {getLabel(FORMALITY_LEVEL_OPTIONS, variant.formality_level)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Allow Emoji */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground font-medium">Cho phép Emoji</td>
                  <td className="py-3 px-4">
                    {controlVariant.allow_emoji ? (
                      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                        <Smile className="w-3 h-3" /> Có
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                        <Ban className="w-3 h-3" /> Không
                      </Badge>
                    )}
                  </td>
                  {otherVariants.map(variant => {
                    const isDiff = variant.allow_emoji !== controlVariant.allow_emoji;
                    
                    return (
                      <td key={variant.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isDiff && <DiffIndicator type="changed" />}
                          {variant.allow_emoji ? (
                            <Badge variant="outline" className={cn(
                              "gap-1",
                              isDiff 
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300" 
                                : "text-emerald-600 border-emerald-300"
                            )}>
                              <Smile className="w-3 h-3" /> Có
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={cn(
                              "gap-1",
                              isDiff
                                ? "bg-destructive/20 text-destructive border-destructive/30"
                                : "text-destructive border-destructive/30"
                            )}>
                              <Ban className="w-3 h-3" /> Không
                            </Badge>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Tone of Voice */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground font-medium align-top">Tone of Voice</td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(controlVariant.tone_of_voice || []).map(tone => (
                        <Badge key={tone} variant="secondary" className="text-xs">
                          {getLabel(TONE_OF_VOICE_OPTIONS, tone)}
                        </Badge>
                      ))}
                      {(!controlVariant.tone_of_voice || controlVariant.tone_of_voice.length === 0) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  {otherVariants.map(variant => {
                    const diff = compareArrays(controlVariant.tone_of_voice, variant.tone_of_voice);
                    
                    return (
                      <td key={variant.id} className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {/* Same items */}
                          {diff.same.map(tone => (
                            <Badge key={tone} variant="secondary" className="text-xs text-muted-foreground">
                              {getLabel(TONE_OF_VOICE_OPTIONS, tone)}
                            </Badge>
                          ))}
                          {/* Added items */}
                          {diff.added.map(tone => (
                            <Badge key={tone} variant="outline" className="text-xs gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                              <Plus className="w-2.5 h-2.5" />
                              {getLabel(TONE_OF_VOICE_OPTIONS, tone)}
                            </Badge>
                          ))}
                          {/* Removed items */}
                          {diff.removed.map(tone => (
                            <Badge key={tone} variant="outline" className="text-xs gap-1 bg-destructive/20 text-destructive border-destructive/30 line-through">
                              <Minus className="w-2.5 h-2.5" />
                              {getLabel(TONE_OF_VOICE_OPTIONS, tone)}
                            </Badge>
                          ))}
                          {(!variant.tone_of_voice || variant.tone_of_voice.length === 0) && diff.removed.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Language Style */}
                <tr>
                  <td className="py-3 px-4 text-muted-foreground font-medium align-top">Phong cách ngôn ngữ</td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(controlVariant.language_style || []).map(style => (
                        <Badge key={style} variant="secondary" className="text-xs">
                          {getLabel(LANGUAGE_STYLE_OPTIONS, style)}
                        </Badge>
                      ))}
                      {(!controlVariant.language_style || controlVariant.language_style.length === 0) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  {otherVariants.map(variant => {
                    const diff = compareArrays(controlVariant.language_style, variant.language_style);
                    
                    return (
                      <td key={variant.id} className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {/* Same items */}
                          {diff.same.map(style => (
                            <Badge key={style} variant="secondary" className="text-xs text-muted-foreground">
                              {getLabel(LANGUAGE_STYLE_OPTIONS, style)}
                            </Badge>
                          ))}
                          {/* Added items */}
                          {diff.added.map(style => (
                            <Badge key={style} variant="outline" className="text-xs gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                              <Plus className="w-2.5 h-2.5" />
                              {getLabel(LANGUAGE_STYLE_OPTIONS, style)}
                            </Badge>
                          ))}
                          {/* Removed items */}
                          {diff.removed.map(style => (
                            <Badge key={style} variant="outline" className="text-xs gap-1 bg-destructive/20 text-destructive border-destructive/30 line-through">
                              <Minus className="w-2.5 h-2.5" />
                              {getLabel(LANGUAGE_STYLE_OPTIONS, style)}
                            </Badge>
                          ))}
                          {(!variant.language_style || variant.language_style.length === 0) && diff.removed.length === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Sample Text Comparison */}
                <tr className="bg-muted/30">
                  <td className="py-4 px-4 font-medium align-top">
                    <div className="flex items-center gap-2 text-foreground">
                      <FileText className="w-4 h-4" />
                      Sample Text
                    </div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="bg-background rounded-md border p-3 text-xs whitespace-pre-line max-w-[250px] max-h-[150px] overflow-y-auto">
                      {controlVariant.sample_text || (
                        <span className="italic text-muted-foreground">Chưa có sample text</span>
                      )}
                    </div>
                  </td>
                  {otherVariants.map(variant => {
                    const isDiff = (variant.sample_text || '') !== (controlVariant.sample_text || '');
                    
                    return (
                      <td key={variant.id} className="py-4 px-4 align-top">
                        <div className={cn(
                          "bg-background rounded-md border p-3 text-xs whitespace-pre-line max-w-[250px] max-h-[150px] overflow-y-auto",
                          isDiff && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                        )}>
                          {isDiff && (
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-2 text-[10px] font-medium">
                              <ArrowLeftRight className="w-3 h-3" />
                              Khác biệt
                            </div>
                          )}
                          {variant.sample_text || (
                            <span className="italic text-muted-foreground">Chưa có sample text</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollArea>
        
        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <span className="font-medium">Chú thích:</span>
          <span className="flex items-center gap-1">
            <DiffIndicator type="added" /> Thêm mới
          </span>
          <span className="flex items-center gap-1">
            <DiffIndicator type="changed" /> Thay đổi
          </span>
          <span className="flex items-center gap-1">
            <DiffIndicator type="removed" /> Loại bỏ
          </span>
          <span className="flex items-center gap-1">
            <DiffIndicator type="same" /> Giữ nguyên
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
