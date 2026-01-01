import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Target,
  Layers,
  CheckCircle2,
  Timer,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  MessageCircle,
  Send,
  Music2,
  AtSign,
  CheckSquare,
  Square,
  Users,
  Package,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useTopicRefinement } from '@/hooks/useTopicRefinement';
import { TopicRefinementSuggestions } from '@/components/script/TopicRefinementSuggestions';
import { StepIndicator, Step } from '@/components/script/StepIndicator';
import { ContentAngleSelector } from '@/components/multichannel/ContentAngleSelector';
import { MultiChannelHookGenerator } from '@/components/multichannel/MultiChannelHookGenerator';
import { ContentGoalCombobox } from '@/components/ContentGoalCombobox';
import { ProductSelector } from '@/components/topic/ProductSelector';
import { PersonaSelector } from '@/components/multichannel/PersonaSelector';
import { CompactBrandSelector } from '@/components/multichannel/CompactBrandSelector';
import { JourneyStageSelector } from '@/components/multichannel/JourneyStageSelector';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { cn } from '@/lib/utils';
import { 
  MultiChannelFormData, 
  ContentGoal, 
  ContentAngle,
  Channel, 
  CHANNELS,
  CONTENT_GOALS,
} from '@/types/multichannel';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { JOURNEY_STAGE_CONFIG } from '@/types/journeyStageMessaging';

interface MultiChannelFormStepperProps {
  onSubmit: (data: MultiChannelFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  initialGoal?: ContentGoal;
  topicHistoryId?: string;
  initialContentPurpose?: ContentPurpose;
  initialMarketingFramework?: MarketingFramework;
  initialProductId?: string;
  initialPersonaId?: string;
}

// Reduced from 5 to 4 steps - Brand is now compact on Step 1
const STEPS: Step[] = [
  { id: 1, title: 'Chủ đề', icon: <FileText className="w-4 h-4" /> },
  { id: 2, title: 'Nhắm mục tiêu', icon: <Target className="w-4 h-4" /> },
  { id: 3, title: 'Kênh', icon: <Layers className="w-4 h-4" /> },
  { id: 4, title: 'Tạo', icon: <CheckCircle2 className="w-4 h-4" /> },
];

const LOADING_PHASES = [
  'Đang phân tích chủ đề...',
  'Đang tải ngữ cảnh thương hiệu...',
  'Đang tạo nội dung...',
  'Đang tối ưu hashtags...',
  'Hoàn thiện nội dung...',
];

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
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

const MAX_TOPIC_LENGTH = 500;

export function MultiChannelFormStepper({ 
  onSubmit, 
  isLoading, 
  initialTopic, 
  initialGoal,
  topicHistoryId,
  initialContentPurpose,
  initialMarketingFramework,
  initialProductId,
  initialPersonaId,
}: MultiChannelFormStepperProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);

  const [formData, setFormData] = useState<MultiChannelFormData>({
    topic: initialTopic || '',
    contentGoal: initialGoal || 'education',
    contentAngle: undefined,
    channels: ['facebook', 'instagram'],
    brandTemplateId: undefined,
    brandVoiceVariantId: undefined,
    productId: initialProductId,
    personaId: initialPersonaId,
    contentPurpose: initialContentPurpose,
    marketingFramework: initialMarketingFramework,
    journeyStage: undefined,
  });

  // Handle initialTopic prop changes
  useEffect(() => {
    if (initialTopic) {
      setFormData(prev => ({ ...prev, topic: initialTopic }));
    }
  }, [initialTopic]);

  useEffect(() => {
    if (initialGoal) {
      setFormData(prev => ({ ...prev, contentGoal: initialGoal }));
    }
  }, [initialGoal]);

  const selectedTemplate = templates.find((t) => t.id === formData.brandTemplateId);

  // Auto-select default template
  useEffect(() => {
    if (templatesLoading || templates.length === 0 || formData.brandTemplateId) return;
    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    if (defaultTemplate) {
      setFormData(prev => ({ ...prev, brandTemplateId: defaultTemplate.id }));
    }
  }, [templatesLoading, templates, formData.brandTemplateId]);

  // Topic Refinement - enabled on Step 1 now
  const {
    refinedTopics,
    isLoading: isLoadingRefinement,
    isTyping: isTypingTopic,
    refresh: refreshRefinement,
  } = useTopicRefinement({
    rawTopic: formData.topic,
    brandTemplateId: formData.brandTemplateId,
    enabled: currentStep === 1 && formData.topic.trim().length >= 10,
  });

