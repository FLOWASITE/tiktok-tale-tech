import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeftRight, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdCopyVariation, CTA_BUTTONS } from '@/types/adCopy';

interface ComparisonModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variations: AdCopyVariation[];
  platform: string;
}

export function ComparisonMode({ open, onOpenChange, variations, platform }: ComparisonModeProps) {
  const [variationA, setVariationA] = React.useState<string>(variations[0]?.variation_label || 'A');
  const [variationB, setVariationB] = React.useState<string>(variations[1]?.variation_label || 'B');

  const varA = variations.find(v => v.variation_label === variationA);
  const varB = variations.find(v => v.variation_label === variationB);

  const isGoogleRSA = platform === 'google_rsa';
  const isGoogleDisplay = platform === 'google_display';

  // Highlight differences between two texts
  const highlightDiff = (textA: string | null, textB: string | null) => {
    if (!textA && !textB) return { a: '-', b: '-', isDifferent: false };
    if (textA === textB) return { a: textA || '-', b: textB || '-', isDifferent: false };
    return { a: textA || '-', b: textB || '-', isDifferent: true };
  };

  const renderField = (label: string, valueA: string | null, valueB: string | null) => {
    const { a, b, isDifferent } = highlightDiff(valueA, valueB);
    
    return (
      <div className="grid grid-cols-[1fr_1fr] gap-4 py-3 border-b border-border/50">
        <div>
          <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
          <div className={cn(
            "p-2 rounded-lg text-sm",
            isDifferent ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-muted/50"
          )}>
            {a}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
          <div className={cn(
            "p-2 rounded-lg text-sm",
            isDifferent ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-muted/50"
          )}>
            {b}
          </div>
        </div>
      </div>
    );
  };

  const renderArrayField = (label: string, arrA: string[] | undefined, arrB: string[] | undefined) => {
    const maxLen = Math.max(arrA?.length || 0, arrB?.length || 0);
    
    return (
      <div className="py-3 border-b border-border/50">
        <span className="text-xs text-muted-foreground mb-2 block">{label}</span>
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <div className="space-y-1">
            {Array.from({ length: maxLen }).map((_, i) => {
              const valA = arrA?.[i] || '';
              const valB = arrB?.[i] || '';
              const isDiff = valA !== valB;
              return (
                <div key={i} className={cn(
                  "p-2 rounded text-sm flex items-start gap-2",
                  isDiff ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-muted/50",
                  !valA && "opacity-30"
                )}>
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <span className="flex-1">{valA || '(empty)'}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-1">
            {Array.from({ length: maxLen }).map((_, i) => {
              const valA = arrA?.[i] || '';
              const valB = arrB?.[i] || '';
              const isDiff = valA !== valB;
              return (
                <div key={i} className={cn(
                  "p-2 rounded text-sm flex items-start gap-2",
                  isDiff ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-muted/50",
                  !valB && "opacity-30"
                )}>
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <span className="flex-1">{valB || '(empty)'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!varA || !varB) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            So sánh Variations
          </DialogTitle>
        </DialogHeader>

        {/* Variation Selectors */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-4 border-b">
          <div className="flex items-center gap-3">
            <Select value={variationA} onValueChange={setVariationA}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn Variation A" />
              </SelectTrigger>
              <SelectContent>
                {variations.map(v => (
                  <SelectItem key={v.id} value={v.variation_label} disabled={v.variation_label === variationB}>
                    <div className="flex items-center gap-2">
                      Variation {v.variation_label}
                      {v.is_approved && <CheckCircle className="h-3 w-3 text-green-500" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">A</Badge>
          </div>

          <div className="text-muted-foreground text-sm">vs</div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">B</Badge>
            <Select value={variationB} onValueChange={setVariationB}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn Variation B" />
              </SelectTrigger>
              <SelectContent>
                {variations.map(v => (
                  <SelectItem key={v.id} value={v.variation_label} disabled={v.variation_label === variationA}>
                    <div className="flex items-center gap-2">
                      Variation {v.variation_label}
                      {v.is_approved && <CheckCircle className="h-3 w-3 text-green-500" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Content */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_1fr] gap-4 py-2 sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Variation {variationA}
                </Badge>
                {varA.is_approved && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Variation {variationB}
                </Badge>
                {varB.is_approved && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            </div>

            {/* Fields based on platform */}
            {isGoogleRSA ? (
              <>
                {renderArrayField('Headlines', varA.headlines, varB.headlines)}
                {renderArrayField('Descriptions', varA.descriptions, varB.descriptions)}
              </>
            ) : isGoogleDisplay ? (
              <>
                {renderArrayField('Short Headlines', varA.headlines, varB.headlines)}
                {renderField('Long Headline', varA.headline, varB.headline)}
                {renderArrayField('Descriptions', varA.descriptions, varB.descriptions)}
              </>
            ) : (
              <>
                {renderField('Primary Text', varA.primary_text, varB.primary_text)}
                {renderField('Headline', varA.headline, varB.headline)}
                {renderField('Description', varA.description, varB.description)}
                {renderField('CTA Button', 
                  CTA_BUTTONS.find(c => c.value === varA.cta_button)?.label || varA.cta_button,
                  CTA_BUTTONS.find(c => c.value === varB.cta_button)?.label || varB.cta_button
                )}
              </>
            )}

            {/* Status comparison */}
            <div className="grid grid-cols-[1fr_1fr] gap-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trạng thái:</span>
                {varA.is_approved ? (
                  <Badge variant="default" className="bg-green-500">Đã duyệt</Badge>
                ) : (
                  <Badge variant="secondary">Chưa duyệt</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trạng thái:</span>
                {varB.is_approved ? (
                  <Badge variant="default" className="bg-green-500">Đã duyệt</Badge>
                ) : (
                  <Badge variant="secondary">Chưa duyệt</Badge>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800" />
            <span>Khác biệt (A)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-800" />
            <span>Khác biệt (B)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>Giống nhau</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
