import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Eye, 
  ChevronLeft,
  ChevronRight,
  Facebook,
  Linkedin,
  Instagram,
  Music2,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelMockupFrame } from './preview/ChannelMockupFrame';
import { ChannelType } from '@/utils/generateSampleText';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  facebook: { 
    label: 'Facebook', 
    icon: <Facebook className="w-4 h-4" />, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10'
  },
  linkedin: { 
    label: 'LinkedIn', 
    icon: <Linkedin className="w-4 h-4" />, 
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10'
  },
  instagram: { 
    label: 'Instagram', 
    icon: <Instagram className="w-4 h-4" />, 
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10'
  },
  tiktok: { 
    label: 'TikTok', 
    icon: <Music2 className="w-4 h-4" />, 
    color: 'text-foreground',
    bgColor: 'bg-foreground/10'
  },
  email: { 
    label: 'Email', 
    icon: <Mail className="w-4 h-4" />, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10'
  },
  twitter: { label: 'X', icon: null, color: '', bgColor: '' },
  general: { label: 'General', icon: null, color: '', bgColor: '' },
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

interface SamplePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  badge?: { text: string; variant: 'secondary' | 'outline' };
  badgeClassName?: string;
  sampleTexts: Record<string, string | { subject: string; body: string }>;
  brandName: string;
  voiceSettings?: {
    tone_of_voice?: string[] | null;
    formality_level?: string | null;
    allow_emoji?: boolean;
    created_at?: string;
  };
}

export function SamplePreviewDialog({
  open,
  onOpenChange,
  title,
  badge,
  badgeClassName,
  sampleTexts,
  brandName,
  voiceSettings,
}: SamplePreviewDialogProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');

  const getSampleContent = (channel: ChannelType): string => {
    const sample = sampleTexts[channel];
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object' && 'subject' in sample && 'body' in sample) {
      const s = sample as unknown as { subject: string; body: string };
      return `📧 Subject: ${s.subject}\n\n${s.body}`;
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            {title}
            {badge && (
              <Badge variant={badge.variant} className={cn("text-xs", badgeClassName)}>
                {badge.text}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          {/* Channel Navigation */}
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
                <TabsList className="w-full grid grid-cols-5 h-11 bg-muted/50">
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
          
          {/* Mockup preview */}
          <div className="flex justify-center">
            <div className="w-full max-w-md transition-all duration-300">
              <ChannelMockupFrame
                channel={activeChannel}
                content={getSampleContent(activeChannel)}
                brandName={brandName}
              />
            </div>
          </div>
          
          {/* Voice settings summary */}
          {voiceSettings && (
            <div className="p-4 bg-muted/30 rounded-xl border">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tone of Voice</div>
                  <div className="font-medium">{formatToneOfVoice(voiceSettings.tone_of_voice)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phong cách</div>
                  <div className="font-medium">{formatFormality(voiceSettings.formality_level)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emoji</div>
                  <div className="font-medium">{voiceSettings.allow_emoji ? '✓ Có sử dụng' : '✗ Không dùng'}</div>
                </div>
                {voiceSettings.created_at && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tạo lúc</div>
                    <div className="font-medium">
                      {format(new Date(voiceSettings.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Đang xem: <span className={cn("font-medium", CHANNEL_CONFIG[activeChannel].color)}>{CHANNEL_CONFIG[activeChannel].label}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentIndex + 1} / {VISIBLE_CHANNELS.length} kênh
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
