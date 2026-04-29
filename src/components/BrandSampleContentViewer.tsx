import { useState } from 'react';
import { useBrandVoiceVariants, BrandVoiceVariant, ChannelSampleTexts } from '@/hooks/useBrandVoiceVariants';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Sparkles,
  Eye,
  Clock,
  Star,
  Facebook,
  Linkedin,
  Instagram,
  Mail,
  Music2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChannelType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email';

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const CHANNEL_LABELS: Record<ChannelType, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  pinterest: 'Instagram',
  tiktok: 'TikTok',
  email: 'Email',
};

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  pinterest: <Instagram className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
};

// Helper to format tone of voice
function formatToneOfVoice(tones: string[] | null): string {
  if (!tones || tones.length === 0) return 'Chưa đặt';
  return tones.slice(0, 2).join(', ') + (tones.length > 2 ? ` +${tones.length - 2}` : '');
}

// Helper to format formality
function formatFormality(level: string | null): string {
  const labels: Record<string, string> = {
    formal: 'Trang trọng',
    semi_formal: 'Bán trang trọng',
    casual: 'Thân mật',
    friendly: 'Gần gũi',
  };
  return level ? labels[level] || level : 'Chưa đặt';
}

interface BrandSampleContentViewerProps {
  brandTemplateId: string;
  brandName: string;
  logoUrl?: string | null;
}

export function BrandSampleContentViewer({
  brandTemplateId,
  brandName,
  logoUrl,
}: BrandSampleContentViewerProps) {
  const { variants, loading } = useBrandVoiceVariants(brandTemplateId);
  const [previewVariant, setPreviewVariant] = useState<BrandVoiceVariant | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');

  // Get sample content for a channel
  const getSampleContent = (variant: BrandVoiceVariant, channel: ChannelType): string => {
    if (!variant.sample_texts) return '';
    const sample = variant.sample_texts[channel];
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object' && 'subject' in sample && 'body' in sample) {
      return `📧 Subject: ${sample.subject}\n\n${sample.body}`;
    }
    return '';
  };

  // Check if variant has any sample content
  const hasSampleContent = (variant: BrandVoiceVariant): boolean => {
    if (!variant.sample_texts) return false;
    return VISIBLE_CHANNELS.some(channel => {
      const content = getSampleContent(variant, channel);
      return content && content.trim().length > 0;
    });
  };

  // Get variants that have sample content
  const variantsWithContent = variants.filter(hasSampleContent);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (variantsWithContent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Nội dung mẫu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Chưa có nội dung mẫu nào</p>
            <p className="text-xs mt-1">Tạo nội dung mẫu trong phần chỉnh sửa Brand Voice</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Nội dung mẫu
            <Badge variant="secondary" className="text-xs ml-2">
              {variantsWithContent.length} mẫu
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Các mẫu nội dung đã được tạo dựa trên Brand Voice của bạn. Nhấn nút xem để preview trên từng kênh.
          </p>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {variantsWithContent.map((variant) => (
                <div
                  key={variant.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all hover:border-primary/30',
                    variant.is_control 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/20 border-border/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{variant.name}</span>
                        {variant.is_control && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Star className="w-3 h-3" />
                            Control
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(variant.created_at), 'dd/MM HH:mm', { locale: vi })}
                        </span>
                        <span>Tone: {formatToneOfVoice(variant.tone_of_voice)}</span>
                        <span>Phong cách: {formatFormality(variant.formality_level)}</span>
                      </div>
                      
                      {/* Quick preview of available channels */}
                      <div className="flex gap-1 mt-2">
                        {VISIBLE_CHANNELS.map(channel => {
                          const hasContent = getSampleContent(variant, channel).trim().length > 0;
                          return (
                            <div
                              key={channel}
                              className={cn(
                                'p-1.5 rounded',
                                hasContent 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'bg-muted/30 text-muted-foreground/50'
                              )}
                              title={hasContent ? `Có nội dung ${CHANNEL_LABELS[channel]}` : `Chưa có ${CHANNEL_LABELS[channel]}`}
                            >
                              {CHANNEL_ICONS[channel]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => {
                        setPreviewVariant(variant);
                        // Find first channel with content
                        const firstChannelWithContent = VISIBLE_CHANNELS.find(
                          ch => getSampleContent(variant, ch).trim().length > 0
                        );
                        if (firstChannelWithContent) {
                          setActiveChannel(firstChannelWithContent);
                        }
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      Xem mẫu
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewVariant} onOpenChange={(open) => !open && setPreviewVariant(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {previewVariant?.name}
              {previewVariant?.is_control && (
                <Badge variant="default" className="text-xs gap-1">
                  <Star className="w-3 h-3" />
                  Control
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {previewVariant && (
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Channel tabs */}
              <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)}>
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  {VISIBLE_CHANNELS.map(channel => {
                    const hasContent = getSampleContent(previewVariant, channel).trim().length > 0;
                    return (
                      <TabsTrigger
                        key={channel}
                        value={channel}
                        disabled={!hasContent}
                        className="gap-1.5 text-xs sm:text-sm"
                      >
                        {CHANNEL_ICONS[channel]}
                        <span className="hidden sm:inline">{CHANNEL_LABELS[channel]}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {VISIBLE_CHANNELS.map(channel => (
                  <TabsContent key={channel} value={channel} className="mt-0">
                    <div className="flex justify-center">
                      <div className="w-full max-w-md">
                        <ChannelMockupFrame
                          channel={channel}
                          content={getSampleContent(previewVariant, channel)}
                          brandName={brandName}
                          logoUrl={logoUrl || undefined}
                        />
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Voice settings summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Tone of Voice</div>
                    <div className="font-medium">{formatToneOfVoice(previewVariant.tone_of_voice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phong cách</div>
                    <div className="font-medium">{formatFormality(previewVariant.formality_level)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Emoji</div>
                    <div className="font-medium">{previewVariant.allow_emoji ? 'Có' : 'Không'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tạo lúc</div>
                    <div className="font-medium">
                      {format(new Date(previewVariant.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
