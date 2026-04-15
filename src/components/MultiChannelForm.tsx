import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Sparkles, Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, CheckSquare, Square, Timer, Info, Music2, AtSign, Eye, ChevronDown, ChevronUp, Book } from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { MultiChannelFormData, ContentGoal, ContentAngle, Channel, CHANNELS } from '@/types/multichannel';
import { ContentAngleSelector } from '@/components/multichannel/ContentAngleSelector';
import { MultiChannelHookGenerator } from '@/components/multichannel/MultiChannelHookGenerator';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicRefinement } from '@/hooks/useTopicRefinement';
import { BrandAppliedInfo } from '@/components/BrandAppliedInfo';
import { BrandTemplateCombobox } from '@/components/BrandTemplateCombobox';
import { ContentGoalCombobox } from '@/components/ContentGoalCombobox';
import { MultiChannelPreviewDialog, EditedPreviews } from '@/components/MultiChannelPreviewDialog';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { TopicRefinementSuggestions } from '@/components/script/TopicRefinementSuggestions';
import { ContentPurposeSelector } from '@/components/topic/ContentPurposeSelector';
import { MarketingFrameworkSelector } from '@/components/topic/MarketingFrameworkSelector';
import { QuickStartSection } from '@/components/QuickStartSection';
import { QuickStartTemplate } from '@/types/quickStartTemplates';
import { getTopicSuggestionsForTemplate } from '@/utils/topicTemplateUtils';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { BrandVoiceVariantSelector } from '@/components/BrandVoiceVariantSelector';
import { BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';

interface MultiChannelFormProps {
  onSubmit: (data: MultiChannelFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  initialGoal?: ContentGoal;
  initialContentPurpose?: ContentPurpose;
  initialMarketingFramework?: MarketingFramework;
  topicHistoryId?: string;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  facebook: <Facebook className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  instagram: <Instagram className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  twitter: <XIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  google_maps: <MapPin className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  linkedin: <Linkedin className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  email: <Mail className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  youtube: <Youtube className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  zalo_oa: <ZaloIcon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  telegram: <Send className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  tiktok: <Music2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
  threads: <AtSign className="w-3.5 h-3.5 xs:w-4 xs:h-4" />,
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
  tiktok: 'text-pink-500',
  threads: 'text-slate-600',
};

const DRAFT_KEY = 'multichannel_form_draft';

// Loading phases for enhanced UX during generation
const LOADING_PHASES = [
  { key: 'analyzing', label: 'Đang phân tích chủ đề...' },
  { key: 'context', label: 'Đang tải ngữ cảnh thương hiệu...' },
  { key: 'generating', label: 'Đang tạo nội dung...' },
  { key: 'optimizing', label: 'Đang tối ưu hashtags...' },
  { key: 'finalizing', label: 'Hoàn thiện nội dung...' },
];

// Channel-specific loading messages
const getChannelLoadingPhases = (channels: Channel[]) => {
  const basePhases = [{ key: 'analyzing', label: 'Đang phân tích chủ đề...' }];
  
  const channelPhases = channels.slice(0, 4).map(ch => {
    const channelInfo = CHANNELS.find(c => c.value === ch);
    return { key: `channel-${ch}`, label: `Đang tạo nội dung ${channelInfo?.label || ch}...` };
  });
  
  if (channels.length > 4) {
    channelPhases.push({ key: 'more-channels', label: `Đang tạo ${channels.length - 4} kênh còn lại...` });
  }
  
  return [
    ...basePhases,
    ...channelPhases,
    { key: 'optimizing', label: 'Đang tối ưu hashtags & CTA...' },
    { key: 'finalizing', label: 'Hoàn thiện nội dung...' },
  ];
};

export function MultiChannelForm({ onSubmit, isLoading, initialTopic, initialGoal, initialContentPurpose, initialMarketingFramework, topicHistoryId }: MultiChannelFormProps) {
  const { templates, loading: loadingTemplates } = useBrandTemplates();
  const [topic, setTopic] = useState(initialTopic || '');
  const [industry, setIndustry] = useState('');
  const [contentGoal, setContentGoal] = useState<ContentGoal>(initialGoal || 'education');
  const [contentAngle, setContentAngle] = useState<ContentAngle | undefined>(undefined);
  const [contentPurpose, setContentPurpose] = useState<ContentPurpose | undefined>(initialContentPurpose);
  const [marketingFramework, setMarketingFramework] = useState<MarketingFramework | undefined>(initialMarketingFramework);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(!!initialContentPurpose || !!initialMarketingFramework);
  const [selectedQuickStartTemplate, setSelectedQuickStartTemplate] = useState<QuickStartTemplate | null>(null);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  // Handle initialTopic/initialGoal prop changes
  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  useEffect(() => {
    if (initialGoal) {
      setContentGoal(initialGoal);
    }
  }, [initialGoal]);

  // Handle initialContentPurpose/initialMarketingFramework prop changes
  useEffect(() => {
    if (initialContentPurpose) {
      setContentPurpose(initialContentPurpose);
      setShowAdvancedOptions(true);
    }
    if (initialMarketingFramework) {
      setMarketingFramework(initialMarketingFramework);
      setShowAdvancedOptions(true);
    }
  }, [initialContentPurpose, initialMarketingFramework]);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['facebook', 'instagram']);
  const [brandTemplateId, setBrandTemplateId] = useState<string>('');
  const [brandVoiceVariantId, setBrandVoiceVariantId] = useState<string | undefined>(undefined);
  const [hasSetDefault, setHasSetDefault] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingEditedPreviews, setPendingEditedPreviews] = useState<EditedPreviews | undefined>(undefined);
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Topic suggestions hook - using unified AI engine
  const { 
    suggestions: enhancedSuggestions, 
    source: suggestionsSource, 
    isEnhancing: suggestionsLoading, 
    refresh: refreshSuggestions,
    saveSuggestion,
    submitFeedback,
  } = useEnhancedTopicSuggestions({
    contentGoal,
    brandTemplateId,
    format: 'multichannel',
    enabled: hasLoadedDraft, // Only fetch after draft loaded
  });

  // Topic refinement hook - AI-powered topic improvement suggestions
  const {
    refinedTopics,
    isLoading: isRefining,
    isTyping: isTypingTopic,
    refresh: refreshRefinement,
    elapsedMs: refinementElapsedMs,
  } = useTopicRefinement({
    rawTopic: topic,
    brandTemplateId: brandTemplateId || undefined,
    enabled: hasLoadedDraft && topic.trim().length >= 10,
  });

  // Dynamic loading phases based on selected channels
  const loadingPhases = useMemo(() => 
    getChannelLoadingPhases(selectedChannels), 
    [selectedChannels]
  );

  // Loading phase rotation effect
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhaseIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingPhaseIndex(prev => {
        const next = prev + 1;
        return next >= loadingPhases.length ? loadingPhases.length - 1 : next;
      });
    }, 2500); // Rotate every 2.5 seconds

    return () => clearInterval(interval);
  }, [isLoading, loadingPhases.length]);

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

  // Auto-fill industry when template changes and focus topic field
  useEffect(() => {
    if (selectedTemplate && !industry) {
      if (selectedTemplate.industry?.length) {
        setIndustry(selectedTemplate.industry.join(', '));
      }
    }
    // Focus topic field when template is selected
    if (selectedTemplate && hasSetDefault) {
      topicRef.current?.focus();
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

  const handleSubmit = async (e: React.FormEvent, editedPreviews?: EditedPreviews) => {
    e.preventDefault();
    if (!topic.trim() || selectedChannels.length === 0) return;

    // Clear draft on successful submit
    localStorage.removeItem(DRAFT_KEY);

    // Use pending edited previews if available
    const previews = editedPreviews || pendingEditedPreviews;

    await onSubmit({
      topic: topic.trim(),
      industry: industry.trim() || selectedTemplate?.industry?.join(', ') || undefined,
      contentGoal,
      contentAngle,
      channels: selectedChannels,
      brandTemplateId: brandTemplateId || undefined,
      brandVoiceVariantId: brandVoiceVariantId || undefined,
      editedPreviews: previews,
      topicHistoryId,
      contentPurpose,
      marketingFramework,
    });

    // Clear pending previews after submit
    setPendingEditedPreviews(undefined);
  };

  const handlePreviewConfirm = (editedPreviews?: EditedPreviews) => {
    setShowPreview(false);
    setPendingEditedPreviews(editedPreviews);
    
    // Trigger form submit with edited previews
    const form = document.querySelector('form');
    if (form) {
      // Create a synthetic event and submit
      const event = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    }
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
        <CardHeader className="p-3 xs:p-4 pb-2 xs:pb-4">
          <CardTitle className="text-sm xs:text-lg flex items-center gap-1.5 xs:gap-2">
            <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 text-primary" />
            Tạo nội dung đa kênh
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 xs:p-4 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-5">
            {/* Brand Template - First */}
            <div className="space-y-1.5 xs:space-y-2">
              <Label className="text-xs xs:text-sm">Brand Template</Label>
              <BrandTemplateCombobox
                value={brandTemplateId}
                onValueChange={setBrandTemplateId}
                options={templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  is_default: t.is_default,
                  primary_color: t.primary_color,
                }))}
                disabled={isLoading || loadingTemplates}
                placeholder={
                  loadingTemplates
                    ? "Đang tải..."
                    : templates.length === 0
                      ? "Chưa có template"
                      : "Chọn template..."
                }
              />
              {selectedTemplate && (
                <BrandAppliedInfo 
                  template={selectedTemplate} 
                  selectedChannels={selectedChannels}
                  industry={industry}
                />
              )}
              
              {/* A/B Testing Voice Variant Selector */}
              <BrandVoiceVariantSelector
                brandTemplateId={brandTemplateId || undefined}
                value={brandVoiceVariantId}
                onValueChange={(variantId) => setBrandVoiceVariantId(variantId)}
                disabled={isLoading}
              />
            </div>

            {/* Topic */}
            <div className="space-y-1.5 xs:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="topic" className="text-xs xs:text-sm">Chủ đề / Ý tưởng</Label>
                <div className="flex items-center gap-2">
                  {selectedTemplate?.industry_template_id && (
                    <GlossaryQuickLookup
                      industryTemplateId={selectedTemplate.industry_template_id}
                      onInsertTerm={(term) => {
                        const textarea = topicRef.current;
                        if (textarea) {
                          const cursorPos = textarea.selectionStart;
                          const before = topic.slice(0, cursorPos);
                          const after = topic.slice(cursorPos);
                          setTopic((before + term + after).slice(0, 500));
                          setTimeout(() => {
                            textarea.focus();
                            const newPos = cursorPos + term.length;
                            textarea.setSelectionRange(newPos, newPos);
                          }, 0);
                        } else {
                          setTopic((topic + ' ' + term).slice(0, 500));
                        }
                      }}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Book className="h-3 w-3" />
                          Từ điển
                        </Button>
                      }
                    />
                  )}
                  <span className="text-[10px] xs:text-xs text-muted-foreground">{topicLength}/500</span>
                </div>
              </div>
              <Textarea
                ref={topicRef}
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 500))}
                placeholder="Nhập chủ đề bạn muốn viết, VD: Skincare mùa hè, Mẹo tiết kiệm chi phí... hoặc mô tả ý tưởng để AI hỗ trợ"
                className="min-h-[80px] xs:min-h-[100px] resize-y text-sm xs:text-base"
                disabled={isLoading}
              />
              {topicWarning && (
                <p className="text-[10px] xs:text-xs text-amber-500 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  {topicWarning}
                </p>
              )}
              
              {/* Topic Suggestions - when topic is empty */}
              {!topic.trim() && (
                <TopicSuggestionPanel
                  suggestions={enhancedSuggestions}
                  source={suggestionsSource}
                  isLoading={suggestionsLoading}
                  onSelect={handleTopicSuggestion}
                  onRefresh={refreshSuggestions}
                  onSave={saveSuggestion}
                  onFeedback={submitFeedback}
                  disabled={isLoading}
                  showEnhancedInfo={true}
                  brandTemplateId={brandTemplateId || undefined}
                />
              )}

              {/* Topic Refinement - when topic has content >= 10 chars */}
              {topic.trim().length >= 10 && (
                <TopicRefinementSuggestions
                  refinedTopics={refinedTopics}
                  isLoading={isRefining}
                  isTyping={isTypingTopic}
                  elapsedMs={refinementElapsedMs}
                  onSelect={(refined) => setTopic(refined)}
                  onRefresh={refreshRefinement}
                  disabled={isLoading}
                />
              )}

              {/* Multi-Channel Hook Generator - when topic >= 10 chars and channels selected */}
              {topic.trim().length >= 10 && selectedChannels.length > 0 && (
                <MultiChannelHookGenerator
                  topic={topic}
                  channels={selectedChannels}
                  brandVoice={selectedTemplate ? {
                    brand_name: selectedTemplate.brand_name,
                    tone_of_voice: selectedTemplate.tone_of_voice || [],
                    formality_level: selectedTemplate.formality_level || undefined,
                  } : undefined}
                  onSelectHook={(hook) => {
                    // Prepend hook opening line to topic or use it as inspiration
                    const hookPrefix = `[${hook.hook_type}] `;
                    if (!topic.startsWith('[')) {
                      setTopic(hookPrefix + topic);
                    }
                  }}
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Industry (Optional) */}
            <div className="space-y-1.5 xs:space-y-2">
              <div className="flex items-center gap-1.5 xs:gap-2">
                <Label htmlFor="industry" className="text-xs xs:text-sm">Ngành nghề</Label>
                <span className="text-[10px] xs:text-xs text-muted-foreground">(tùy chọn)</span>
              </div>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={selectedTemplate?.industry?.join(', ') || 'VD: Tài chính, Bất động sản...'}
                disabled={isLoading}
                className="text-sm xs:text-base h-9 xs:h-10"
              />
              {selectedTemplate?.industry?.length && !industry && (
                <p className="text-[10px] xs:text-xs text-muted-foreground">
                  Sử dụng từ Brand Template: {selectedTemplate.industry.join(', ')}
                </p>
              )}
            </div>

            {/* Content Goal */}
            <div className="space-y-1.5 xs:space-y-2">
              <Label className="text-xs xs:text-sm">Mục tiêu nội dung</Label>
              <ContentGoalCombobox
                value={contentGoal}
                onValueChange={setContentGoal}
                disabled={isLoading}
              />
            </div>

            {/* Content Angle - Góc tiếp cận nội dung */}
            <ContentAngleSelector
              value={contentAngle}
              onValueChange={setContentAngle}
              disabled={isLoading}
            />

            {/* Quick Start Section - Show when topic is empty and no template selected */}
            {!topic.trim() && !selectedQuickStartTemplate && (
              <QuickStartSection
                contentGoal={contentGoal}
                onSelectTemplate={(template: QuickStartTemplate) => {
                  // Save selected template for showing suggestions
                  setSelectedQuickStartTemplate(template);
                  
                  // Set content purpose if available (for conversion templates)
                  if (template.contentPurpose) {
                    setContentPurpose(template.contentPurpose);
                  }
                  
                  // Set marketing framework if available
                  if (template.marketingFramework) {
                    setMarketingFramework(template.marketingFramework);
                  }
                  
                  // Expand advanced options for conversion goal
                  if (contentGoal === 'conversion') {
                    setShowAdvancedOptions(true);
                  }
                  
                  // Focus topic field for editing
                  setTimeout(() => topicRef.current?.focus(), 100);
                }}
                disabled={isLoading}
              />
            )}

            {/* Topic Suggestions - Show after Quick Start template is selected */}
            {selectedQuickStartTemplate && !topic.trim() && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    💡 Gợi ý topic cho "{selectedQuickStartTemplate.label}"
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedQuickStartTemplate(null)}
                  >
                    ← Chọn template khác
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getTopicSuggestionsForTemplate(
                    selectedQuickStartTemplate.id,
                    industry || selectedTemplate?.industry?.join(', ')
                  ).map((suggestion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors py-1.5 px-3"
                      onClick={() => {
                        setTopic(suggestion);
                        setTimeout(() => topicRef.current?.focus(), 100);
                      }}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                  {/* Show template placeholder as fallback */}
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors py-1.5 px-3"
                    onClick={() => {
                      setTopic(selectedQuickStartTemplate.suggestedTopicTemplate);
                      setTimeout(() => topicRef.current?.focus(), 100);
                    }}
                  >
                    ✨ {selectedQuickStartTemplate.suggestedTopicTemplate}
                  </Badge>
                </div>
              </div>
            )}

            {/* Advanced Options Toggle - Show for Conversion goal */}
            {contentGoal === 'conversion' && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tùy chọn bán hàng nâng cao
                  </span>
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                {showAdvancedOptions && (
                  <div className="space-y-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                    {/* Content Purpose */}
                    <div className="space-y-2">
                      <Label className="text-xs">Mục đích bán hàng</Label>
                      <ContentPurposeSelector
                        value={contentPurpose}
                        onValueChange={setContentPurpose}
                        selectedFramework={marketingFramework}
                        onFrameworkChange={setMarketingFramework}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Marketing Framework - show if no purpose selected */}
                    {!contentPurpose && (
                      <div className="space-y-2">
                        <Label className="text-xs">Marketing Framework (tùy chọn)</Label>
                        <MarketingFrameworkSelector
                          value={marketingFramework}
                          onValueChange={setMarketingFramework}
                          disabled={isLoading}
                          variant="inline"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Channels by Category */}
            <div className="space-y-2 xs:space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs xs:text-sm">Kênh xuất bản</Label>
                <Badge variant="secondary" className="text-[10px] xs:text-xs px-1.5 xs:px-2">
                  {selectedChannels.length}/{CHANNELS.length} kênh
                </Badge>
              </div>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-1.5 xs:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                  className="text-[10px] xs:text-xs h-6 xs:h-7 px-2"
                >
                  <CheckSquare className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
                  Tất cả
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isLoading}
                  className="text-[10px] xs:text-xs h-6 xs:h-7 px-2"
                >
                  <Square className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
                  Bỏ chọn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCategory('social')}
                  disabled={isLoading}
                  className="text-[10px] xs:text-xs h-6 xs:h-7 px-2"
                >
                  Social
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCategory('direct')}
                  disabled={isLoading}
                  className="text-[10px] xs:text-xs h-6 xs:h-7 px-2"
                >
                  Trực tiếp
                </Button>
              </div>

              {channelWarning && (
                <p className="text-[10px] xs:text-xs text-amber-500 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  {channelWarning}
                </p>
              )}

              {channelCategories.map((category) => (
                <div key={category.key} className="space-y-1.5 xs:space-y-2">
                  <p className="text-[10px] xs:text-xs text-muted-foreground font-medium">{category.name}</p>
                  <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                    {category.channels.map((channel) => (
                      <Tooltip key={channel.value}>
                        <TooltipTrigger asChild>
                          <label
                            className={`flex items-center gap-1.5 xs:gap-2 p-2 xs:p-2.5 rounded-lg border cursor-pointer transition-all ${
                              selectedChannels.includes(channel.value)
                                ? 'border-primary bg-primary/5'
                                : 'border-border/50 hover:border-border'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Checkbox
                              checked={selectedChannels.includes(channel.value)}
                              onCheckedChange={() => handleChannelToggle(channel.value)}
                              disabled={isLoading}
                              className="w-3.5 h-3.5 xs:w-4 xs:h-4"
                            />
                            <span className={channelColors[channel.value]}>
                              {channelIcons[channel.value]}
                            </span>
                            <span className="text-[11px] xs:text-sm truncate">{channel.label}</span>
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
              <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs text-muted-foreground">
                <Timer className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                <span>Ước tính: ~{estimatedTime} giây</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {/* Preview Button */}
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 xs:h-11 text-sm xs:text-base gap-1.5"
                disabled={isLoading || !topic.trim() || selectedChannels.length === 0}
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                <span className="hidden xs:inline">Preview</span>
              </Button>

              {/* Submit */}
              <Button
                type="submit"
                className="flex-[2] relative overflow-hidden group/btn transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 h-10 xs:h-11 text-sm xs:text-base"
                disabled={isLoading || !topic.trim() || selectedChannels.length === 0}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                {isLoading ? (
                  <span className="flex items-center animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5 xs:mr-2 animate-spin" />
                    <span className="text-xs xs:text-sm truncate max-w-[180px]">
                      {loadingPhases[loadingPhaseIndex]?.label || 'Đang tạo...'}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Sparkles className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5 xs:mr-2 transition-transform duration-300 group-hover/btn:rotate-12" />
                    <span className="text-xs xs:text-sm">Tạo ({selectedChannels.length} kênh)</span>
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Multi-Channel Preview Dialog */}
          <MultiChannelPreviewDialog
            open={showPreview}
            onOpenChange={setShowPreview}
            formData={{
              topic,
              industry: industry || selectedTemplate?.industry?.join(', '),
              contentGoal,
              channels: selectedChannels,
              brandTemplateId: brandTemplateId || undefined,
              brandName: selectedTemplate?.brand_name,
            }}
            onConfirm={handlePreviewConfirm}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
