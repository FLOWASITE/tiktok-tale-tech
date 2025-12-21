import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Sparkles, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, CheckSquare, Square, Timer, Info, Lightbulb } from 'lucide-react';
import { MultiChannelFormData, ContentGoal, Channel, CONTENT_GOALS, CHANNELS, TOPIC_SUGGESTIONS } from '@/types/multichannel';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
import { BrandAppliedInfo } from '@/components/BrandAppliedInfo';

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

const DRAFT_KEY = 'multichannel_form_draft';

export function MultiChannelForm({ onSubmit, isLoading }: MultiChannelFormProps) {
  const { templates, loading: loadingTemplates } = useBrandTemplates();
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [contentGoal, setContentGoal] = useState<ContentGoal>('education');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['facebook', 'instagram']);
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [hasSetDefault, setHasSetDefault] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    if (!hasLoadedDraft) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.topic) setTopic(parsed.topic);
          if (parsed.industry) setIndustry(parsed.industry);
          if (parsed.contentGoal) setContentGoal(parsed.contentGoal);
          if (parsed.selectedChannels?.length) setSelectedChannels(parsed.selectedChannels);
          if (parsed.brandTemplateId) setBrandTemplateId(parsed.brandTemplateId);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
      setHasLoadedDraft(true);
    }
  }, [hasLoadedDraft]);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    if (!hasLoadedDraft) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          topic,
          industry,
          contentGoal,
          selectedChannels,
          brandTemplateId,
        }));
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [topic, industry, contentGoal, selectedChannels, brandTemplateId, hasLoadedDraft]);

  // Set default template when templates load (only once) + auto-fill industry
  useEffect(() => {
    if (templates.length > 0 && !hasSetDefault && !brandTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setBrandTemplateId(defaultTemplate.id);
      // Auto-fill industry from default template
      if (defaultTemplate.industry?.length && !industry) {
        setIndustry(defaultTemplate.industry.join(', '));
      }
      setHasSetDefault(true);
    }
  }, [templates, hasSetDefault, brandTemplateId]);

  const selectedTemplate = templates.find(t => t.id === brandTemplateId);

  // Auto-fill industry when template changes
  useEffect(() => {
    if (selectedTemplate && !industry) {
      if (selectedTemplate.industry?.length) {
        setIndustry(selectedTemplate.industry.join(', '));
      }
    }
  }, [selectedTemplate?.id]);

  // Estimate generation time
  const estimatedTime = useMemo(() => {
    const baseTime = 10; // seconds
    const perChannelTime = 5; // seconds per channel
    return baseTime + (selectedChannels.length * perChannelTime);
  }, [selectedChannels.length]);

  const handleChannelToggle = (channel: Channel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSelectAll = () => {
    setSelectedChannels(CHANNELS.map(c => c.value));
  };

  const handleDeselectAll = () => {
    setSelectedChannels([]);
  };

  const handleSelectCategory = (category: string) => {
    const categoryChannels = CHANNELS.filter(c => c.category === category).map(c => c.value);
    const allSelected = categoryChannels.every(c => selectedChannels.includes(c));
    
    if (allSelected) {
      setSelectedChannels(prev => prev.filter(c => !categoryChannels.includes(c)));
    } else {
      setSelectedChannels(prev => [...new Set([...prev, ...categoryChannels])]);
    }
  };

  const handleTopicSuggestion = (suggestion: string) => {
    setTopic(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || selectedChannels.length === 0) return;

    // Clear draft on successful submit
    localStorage.removeItem(DRAFT_KEY);

    await onSubmit({
      topic: topic.trim(),
      industry: industry.trim() || selectedTemplate?.industry?.join(', ') || undefined,
      contentGoal,
      channels: selectedChannels,
      brandTemplateId: brandTemplateId || undefined,
    });
  };

  // Group channels by category
  const channelCategories = [
    { name: 'Nền tảng nội dung', key: 'content', channels: CHANNELS.filter(c => c.category === 'content') },
    { name: 'Mạng xã hội', key: 'social', channels: CHANNELS.filter(c => c.category === 'social') },
    { name: 'Kênh trực tiếp', key: 'direct', channels: CHANNELS.filter(c => c.category === 'direct') },
    { name: 'Địa phương', key: 'local', channels: CHANNELS.filter(c => c.category === 'local') },
  ];

  // Validation warnings
  const topicLength = topic.trim().length;
  const topicWarning = topicLength > 0 && topicLength < 10 ? 'Chủ đề nên có ít nhất 10 ký tự' : null;
  const channelWarning = selectedChannels.length > 8 ? 'Chọn nhiều kênh sẽ mất thêm thời gian tạo' : null;

  return (
    <TooltipProvider>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="topic">Chủ đề / Ý tưởng</Label>
                <span className="text-xs text-muted-foreground">{topicLength}/500</span>
              </div>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 500))}
                placeholder="VD: Cách tối ưu thuế cho doanh nghiệp nhỏ trong năm 2024"
                className="min-h-[100px] resize-y"
                disabled={isLoading}
              />
              {topicWarning && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {topicWarning}
                </p>
              )}
              
              {/* Topic Suggestions */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Gợi ý chủ đề:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_SUGGESTIONS.slice(0, 4).map((suggestion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors text-xs"
                      onClick={() => handleTopicSuggestion(suggestion)}
                    >
                      {suggestion.length > 35 ? suggestion.slice(0, 35) + '...' : suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Industry (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="industry">Ngành nghề</Label>
                <span className="text-xs text-muted-foreground">(tùy chọn)</span>
              </div>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={selectedTemplate?.industry?.join(', ') || 'VD: Tài chính, Bất động sản, F&B...'}
                disabled={isLoading}
              />
              {selectedTemplate?.industry?.length && !industry && (
                <p className="text-xs text-muted-foreground">
                  Sử dụng từ Brand Template: {selectedTemplate.industry.join(', ')}
                </p>
              )}
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
                  <SelectValue placeholder="Chọn mục tiêu..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_GOALS.map((goal) => {
                    const Icon = goal.icon;
                    return (
                      <SelectItem key={goal.value} value={goal.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span>{goal.label}</span>
                          <span className="text-xs text-muted-foreground">- {goal.description}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
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
                      <span className="flex items-center gap-2">
                        {template.primary_color && (
                          <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: template.primary_color }}
                          />
                        )}
                        <span>{template.name}</span>
                        {template.is_default && (
                          <span className="text-xs text-muted-foreground">(Mặc định)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            {selectedTemplate && (
                <BrandAppliedInfo 
                  template={selectedTemplate} 
                  selectedChannels={selectedChannels}
                  industry={industry}
                />
              )}
            </div>

            {/* Channels by Category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Kênh xuất bản</Label>
                <Badge variant="secondary" className="text-xs">
                  Đã chọn: {selectedChannels.length}/{CHANNELS.length} kênh
                </Badge>
              </div>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Chọn tất cả
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Bỏ chọn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCategory('social')}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Social Media
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCategory('direct')}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Kênh trực tiếp
                </Button>
              </div>

              {channelWarning && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {channelWarning}
                </p>
              )}

              {channelCategories.map((category) => (
                <div key={category.key} className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.channels.map((channel) => (
                      <Tooltip key={channel.value}>
                        <TooltipTrigger asChild>
                          <label
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
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{channel.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Estimated Time */}
            {selectedChannels.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Timer className="w-3.5 h-3.5" />
                <span>Ước tính: ~{estimatedTime} giây</span>
              </div>
            )}

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
    </TooltipProvider>
  );
}
