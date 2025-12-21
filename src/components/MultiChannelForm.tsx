import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send } from 'lucide-react';
import { MultiChannelFormData, ContentGoal, Channel, CONTENT_GOALS, CHANNELS } from '@/types/multichannel';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';

interface MultiChannelFormProps {
  onSubmit: (data: MultiChannelFormData) => Promise<void>;
  isLoading: boolean;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
};

const channelColors: Record<Channel, string> = {
  website: 'text-blue-500',
  facebook: 'text-indigo-500',
  instagram: 'text-pink-500',
  twitter: 'text-slate-500',
  google_maps: 'text-green-500',
  linkedin: 'text-sky-500',
  email: 'text-amber-500',
  youtube: 'text-red-500',
  zalo_oa: 'text-blue-500',
  telegram: 'text-sky-500',
};

export function MultiChannelForm({ onSubmit, isLoading }: MultiChannelFormProps) {
  const { templates, loading: loadingTemplates } = useBrandTemplates();
  const [topic, setTopic] = useState('');
  const [contentGoal, setContentGoal] = useState<ContentGoal>('education');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['facebook', 'instagram']);
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [hasSetDefault, setHasSetDefault] = useState(false);

  // Set default template when templates load (only once)
  useEffect(() => {
    if (templates.length > 0 && !hasSetDefault) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setBrandTemplateId(defaultTemplate.id);
      setHasSetDefault(true);
    }
  }, [templates, hasSetDefault]);

  const selectedTemplate = templates.find(t => t.id === brandTemplateId);

  const handleChannelToggle = (channel: Channel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || selectedChannels.length === 0) return;

    await onSubmit({
      topic: topic.trim(),
      industry: selectedTemplate?.industry?.join(', ') || undefined,
      contentGoal,
      channels: selectedChannels,
      brandTemplateId: brandTemplateId || undefined,
    });
  };

  // Group channels by category
  const channelCategories = [
    { name: 'Nền tảng nội dung', channels: CHANNELS.filter(c => c.category === 'content') },
    { name: 'Mạng xã hội', channels: CHANNELS.filter(c => c.category === 'social') },
    { name: 'Kênh trực tiếp', channels: CHANNELS.filter(c => c.category === 'direct') },
    { name: 'Địa phương', channels: CHANNELS.filter(c => c.category === 'local') },
  ];

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Tạo nội dung đa kênh
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Chủ đề / Ý tưởng</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Cách tối ưu thuế cho doanh nghiệp nhỏ trong năm 2024"
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Content Goal */}
          <div className="space-y-2">
            <Label>Mục tiêu nội dung</Label>
            <Select
              value={contentGoal}
              onValueChange={(value) => setContentGoal(value as ContentGoal)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    <div className="flex flex-col">
                      <span>{goal.label}</span>
                      <span className="text-xs text-muted-foreground">{goal.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Template */}
          <div className="space-y-2">
            <Label>Brand Template</Label>
            <Select
              value={brandTemplateId}
              onValueChange={setBrandTemplateId}
              disabled={isLoading || loadingTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.primary_color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: template.primary_color }}
                        />
                      )}
                      <span>{template.name}</span>
                      {template.is_default && (
                        <span className="text-xs text-muted-foreground">(Mặc định)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <BrandPreviewCard template={selectedTemplate} />
            )}
          </div>

          {/* Channels by Category */}
          <div className="space-y-3">
            <Label>Kênh xuất bản</Label>
            {channelCategories.map((category) => (
              <div key={category.name} className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {category.channels.map((channel) => (
                    <label
                      key={channel.value}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedChannels.includes(channel.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 hover:border-border'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={selectedChannels.includes(channel.value)}
                        onCheckedChange={() => handleChannelToggle(channel.value)}
                        disabled={isLoading}
                      />
                      <span className={channelColors[channel.value]}>
                        {channelIcons[channel.value]}
                      </span>
                      <span className="text-sm">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full relative overflow-hidden group/btn transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
            disabled={isLoading || !topic.trim() || selectedChannels.length === 0}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo nội dung...
              </span>
            ) : (
              <span className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-12" />
                Tạo nội dung ({selectedChannels.length} kênh)
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
