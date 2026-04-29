import { useState, useMemo } from 'react';
import { BrandVoiceVariant, ChannelSampleTexts } from '@/hooks/useBrandVoiceVariants';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { generateAllChannelSamples, ChannelType } from '@/utils/generateSampleText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Star,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VariantSampleComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
  variants: BrandVoiceVariant[];
  onSamplesGenerated?: (variantId: string, samples: ChannelSampleTexts) => void;
}

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const CHANNEL_INFO: Record<ChannelType, { label: string; color: string }> = {
  facebook: { label: 'Facebook', color: 'bg-blue-500' },
  linkedin: { label: 'LinkedIn', color: 'bg-sky-600' },
  instagram: { label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  pinterest: { label: 'Pinterest', color: 'bg-[#E60023]' },
  tiktok: { label: 'TikTok', color: 'bg-black' },
  email: { label: 'Email', color: 'bg-amber-500' },
  twitter: { label: 'Twitter', color: 'bg-sky-400' },
  general: { label: 'General', color: 'bg-gray-500' },
};

// Helper to normalize sample content from different formats
function normalizeSample(sample: string | { subject: string; body: string } | undefined, channel: ChannelType): string {
  if (!sample) return '';
  if (typeof sample === 'string') return sample;
  if (channel === 'email' && sample.subject && sample.body) {
    return `📧 ${sample.subject}\n\n${sample.body}`;
  }
  return '';
}

export function VariantSampleComparison({
  open,
  onOpenChange,
  brandName,
  variants,
  onSamplesGenerated,
}: VariantSampleComparisonProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  
  // Get control variant
  const controlVariant = useMemo(() => variants.find(v => v.is_control), [variants]);
  const otherVariants = useMemo(() => variants.filter(v => !v.is_control), [variants]);

  // Generate template-based samples for fallback
  const getTemplateSamples = (variant: BrandVoiceVariant): Record<ChannelType, string> => {
    return generateAllChannelSamples({
      brandName,
      positioning: variant.brand_positioning || undefined,
      toneOfVoice: variant.tone_of_voice || undefined,
      formalityLevel: variant.formality_level || undefined,
      allowEmoji: variant.allow_emoji,
    });
  };

  // Get sample for a specific variant and channel
  const getSample = (variant: BrandVoiceVariant, channel: ChannelType): string => {
    // First try to get from saved sample_texts
    if (variant.sample_texts && variant.sample_texts[channel]) {
      return normalizeSample(variant.sample_texts[channel], channel);
    }
    // Fallback to template generation
    const templates = getTemplateSamples(variant);
    return templates[channel] || '';
  };

  // Check if variant has saved samples
  const hasSavedSamples = (variant: BrandVoiceVariant): boolean => {
    return !!(variant.sample_texts && Object.keys(variant.sample_texts).length > 0);
  };

  // Generate AI samples for a variant
  const handleGenerateAISamples = async (variant: BrandVoiceVariant) => {
    setGeneratingFor(variant.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-text', {
        body: {
          brandName,
          positioning: variant.brand_positioning,
          toneOfVoice: variant.tone_of_voice,
          formalityLevel: variant.formality_level,
          allowEmoji: variant.allow_emoji,
          channels: VISIBLE_CHANNELS,
        },
      });

      if (error) throw error;
      
      if (data?.samples) {
        onSamplesGenerated?.(variant.id, data.samples);
        toast.success(`Đã tạo samples AI cho \"${variant.name}\"`);
      }
    } catch (error) {
      console.error('Error generating AI samples:', error);
      toast.error('Không thể tạo samples AI');
    } finally {
      setGeneratingFor(null);
    }
  };

  // Navigate channels
  const navigateChannel = (direction: 'prev' | 'next') => {
    const currentIndex = VISIBLE_CHANNELS.indexOf(activeChannel);
    if (direction === 'prev' && currentIndex > 0) {
      setActiveChannel(VISIBLE_CHANNELS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < VISIBLE_CHANNELS.length - 1) {
      setActiveChannel(VISIBLE_CHANNELS[currentIndex + 1]);
    }
  };

  if (!controlVariant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            So sánh Sample Texts theo Channel
          </DialogTitle>
        </DialogHeader>
        
        {/* Channel Tabs */}
        <div className="px-6 py-3 border-b bg-background flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0"
            onClick={() => navigateChannel('prev')}
            disabled={VISIBLE_CHANNELS.indexOf(activeChannel) === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)} className="flex-1">
            <TabsList className="w-full grid grid-cols-5 h-10">
              {VISIBLE_CHANNELS.map(channel => (
                <TabsTrigger 
                  key={channel} 
                  value={channel}
                  className="gap-2 text-sm"
                >
                  <div className={cn("w-2 h-2 rounded-full", CHANNEL_INFO[channel].color)} />
                  {CHANNEL_INFO[channel].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 shrink-0"
            onClick={() => navigateChannel('next')}
            disabled={VISIBLE_CHANNELS.indexOf(activeChannel) === VISIBLE_CHANNELS.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Comparison Grid */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="p-6">
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(variants.length, 3)}, 1fr)` }}>
              {/* Control Variant */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="font-medium truncate">{controlVariant.name}</span>
                    <Badge variant="secondary" className="text-xs">Control</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => handleGenerateAISamples(controlVariant)}
                    disabled={generatingFor === controlVariant.id}
                  >
                    {generatingFor === controlVariant.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : hasSavedSamples(controlVariant) ? (
                      <RefreshCw className="w-3 h-3" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {hasSavedSamples(controlVariant) ? 'Tạo lại' : 'AI Generate'}
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                  <ChannelMockupFrame
                    channel={activeChannel}
                    content={getSample(controlVariant, activeChannel)}
                    brandName={brandName}
                    isGenerating={generatingFor === controlVariant.id}
                  />
                </div>
                
                {/* Sample status indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {hasSavedSamples(controlVariant) ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Generated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      Template Generated
                    </Badge>
                  )}
                </div>
              </div>

              {/* Other Variants */}
              {otherVariants.slice(0, 2).map(variant => (
                <div key={variant.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{variant.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleGenerateAISamples(variant)}
                      disabled={generatingFor === variant.id}
                    >
                      {generatingFor === variant.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : hasSavedSamples(variant) ? (
                        <RefreshCw className="w-3 h-3" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {hasSavedSamples(variant) ? 'Tạo lại' : 'AI Generate'}
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent">
                    <ChannelMockupFrame
                      channel={activeChannel}
                      content={getSample(variant, activeChannel)}
                      brandName={brandName}
                      isGenerating={generatingFor === variant.id}
                    />
                  </div>
                  
                  {/* Sample status indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {hasSavedSamples(variant) ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        Template Generated
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* More variants scroll if > 3 */}
            {otherVariants.length > 2 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  +{otherVariants.length - 2} variant khác
                </p>
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {otherVariants.slice(2).map(variant => (
                      <div key={variant.id} className="w-[320px] shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{variant.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => handleGenerateAISamples(variant)}
                            disabled={generatingFor === variant.id}
                          >
                            {generatingFor === variant.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden scale-90 origin-top-left">
                          <ChannelMockupFrame
                            channel={activeChannel}
                            content={getSample(variant, activeChannel)}
                            brandName={brandName}
                            isGenerating={generatingFor === variant.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-primary" />
              Control: Baseline để so sánh
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              AI Generate: Tạo sample bằng AI
            </span>
          </div>
          <span>
            Đang xem: <strong>{CHANNEL_INFO[activeChannel].label}</strong>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
