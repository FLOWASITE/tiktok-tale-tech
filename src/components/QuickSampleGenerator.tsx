import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChannelMockupFrame } from '@/components/preview/ChannelMockupFrame';
import { SampleRulesCompliance } from '@/components/SampleRulesCompliance';
import { ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { DEFAULT_CHANNEL_SETTINGS, ChannelSettings } from '@/types/channelSettings';
import { Channel } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  MessageCircle,
  Globe,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const channelIcons: Record<Channel, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  pinterest: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  tiktok: <TikTokIcon className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  threads: <MessageCircle className="w-4 h-4" />,
  telegram: <MessageCircle className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  google_maps: <Globe className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  blogger: <Globe className="w-4 h-4" />,
  wordpress: <Globe className="w-4 h-4" />,
  shopify: <Globe className="w-4 h-4" />,
  wix: <Globe className="w-4 h-4" />,
  medium: <Globe className="w-4 h-4" />,
  bluesky: <Globe className="w-4 h-4" />,
};

const POPULAR_CHANNELS: Channel[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'email'];

interface QuickSampleGeneratorProps {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  channelOverrides: ChannelOverrides;
  onSampleGenerated?: (samples: Record<string, string>, rulesUsed: Record<string, ChannelSettings>) => void;
}

function RulesSummary({ channel, overrides }: { channel: Channel; overrides?: ChannelOverrides }) {
  const settings = useMemo(() => {
    const defaultSettings = DEFAULT_CHANNEL_SETTINGS[channel];
    const channelOverride = overrides?.[channel];
    return channelOverride ? { ...defaultSettings, ...channelOverride } : defaultSettings;
  }, [channel, overrides]);

  const hasOverrides = overrides?.[channel] && Object.keys(overrides[channel] || {}).length > 0;

  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
        {settings.min_length || 0}–{settings.max_length} {settings.length_unit === 'chars' ? 'ký tự' : 'chữ'}
      </Badge>
      {settings.hook_required && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-blue-50 text-blue-600 border-blue-200">
          Hook
        </Badge>
      )}
      {settings.emoji_allowed && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
          ≤{settings.emoji_limit} emoji
        </Badge>
      )}
      {settings.hashtag_limit > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
          ≤{settings.hashtag_limit} #
        </Badge>
      )}
      {settings.cta_policy === 'required' && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-green-50 text-green-600 border-green-200">
          CTA
        </Badge>
      )}
      {hasOverrides && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
          Tuỳ chỉnh
        </Badge>
      )}
    </div>
  );
}

export function QuickSampleGenerator({
  brandName,
  brandPositioning,
  toneOfVoice,
  formalityLevel,
  allowEmoji = true,
  preferredWords,
  forbiddenWords,
  channelOverrides,
  onSampleGenerated,
}: QuickSampleGeneratorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | 'all'>('all');
  const [generatedSamples, setGeneratedSamples] = useState<Record<string, string>>({});
  const [rulesUsed, setRulesUsed] = useState<Record<string, ChannelSettings>>({});
  const [activePreviewChannel, setActivePreviewChannel] = useState<Channel>('facebook');

  const channelsToGenerate = useMemo(() => {
    if (selectedChannel === 'all') {
      return POPULAR_CHANNELS;
    }
    return [selectedChannel];
  }, [selectedChannel]);

  const handleGenerate = async () => {
    if (!brandName.trim()) {
      toast.error('Vui lòng nhập tên thương hiệu');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-sample-text', {
        body: {
          brandName,
          positioning: brandPositioning,
          toneOfVoice,
          formalityLevel,
          allowEmoji,
          preferredWords,
          forbiddenWords,
          channels: channelsToGenerate,
          channelOverrides,
        },
      });

      if (error) throw error;

      if (data?.samples) {
        const normalizedSamples: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.samples)) {
          if (typeof value === 'string') {
            normalizedSamples[key] = value;
          } else if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            if ('subject' in obj && 'body' in obj) {
              normalizedSamples[key] = `📧 Subject: ${obj.subject}\n\n${obj.body}`;
            } else {
              normalizedSamples[key] = JSON.stringify(value, null, 2);
            }
          } else {
            normalizedSamples[key] = String(value || '');
          }
        }
        setGeneratedSamples(normalizedSamples);
        setRulesUsed(data.rulesUsed || {});
        
        // Set first channel as active preview
        const firstChannel = Object.keys(normalizedSamples)[0] as Channel;
        if (firstChannel) setActivePreviewChannel(firstChannel);
        
        onSampleGenerated?.(normalizedSamples, data.rulesUsed || {});
        toast.success('Đã tạo mẫu theo Rules!');
      }
    } catch (err) {
      console.error('Failed to generate samples:', err);
      toast.error('Không thể tạo mẫu');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasGeneratedSamples = Object.keys(generatedSamples).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Tạo mẫu theo Rules đã cấu hình
                </CardTitle>
              </div>
              {hasGeneratedSamples && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Đã tạo {Object.keys(generatedSamples).length} mẫu
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Channel selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as Channel | 'all')}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Chọn kênh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Tất cả kênh phổ biến</span>
                      </div>
                    </SelectItem>
                    {Object.entries(channelIcons).map(([ch, icon]) => (
                      <SelectItem key={ch} value={ch}>
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="capitalize">{ch.replace('_', ' ')}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !brandName.trim()}
                  size="sm"
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Tạo mẫu
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Rules preview for selected channels */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Rules sẽ áp dụng:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {channelsToGenerate.map((channel) => (
                  <div
                    key={channel}
                    className="flex flex-col gap-1 p-2 rounded-md border bg-muted/20"
                  >
                    <div className="flex items-center gap-1.5">
                      {channelIcons[channel]}
                      <span className="text-xs font-medium capitalize">{channel.replace('_', ' ')}</span>
                    </div>
                    <RulesSummary channel={channel} overrides={channelOverrides} />
                  </div>
                ))}
              </div>
            </div>

            {/* Generated samples preview */}
            {hasGeneratedSamples && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground font-medium">Kết quả:</div>
                </div>

                <Tabs value={activePreviewChannel} onValueChange={(v) => setActivePreviewChannel(v as Channel)}>
                  <TabsList className="h-8">
                    {Object.keys(generatedSamples).map((ch) => (
                      <TabsTrigger key={ch} value={ch} className="text-xs px-2 py-1 gap-1">
                        {channelIcons[ch as Channel]}
                        <span className="hidden sm:inline capitalize">{ch.replace('_', ' ')}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(generatedSamples).map(([ch, content]) => (
                    <TabsContent key={ch} value={ch} className="mt-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Mockup preview */}
                        <div className="flex justify-center">
                          <ChannelMockupFrame
                            channel={ch as 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email'}
                            content={content}
                            brandName={brandName}
                          />
                        </div>

                        {/* Content and compliance */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Nội dung</span>
                            <SampleRulesCompliance
                              channel={ch as Channel}
                              content={content}
                              rulesUsed={rulesUsed[ch]}
                              brandAllowEmoji={allowEmoji}
                              size="sm"
                              showDetails={true}
                            />
                          </div>
                          <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/20">
                            <pre className="text-xs whitespace-pre-wrap font-sans">{content}</pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* Compliance summary */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Mẫu được tạo theo cấu hình Channel Rules. Badge % cho biết mức độ tuân thủ.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
