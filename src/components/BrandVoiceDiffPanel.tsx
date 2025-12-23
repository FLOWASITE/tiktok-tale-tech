import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  Undo2, 
  Check, 
  X, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  Mail,
  Sparkles
} from 'lucide-react';
import { VoiceSnapshot } from '@/hooks/useBrandVoiceSnapshot';
import { cn } from '@/lib/utils';
import { ChannelType } from '@/utils/generateSampleText';

interface BrandVoiceDiffPanelProps {
  snapshot: VoiceSnapshot | null;
  isGenerating?: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
  formatValue: (value: unknown) => string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  facebook: { label: 'Facebook', icon: <Facebook className="w-3.5 h-3.5" /> },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-3.5 h-3.5" /> },
  instagram: { label: 'Instagram', icon: <Instagram className="w-3.5 h-3.5" /> },
  tiktok: { label: 'TikTok', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  email: { label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
};

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

export function BrandVoiceDiffPanel({
  snapshot,
  isGenerating = false,
  onConfirm,
  onDiscard,
  formatValue,
}: BrandVoiceDiffPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');

  if (!snapshot) return null;

  const hasSamples = snapshot.previousSamples && snapshot.newSamples;
  const beforeSample = snapshot.previousSamples?.[activeChannel] || '';
  const afterSample = snapshot.newSamples?.[activeChannel] || '';

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg animate-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                So sánh thay đổi
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {snapshot.attributeLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Badge variant="secondary" className="animate-pulse gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Đang tạo mẫu mới...
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {/* Attribute change summary */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
              Trước
            </Badge>
            <span className="font-medium truncate max-w-[120px]">
              {formatValue(snapshot.previousValue)}
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
              Sau
            </Badge>
            <span className="font-medium truncate max-w-[120px]">
              {formatValue(snapshot.newValue)}
            </span>
          </div>

          {/* Sample comparison */}
          {hasSamples && (
            <div className="space-y-3">
              <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)}>
                <TabsList className="grid grid-cols-5 h-8">
                  {VISIBLE_CHANNELS.map((channel) => {
                    const config = CHANNEL_CONFIG[channel];
                    return (
                      <TabsTrigger 
                        key={channel} 
                        value={channel}
                        className="text-xs gap-1 px-2"
                      >
                        {config.icon}
                        <span className="hidden sm:inline">{config.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {VISIBLE_CHANNELS.map((channel) => (
                  <TabsContent key={channel} value={channel} className="mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Before */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs font-medium text-red-600">Trước</span>
                        </div>
                        <ScrollArea className="h-32 rounded-lg border bg-red-50/50 dark:bg-red-950/20 p-3">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">
                            {snapshot.previousSamples?.[channel] || 'Chưa có nội dung'}
                          </p>
                        </ScrollArea>
                      </div>

                      {/* After */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs font-medium text-green-600">Sau</span>
                        </div>
                        <ScrollArea className="h-32 rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-3">
                          {isGenerating ? (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">
                              {snapshot.newSamples?.[channel] || 'Đang chờ tạo mẫu...'}
                            </p>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isGenerating}
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Hoàn tác
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onConfirm}
              disabled={isGenerating}
              className="gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <Check className="w-3.5 h-3.5" />
              Giữ thay đổi
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
