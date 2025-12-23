import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check,
  Columns,
  Facebook,
  Linkedin,
  Instagram,
  Mail,
  MessageCircle,
  Wand2,
  Loader2
} from 'lucide-react';
import { generateAllChannelSamples, ChannelType } from '@/utils/generateSampleText';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandVoiceSamplePreviewProps {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  savedSampleTexts?: Record<string, string> | null;
  onSampleTextsChange?: (samples: Record<string, string>) => void;
}

const CHANNEL_INFO: Record<ChannelType, { label: string; icon: React.ReactNode; color: string }> = {
  facebook: { label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: 'bg-blue-500' },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'bg-blue-700' },
  instagram: { label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'bg-pink-500' },
  tiktok: { label: 'TikTok', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-black' },
  twitter: { label: 'Twitter/X', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-sky-500' },
  email: { label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'bg-amber-500' },
  general: { label: 'Chung', icon: <Sparkles className="w-4 h-4" />, color: 'bg-primary' },
};

const VISIBLE_CHANNELS: ChannelType[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

const formalityLabels: Record<string, string> = {
  formal: 'Trang trọng',
  semi_formal: 'Bán trang trọng',
  casual: 'Thân mật',
  friendly: 'Gần gũi',
  very_formal: 'Rất trang trọng',
  very_casual: 'Rất thân mật',
};

const toneLabels: Record<string, string> = {
  professional: 'Chuyên nghiệp',
  friendly: 'Thân thiện',
  authoritative: 'Uy tín',
  playful: 'Vui vẻ',
  empathetic: 'Đồng cảm',
  inspirational: 'Truyền cảm hứng',
  educational: 'Giáo dục',
  conversational: 'Trò chuyện',
};

export function BrandVoiceSamplePreview({
  brandName,
  positioning,
  toneOfVoice = [],
  formalityLevel = 'semi_formal',
  languageStyle = [],
  allowEmoji = true,
  preferredWords = [],
  forbiddenWords = [],
  savedSampleTexts,
  onSampleTextsChange,
}: BrandVoiceSamplePreviewProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('facebook');
  const [showComparison, setShowComparison] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<ChannelType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiSamples, setAiSamples] = useState<Record<string, string> | null>(savedSampleTexts || null);
  const [useAI, setUseAI] = useState(!!savedSampleTexts);

  // Generate template-based samples
  const templateSamples = useMemo(() => {
    return generateAllChannelSamples({
      brandName,
      positioning,
      toneOfVoice,
      formalityLevel,
      allowEmoji,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandName, positioning, toneOfVoice, formalityLevel, allowEmoji, refreshKey]);

  // Helper to normalize sample content (AI might return objects for email)
  const normalizeSample = (sample: unknown): string => {
    if (typeof sample === 'string') return sample;
    if (sample && typeof sample === 'object') {
      // Handle email object format {subject, body}
      const obj = sample as Record<string, unknown>;
      if ('subject' in obj && 'body' in obj) {
        return `📧 Subject: ${obj.subject}\n\n${obj.body}`;
      }
      // Try to stringify other objects
      return JSON.stringify(sample, null, 2);
    }
    return String(sample || '');
  };

  // Use AI samples if available, otherwise use template
  const samples = useMemo(() => {
    const baseSamples = useAI && aiSamples 
      ? { ...templateSamples, ...aiSamples }
      : templateSamples;
    
    // Normalize all samples to ensure they're strings
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(baseSamples)) {
      normalized[key] = normalizeSample(value);
    }
    return normalized;
  }, [useAI, aiSamples, templateSamples]);

  const handleAIGenerate = async () => {
    if (!brandName.trim()) {
      toast.error('Vui lòng nhập tên thương hiệu trước');
      return;
    }

    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-text', {
        body: {
          brandName,
          positioning,
          toneOfVoice,
          formalityLevel,
          allowEmoji,
          preferredWords,
          forbiddenWords,
          channels: VISIBLE_CHANNELS,
        },
      });

      if (error) throw error;

      if (data?.samples) {
        // Normalize the AI samples
        const normalizedSamples: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.samples)) {
          normalizedSamples[key] = normalizeSample(value);
        }
        setAiSamples(normalizedSamples);
        setUseAI(true);
        onSampleTextsChange?.(normalizedSamples);
        toast.success('Đã tạo nội dung mẫu bằng AI!');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      if (err?.message?.includes('429') || err?.message?.includes('Rate limit')) {
        toast.error('Đã vượt giới hạn. Vui lòng thử lại sau.');
      } else if (err?.message?.includes('402')) {
        toast.error('Hết credits AI. Vui lòng nạp thêm.');
      } else {
        toast.error('Không thể tạo nội dung AI. Vui lòng thử lại.');
      }
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleCopy = async (channel: ChannelType) => {
    try {
      await navigator.clipboard.writeText(samples[channel]);
      setCopiedChannel(channel);
      toast.success('Đã copy!');
      setTimeout(() => setCopiedChannel(null), 2000);
    } catch (err) {
      toast.error('Không thể copy');
    }
  };

  const handleRefresh = () => {
    if (useAI) {
      handleAIGenerate();
    } else {
      setRefreshKey(prev => prev + 1);
      toast.success('Đã tạo lại sample text!');
    }
  };

  const handleSwitchMode = () => {
    if (!useAI) {
      handleAIGenerate();
    } else {
      setUseAI(false);
      toast.info('Đã chuyển về chế độ template');
    }
  };

  const hasTone = toneOfVoice.length > 0;
  
  return (
    <>
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Xem trước nội dung mẫu
              {useAI ? (
                <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Wand2 className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Template
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={useAI ? "default" : "outline"}
                size="sm"
                onClick={handleSwitchMode}
                disabled={isAIGenerating}
                className="h-7 text-xs gap-1"
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    {useAI ? 'Template' : 'AI Generate'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowComparison(true)}
                className="h-7 text-xs gap-1"
              >
                <Columns className="w-3.5 h-3.5" />
                So sánh
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isAIGenerating}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAIGenerating ? 'animate-spin' : ''}`} />
                Tạo lại
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Channel tabs */}
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelType)}>
            <TabsList className="w-full grid grid-cols-5 h-8">
              {VISIBLE_CHANNELS.map((channel) => (
                <TabsTrigger
                  key={channel}
                  value={channel}
                  className="text-xs gap-1 data-[state=active]:bg-background px-2"
                >
                  {CHANNEL_INFO[channel].icon}
                  <span className="hidden sm:inline">{CHANNEL_INFO[channel].label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {VISIBLE_CHANNELS.map((channel) => (
              <TabsContent key={channel} value={channel} className="mt-3">
                <div className="relative">
                  {isAIGenerating ? (
                    <div className="bg-background rounded-lg p-4 border min-h-[120px] space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <div className="bg-background rounded-lg p-4 text-sm border min-h-[120px] whitespace-pre-wrap">
                      {samples[channel]}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(channel)}
                    disabled={isAIGenerating}
                    className="absolute bottom-2 right-2 h-7 text-xs gap-1"
                  >
                    {copiedChannel === channel ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Đã copy
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Voice characteristics summary */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Đặc điểm giọng nói:</p>
            <div className="flex flex-wrap gap-1.5">
              {formalityLevel && (
                <Badge variant="outline" className="text-xs">
                  📋 {formalityLabels[formalityLevel] || formalityLevel}
                </Badge>
              )}
              {hasTone && toneOfVoice.slice(0, 3).map((tone) => (
                <Badge key={tone} variant="outline" className="text-xs">
                  🎤 {toneLabels[tone] || tone}
                </Badge>
              ))}
              {toneOfVoice.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{toneOfVoice.length - 3}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {allowEmoji ? '😊 Có emoji' : '🚫 Không emoji'}
              </Badge>
            </div>
          </div>
          
          {/* Preferred/Forbidden words preview */}
          {(preferredWords.length > 0 || forbiddenWords.length > 0) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {preferredWords.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">✅ Từ nên dùng:</p>
                  <p className="text-green-600 dark:text-green-400 truncate">
                    {preferredWords.slice(0, 3).join(', ')}
                    {preferredWords.length > 3 && '...'}
                  </p>
                </div>
              )}
              {forbiddenWords.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">❌ Từ không dùng:</p>
                  <p className="text-red-600 dark:text-red-400 truncate">
                    {forbiddenWords.slice(0, 3).join(', ')}
                    {forbiddenWords.length > 3 && '...'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Positioning preview */}
          {positioning && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">🎯 Định vị:</p>
              <p className="text-foreground italic line-clamp-2">"{positioning}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns className="w-5 h-5" />
              So sánh nội dung mẫu giữa các kênh
              {useAI && (
                <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Wand2 className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
              {VISIBLE_CHANNELS.map((channel) => (
                <Card key={channel} className="overflow-hidden">
                  <CardHeader className="py-2 px-3 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-white ${CHANNEL_INFO[channel].color}`}>
                          {CHANNEL_INFO[channel].icon}
                        </div>
                        <span className="font-medium text-sm">{CHANNEL_INFO[channel].label}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(channel)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedChannel === channel ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {samples[channel]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
