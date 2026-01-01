import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Check, Sparkles } from 'lucide-react';
import { BrandVoiceVariantSelector } from '@/components/BrandVoiceVariantSelector';
import { cn } from '@/lib/utils';

interface BrandTemplate {
  id: string;
  name: string;
  brand_name: string;
  primary_color?: string | null;
  is_default?: boolean;
  tone_of_voice?: string[] | null;
}

interface CompactBrandSelectorProps {
  templates: BrandTemplate[];
  isLoading: boolean;
  disabled?: boolean;
  selectedTemplateId?: string;
  selectedVoiceVariantId?: string;
  onTemplateChange: (templateId: string | undefined) => void;
  onVoiceVariantChange: (variantId: string | undefined) => void;
}

export function CompactBrandSelector({
  templates,
  isLoading,
  disabled,
  selectedTemplateId,
  selectedVoiceVariantId,
  onTemplateChange,
  onVoiceVariantChange,
}: CompactBrandSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  if (isLoading) {
    return (
      <div className="h-10 bg-muted/50 border border-border rounded-lg flex items-center px-3 animate-pulse">
        <span className="text-sm text-muted-foreground">Đang tải thương hiệu...</span>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="space-y-2">
        {/* Collapsed View - Brand Badge */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            
            {selectedTemplate ? (
              <div className="flex items-center gap-2 min-w-0">
                {selectedTemplate.primary_color && (
                  <span
                    className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background shrink-0"
                    style={{ backgroundColor: selectedTemplate.primary_color }}
                  />
                )}
                <span className="text-sm font-medium truncate">
                  {selectedTemplate.name}
                </span>
                <Check className="w-4 h-4 text-primary shrink-0" />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Chưa chọn thương hiệu</span>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 shrink-0"
              disabled={disabled}
            >
              {isExpanded ? (
                <>
                  Thu gọn
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Đổi
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Expanded View - Full Selector */}
        <CollapsibleContent className="space-y-3">
          <div className="p-3 rounded-lg border border-border/50 bg-background space-y-3">
            <Select
              value={selectedTemplateId || 'none'}
              onValueChange={(value) => {
                onTemplateChange(value === 'none' ? undefined : value);
                // Auto-collapse after selection if variant is not needed
                if (!selectedVoiceVariantId) {
                  setTimeout(() => setIsExpanded(false), 300);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="bg-muted/30 border border-border focus:border-primary text-sm h-10">
                <SelectValue placeholder="Chọn thương hiệu..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="text-sm">
                    <span className="flex items-center gap-2">
                      {template.primary_color && (
                        <span
                          className="w-3 h-3 rounded-full inline-block ring-2 ring-offset-1 ring-offset-background"
                          style={{ backgroundColor: template.primary_color }}
                        />
                      )}
                      <span className="truncate">{template.name}</span>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Mặc định</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand Voice Variant */}
            {selectedTemplateId && (
              <BrandVoiceVariantSelector
                brandTemplateId={selectedTemplateId}
                value={selectedVoiceVariantId}
                onValueChange={(variantId) => {
                  onVoiceVariantChange(variantId);
                  setTimeout(() => setIsExpanded(false), 300);
                }}
                disabled={disabled}
              />
            )}

            {/* Selected brand info */}
            {selectedTemplate?.tone_of_voice && selectedTemplate.tone_of_voice.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Tone: {selectedTemplate.tone_of_voice.slice(0, 3).join(', ')}
                {selectedTemplate.tone_of_voice.length > 3 && '...'}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
