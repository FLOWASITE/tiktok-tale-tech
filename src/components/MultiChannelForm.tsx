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
import { Loader2, Sparkles, Globe, Facebook, Instagram, Twitter, MapPin } from 'lucide-react';
import { MultiChannelFormData, ContentGoal, Channel, CONTENT_GOALS, CHANNELS } from '@/types/multichannel';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';

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
};

const channelColors: Record<Channel, string> = {
  website: 'text-blue-500',
  facebook: 'text-indigo-500',
  instagram: 'text-pink-500',
  twitter: 'text-slate-500',
  google_maps: 'text-green-500',
};

export function MultiChannelForm({ onSubmit, isLoading }: MultiChannelFormProps) {
  const { templates, loading: loadingTemplates } = useBrandTemplates();
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
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
      industry: industry.trim() || undefined,
      contentGoal,
      channels: selectedChannels,
      brandTemplateId: brandTemplateId || undefined,
    });
  };

  const canSubmit = topic.trim() && selectedChannels.length > 0 && !isLoading;

  return (
    <Card className="gradient-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Tạo Nội Dung Đa Kênh
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Chủ đề nội dung *</Label>
            <Textarea
              id="topic"
              placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Ngành / Bối cảnh (tuỳ chọn)</Label>
            <Input
              id="industry"
              placeholder="VD: Thuế & Kế toán, Bất động sản, Công nghệ..."
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Content Goal */}
          <div className="space-y-2">
            <Label>Mục tiêu nội dung *</Label>
            <Select value={contentGoal} onValueChange={(v) => setContentGoal(v as ContentGoal)} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    {goal.label} - {goal.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Template */}
          <div className="space-y-2">
            <Label>Brand Template *</Label>
            <Select
              value={brandTemplateId}
              onValueChange={setBrandTemplateId}
              disabled={isLoading || loadingTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn brand template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem
                    key={template.id}
                    value={template.id}
                    textValue={template.name}
                    className="py-2"
                  >
                    <span className="flex items-center gap-2">
                      {template.logo_url ? (
                        <img
                          src={template.logo_url}
                          alt=""
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <span
                          className="w-5 h-5 rounded flex-shrink-0 border border-border"
                          style={{ backgroundColor: template.primary_color || 'hsl(var(--muted))' }}
                        />
                      )}
                      <span className="flex items-center gap-1.5">
                        {template.primary_color && (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-border/50"
                            style={{ backgroundColor: template.primary_color }}
                          />
                        )}
                        <span>{template.name}</span>
                        {template.is_default && (
                          <span className="text-xs text-muted-foreground">(Mặc định)</span>
                        )}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Brand Preview */}
            {selectedTemplate && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
                <div className="flex items-center gap-2">
                  {selectedTemplate.primary_color && (
                    <div 
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: selectedTemplate.primary_color }}
                    />
                  )}
                  <span className="text-sm font-medium">{selectedTemplate.brand_name}</span>
                </div>
                {selectedTemplate.brand_guideline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {selectedTemplate.brand_guideline}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <Label>Kênh xuất bản * (chọn ít nhất 1)</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((channel) => (
                <div
                  key={channel.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedChannels.includes(channel.value)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted/30 border-border/50 hover:border-border'
                  } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => !isLoading && handleChannelToggle(channel.value)}
                >
                  <Checkbox
                    checked={selectedChannels.includes(channel.value)}
                    onCheckedChange={() => handleChannelToggle(channel.value)}
                    disabled={isLoading}
                  />
                  <div className={`${channelColors[channel.value]}`}>
                    {channelIcons[channel.value]}
                  </div>
                  <span className="text-sm">{channel.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo nội dung...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo Nội Dung ({selectedChannels.length} kênh)
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