  // Loading phases
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhase((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Estimated time
  const estimatedTime = useMemo(() => {
    const baseTime = 10;
    const perChannelTime = 5;
    return baseTime + (formData.channels.length * perChannelTime);
  }, [formData.channels.length]);

  // Updated canProceed for 4 steps
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return formData.topic.trim().length >= 10 && !!formData.brandTemplateId;
      case 2:
        return true; // Goal always has default
      case 3:
        return formData.channels.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleNext = () => {
    if (currentStep < 4 && canProceed) {
      setCompletedSteps(prev => [...prev.filter(s => s !== currentStep), currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  const handleChannelToggle = (channel: Channel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSelectAll = () => {
    setFormData(prev => ({ ...prev, channels: CHANNELS.map(c => c.value) }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, channels: [] }));
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim() || formData.channels.length === 0) {
      toast.error('Vui lòng nhập chủ đề và chọn ít nhất 1 kênh');
      return;
    }
    await onSubmit({ ...formData, topicHistoryId });
  };

  // Group channels by category
  const channelCategories = [
    { name: 'Nền tảng nội dung', key: 'content', channels: CHANNELS.filter(c => c.category === 'content') },
    { name: 'Mạng xã hội', key: 'social', channels: CHANNELS.filter(c => c.category === 'social') },
    { name: 'Kênh trực tiếp', key: 'direct', channels: CHANNELS.filter(c => c.category === 'direct') },
    { name: 'Địa phương', key: 'local', channels: CHANNELS.filter(c => c.category === 'local') },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg glow-primary animate-pulse-glow">
            <Wand2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Tạo nội dung đa kênh</h2>
            <p className="text-sm text-muted-foreground">
              Làm theo các bước để tạo nội dung chuyên nghiệp
            </p>
          </div>
        </div>

        {/* Brand Selector - Always visible in header */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <CompactBrandSelector
              templates={templates}
              isLoading={templatesLoading}
              disabled={isLoading}
              selectedTemplateId={formData.brandTemplateId}
              selectedVoiceVariantId={formData.brandVoiceVariantId}
              onTemplateChange={(templateId) => setFormData(prev => ({ ...prev, brandTemplateId: templateId }))}
              onVoiceVariantChange={(variantId) => setFormData(prev => ({ ...prev, brandVoiceVariantId: variantId }))}
            />
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Topic Input */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Topic Input - Main focus */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
                    Chủ đề / Ý tưởng
                    <span className="text-primary">*</span>
                  </Label>
                  <span className={cn(
                    "text-xs",
                    formData.topic.length < 10 ? 'text-amber-500' : 'text-muted-foreground'
                  )}>
                    {formData.topic.length}/{MAX_TOPIC_LENGTH}
                  </span>
                </div>

                <Textarea
                  ref={topicTextareaRef}
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                  }))}
                  placeholder="VD: Cách tối ưu thuế cho doanh nghiệp nhỏ trong năm 2024"
                  className="min-h-[120px] resize-y text-sm"
                  disabled={isLoading}
                  autoFocus
                />

                {formData.topic.length > 0 && formData.topic.length < 10 && (
                  <p className="text-xs text-amber-500">
                    Chủ đề nên có ít nhất 10 ký tự
                  </p>
                )}

                {/* Brainstorm with AI Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBrainstormSheet(true)}
                  className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
                  disabled={isLoading}
                >
                  <MessageSquare className="w-4 h-4" />
                  Brainstorm với AI
                </Button>

                {/* Topic Refinement */}
                {formData.topic.trim().length >= 10 && (
                  <TopicRefinementSuggestions
                    refinedTopics={refinedTopics}
                    isLoading={isLoadingRefinement}
                    isTyping={isTypingTopic}
                    onSelect={(refined) => setFormData(prev => ({ ...prev, topic: refined }))}
                    onRefresh={refreshRefinement}
                    disabled={isLoading}
                  />
                )}

                {/* Hook Generator */}
                {formData.topic.trim().length >= 10 && formData.channels.length > 0 && (
                  <MultiChannelHookGenerator
                    topic={formData.topic}
                    channels={formData.channels}
                    brandVoice={selectedTemplate ? {
                      brand_name: selectedTemplate.brand_name,
                      tone_of_voice: selectedTemplate.tone_of_voice || [],
                      formality_level: selectedTemplate.formality_level || undefined,
                    } : undefined}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Targeting - Product/Persona + Goal + Angle + Journey */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              {/* Product/Persona Targeting */}
              {formData.brandTemplateId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Nhắm đối tượng (tùy chọn)</span>
                  </div>
                  
                  {/* Product Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Sản phẩm/Dịch vụ
                    </Label>
                    <ProductSelector
                      brandTemplateId={formData.brandTemplateId}
                      value={formData.productId}
                      onValueChange={(productId) => setFormData(prev => ({ ...prev, productId }))}
                      disabled={isLoading}
                      placeholder="Chọn sản phẩm để tập trung..."
                    />
                  </div>

                  {/* Persona Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Persona mục tiêu
                    </Label>
                    <PersonaSelector
                      brandTemplateId={formData.brandTemplateId}
                      value={formData.personaId}
                      onValueChange={(personaId) => setFormData(prev => ({ ...prev, personaId }))}
                      disabled={isLoading}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground/80 italic">
                    Chọn sản phẩm/persona để AI tạo nội dung targeted hơn
                  </p>
                </div>
              )}

              <Separator />

              {/* Content Goal */}
              <div className="space-y-3">
                <Label className="text-foreground font-semibold text-sm">
                  Mục tiêu nội dung
                </Label>
                <ContentGoalCombobox
                  value={formData.contentGoal}
                  onValueChange={(goal) => setFormData(prev => ({ ...prev, contentGoal: goal }))}
                  disabled={isLoading}
                />
              </div>

              {/* Content Angle */}
              <ContentAngleSelector
                value={formData.contentAngle}
                onValueChange={(angle) => setFormData(prev => ({ ...prev, contentAngle: angle }))}
                disabled={isLoading}
              />

              {/* Journey Stage Selector - only show when product or persona is selected */}
              {(formData.productId || formData.personaId) && (
                <div className="pt-2">
                  <Separator className="mb-4" />
                  <JourneyStageSelector
                    value={formData.journeyStage}
                    onValueChange={(stage) => setFormData(prev => ({ ...prev, journeyStage: stage }))}
                    disabled={isLoading}
                    showEmotionalTone={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Channel Selection */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-semibold text-sm">Kênh xuất bản</Label>
                <Badge variant="secondary" className="text-xs">
                  {formData.channels.length}/{CHANNELS.length} kênh
                </Badge>
              </div>

              {/* Quick Select */}
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
                  Tất cả
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
              </div>

              {/* Channel Grid by Category */}
              {channelCategories.map((category) => (
                <div key={category.key} className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.channels.map((channel) => (
                      <Tooltip key={channel.value}>
                        <TooltipTrigger asChild>
                          <label
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                              formData.channels.includes(channel.value)
                                ? 'border-primary bg-primary/5'
                                : 'border-border/50 hover:border-border',
                              isLoading && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <Checkbox
                              checked={formData.channels.includes(channel.value)}
                              onCheckedChange={() => handleChannelToggle(channel.value)}
                              disabled={isLoading}
                              className="w-4 h-4"
                            />
                            <span className="text-primary">
                              {channelIcons[channel.value]}
                            </span>
                            <span className="text-sm truncate">{channel.label}</span>
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

              {/* Estimated Time */}
              {formData.channels.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Ước tính: ~{estimatedTime} giây</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Sẵn sàng tạo nội dung!</h3>
                <p className="text-sm text-muted-foreground">Xem lại thông tin trước khi tạo</p>
              </div>

              {/* Summary */}
              <Card className="border-border">
                <CardContent className="p-4 space-y-3">
                  {selectedTemplate && (
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Thương hiệu</p>
                        <p className="text-sm font-medium">{selectedTemplate.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Chủ đề</p>
                      <p className="text-sm font-medium">{formData.topic}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Mục tiêu</p>
                      <p className="text-sm">
                        {CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label}
                        {formData.contentAngle && (
                          <span className="text-muted-foreground"> • {formData.contentAngle}</span>
                        )}
                        {formData.journeyStage && (
                          <span className="text-muted-foreground"> • {JOURNEY_STAGE_CONFIG[formData.journeyStage].label}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Kênh ({formData.channels.length})</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.channels.slice(0, 5).map(ch => (
                          <Badge key={ch} variant="outline" className="text-[10px] px-1.5">
                            {CHANNELS.find(c => c.value === ch)?.label}
                          </Badge>
                        ))}
                        {formData.channels.length > 5 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            +{formData.channels.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || isLoading}
              className="gap-2 gradient-primary glow-primary"
            >
              Tiếp tục
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !formData.topic.trim() || formData.channels.length === 0}
              className={cn(
                "gap-2 gradient-primary min-w-[180px]",
                !isLoading && "glow-primary"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="animate-pulse">{LOADING_PHASES[loadingPhase]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Tạo ({formData.channels.length} kênh)
                </>
              )}
            </Button>
          )}
        </div>

        {/* Estimated time hint */}
        {currentStep === 4 && !isLoading && (
          <p className="text-center text-xs text-muted-foreground">
            Thời gian ước tính: ~{estimatedTime} giây
          </p>
        )}
      </div>
      {/* Topic Brainstorm Sheet */}
      <TopicBrainstormSheet
        open={showBrainstormSheet}
        onOpenChange={setShowBrainstormSheet}
        brandTemplateId={formData.brandTemplateId}
        contentGoal={formData.contentGoal}
        onSelectTopic={(topic) => {
          setFormData(prev => ({ ...prev, topic }));
          toast.success('Đã chọn chủ đề từ AI!');
        }}
      />
    </TooltipProvider>
  );
}
