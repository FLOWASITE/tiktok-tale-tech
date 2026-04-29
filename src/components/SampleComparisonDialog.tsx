import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeftRight, 
  ChevronLeft,
  ChevronRight,
  Facebook,
  Linkedin,
  Instagram,
  Music2,
  Mail,
  Star,
  Clock,
} from 'lucide-react';
import { PinterestIcon } from '@/components/icons/SocialIcons';
import { cn } from '@/lib/utils';
import { ChannelMockupFrame } from './preview/ChannelMockupFrame';
import { ChannelType } from '@/utils/generateSampleText';

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: React.ReactNode; color: string }> = {
  facebook: { label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: 'text-blue-600' },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  instagram: { label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-600' },
  pinterest: { label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-600' },
  tiktok: { label: 'TikTok', icon: <Music2 className="w-4 h-4" />, color: 'text-foreground' },
  email: { label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'text-amber-600' },
  twitter: { label: 'Twitter', icon: null, color: '' },
  general: { label: 'General', icon: null, color: '' },
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

export interface ComparableSample {
  id: string;
  name: string;
  sample_texts: Record<string, string | { subject: string; body: string }>;
  tone_of_voice?: string[] | null;
  formality_level?: string | null;
  allow_emoji?: boolean;
  is_control?: boolean;
  is_pending?: boolean;
}

interface SampleComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
  samples: ComparableSample[];
}

export function SampleComparisonDialog({
  open,
  onOpenChange,
  brandName,
  samples,
}: SampleComparisonDialogProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');

  const getSampleContent = (sampleTexts: Record<string, string | { subject: string; body: string }>, channel: ChannelType): string => {
    const sample = sampleTexts[channel];
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object' && 'subject' in sample && 'body' in sample) {
      return `📧 Subject: ${sample.subject}\n\n${sample.body}`;
    }
    return '';
  };

  const navigateChannel = (direction: 'prev' | 'next') => {
    const currentIndex = VISIBLE_CHANNELS.indexOf(activeChannel);
    if (direction === 'prev' && currentIndex > 0) {
      setActiveChannel(VISIBLE_CHANNELS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < VISIBLE_CHANNELS.length - 1) {
      setActiveChannel(VISIBLE_CHANNELS[currentIndex + 1]);
    }
  };

  const currentIndex = VISIBLE_CHANNELS.indexOf(activeChannel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            So sánh {samples.length} mẫu nội dung
          </DialogTitle>
        </DialogHeader>
        
        {/* Channel Navigation */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => navigateChannel('prev')}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1">
              <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)}>
                <TabsList className="w-full grid grid-cols-5 h-11 bg-background">
                  {VISIBLE_CHANNELS.map(channel => {
                    const config = CHANNEL_CONFIG[channel];
                    return (
                      <TabsTrigger 
                        key={channel} 
                        value={channel}
                        className={cn(
                          "gap-2 text-sm transition-all data-[state=active]:shadow-md",
                          activeChannel === channel && config.color
                        )}
                      >
                        {config.icon}
                        <span className="hidden sm:inline">{config.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => navigateChannel('next')}
              disabled={currentIndex === VISIBLE_CHANNELS.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Comparison Grid */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="p-6">
            <div 
              className="grid gap-6" 
              style={{ 
                gridTemplateColumns: `repeat(${Math.min(samples.length, 3)}, minmax(300px, 1fr))` 
              }}
            >
              {samples.map((sample, index) => (
                <div key={sample.id} className="space-y-3">
                  {/* Sample header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sample.is_control && (
                        <Star className="w-4 h-4 text-primary fill-primary" />
                      )}
                      {sample.is_pending && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="font-medium truncate">{sample.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sample.is_control && (
                        <Badge variant="secondary" className="text-xs">Control</Badge>
                      )}
                      {sample.is_pending && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Chờ lưu</Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Mockup */}
                  <div className={cn(
                    "border rounded-xl overflow-hidden transition-all",
                    sample.is_control && "ring-2 ring-primary/20 bg-primary/5",
                    sample.is_pending && "border-amber-300/50 bg-amber-50/20 dark:bg-amber-950/10"
                  )}>
                    <ChannelMockupFrame
                      channel={activeChannel}
                      content={getSampleContent(sample.sample_texts, activeChannel)}
                      brandName={brandName}
                    />
                  </div>
                  
                  {/* Voice settings */}
                  <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tone:</span>
                      <span className="font-medium">{formatToneOfVoice(sample.tone_of_voice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phong cách:</span>
                      <span className="font-medium">{formatFormality(sample.formality_level)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emoji:</span>
                      <span className="font-medium">{sample.allow_emoji ? '✓ Có' : '✗ Không'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Horizontal scroll for more than 3 samples */}
            {samples.length > 3 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Cuộn ngang để xem thêm {samples.length - 3} mẫu khác
                </p>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-primary fill-primary" />
              Control: Mẫu chuẩn
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-500" />
              Chờ lưu: Chưa lưu vào DB
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Đang xem: <span className={cn("font-medium", CHANNEL_CONFIG[activeChannel].color)}>{CHANNEL_CONFIG[activeChannel].label}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
