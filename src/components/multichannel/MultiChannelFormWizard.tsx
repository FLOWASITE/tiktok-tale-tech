import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  Loader2, 
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
  Crosshair,
  Compass,
  Rocket,
  ChevronDown,
  X,
  Settings2,
  Phone,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTopicRefinement } from '@/hooks/useTopicRefinement';
import { useCompliancePrecheck, type ComplianceIssue } from '@/hooks/useCompliancePrecheck';
import { TopicRefinementSuggestions } from '@/components/script/TopicRefinementSuggestions';
import { StepIndicator, Step } from '@/components/script/StepIndicator';
import { ContentAngleSelector } from '@/components/multichannel/ContentAngleSelector';
import { MultiChannelHookGenerator } from '@/components/multichannel/MultiChannelHookGenerator';
import { QualityModeQuickSelector } from '@/components/multichannel/QualityModeQuickSelector';
import { ProductSelector } from '@/components/topic/ProductSelector';
import { PersonaSelector } from '@/components/multichannel/PersonaSelector';
import { JourneyStageSelector } from '@/components/multichannel/JourneyStageSelector';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { ComplianceWarningBadge } from '@/components/multichannel/ComplianceWarningBadge';
import { cn } from '@/lib/utils';
import { 
  MultiChannelFormData, 
  MultiChannelSelectedHook,
  ContentGoal, 
  ContentAngle,
  Channel, 
  CHANNELS,
  CONTENT_GOALS,
  JOURNEY_TO_GOAL_MAP,
  JOURNEY_TO_ANGLE_MAP,
  AiSuggestionContext,
  QualityMode,
  QUALITY_MODES,
} from '@/types/multichannel';
import { MultiChannelHook } from '@/hooks/useMultiChannelHooks';
import { JourneyStage } from '@/types/customerPersona';
import { JOURNEY_STAGE_CONFIG } from '@/types/journeyStageMessaging';

interface BrandTemplate {
  id: string;
  name: string;
  brand_name: string;
  tone_of_voice?: string[];
  formality_level?: string;
  channel_overrides?: Record<string, unknown>;
}

interface MultiChannelFormWizardProps {
  brandTemplateId?: string;
  brandTemplate?: BrandTemplate | null;
  voiceVariantId?: string;
  organizationId?: string;
  initialData?: Partial<MultiChannelFormData>;
  topicHistoryId?: string;
  isGenerating: boolean;
  onFormDataChange?: (data: Partial<MultiChannelFormData>) => void;
  onGenerate: (data: MultiChannelFormData) => Promise<void>;
}

const STEPS: Step[] = [
  { id: 1, title: 'Chủ đề', icon: <FileText className="w-4 h-4" /> },
  { id: 2, title: 'Nhắm mục tiêu', icon: <Target className="w-4 h-4" /> },
  { id: 3, title: 'Kênh', icon: <Layers className="w-4 h-4" /> },
  { id: 4, title: 'Tạo', icon: <CheckCircle2 className="w-4 h-4" /> },
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

export function MultiChannelFormWizard({ 
  brandTemplateId,
  brandTemplate,
  voiceVariantId,
  organizationId,
  initialData,
  topicHistoryId,
  isGenerating,
  onFormDataChange,
  onGenerate,
}: MultiChannelFormWizardProps) {
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);

  const [formData, setFormData] = useState<MultiChannelFormData>({
    topic: initialData?.topic || '',
    contentGoal: initialData?.contentGoal,
    contentAngle: initialData?.contentAngle,
    channels: initialData?.channels || ['facebook', 'instagram'],
    brandTemplateId: brandTemplateId,
    brandVoiceVariantId: voiceVariantId,
    productId: initialData?.productId,
    personaId: initialData?.personaId,
    contentPurpose: initialData?.contentPurpose,
    marketingFramework: initialData?.marketingFramework,
    journeyStage: initialData?.journeyStage,
    campaignId: initialData?.campaignId,
    qualityMode: initialData?.qualityMode || 'balanced',
    includeFooterInfo: initialData?.includeFooterInfo !== false, // Default: true
    selectedHooks: initialData?.selectedHooks || [],
    globalHook: initialData?.globalHook,
  });

  // Sync brand template
  useEffect(() => {
    if (brandTemplateId) {
      setFormData(prev => ({ ...prev, brandTemplateId }));
    }
  }, [brandTemplateId]);

  useEffect(() => {
    if (voiceVariantId) {
      setFormData(prev => ({ ...prev, brandVoiceVariantId: voiceVariantId }));
    }
  }, [voiceVariantId]);

  // Notify parent of form data changes - use ref to avoid infinite loops
  const onFormDataChangeRef = useRef(onFormDataChange);
  onFormDataChangeRef.current = onFormDataChange;
  
  useEffect(() => {
    onFormDataChangeRef.current?.(formData);
  }, [formData]);

  // Auto-derive contentGoal from journeyStage
  useEffect(() => {
    if (formData.journeyStage) {
      const derivedGoal = JOURNEY_TO_GOAL_MAP[formData.journeyStage];
      const suggestedAngle = !formData.contentAngle && !formData.aiSuggestion?.suggestedContentAngle
        ? JOURNEY_TO_ANGLE_MAP[formData.journeyStage]
        : undefined;
      
      setFormData(prev => ({ 
        ...prev, 
        contentGoal: derivedGoal,
        contentAngle: suggestedAngle || prev.contentAngle,
      }));
    }
  }, [formData.journeyStage]);

  // Topic Refinement
  const {
    refinedTopics,
    isLoading: isLoadingRefinement,
    isTyping: isTypingTopic,
    refresh: refreshRefinement,
    elapsedMs: refinementElapsedMs,
  } = useTopicRefinement({
    rawTopic: formData.topic,
    brandTemplateId: formData.brandTemplateId,
    enabled: currentStep === 1 && formData.topic.trim().length >= 10,
  });

  // Compliance Pre-check - real-time validation of topic
  // IMPORTANT: memoize options to avoid recreating callbacks every render (prevents update-depth loop)
  const complianceOptions = useMemo(() => ({
    industryForbiddenTerms: [], // Will be populated from brand template
    brandForbiddenWords: [],
  }), []);

  const {
    quickCheck,
    fullCheck,
    suggestCompliantTopic,
    isChecking: isCheckingCompliance,
    lastResult: complianceResult,
  } = useCompliancePrecheck(complianceOptions);

  // Run quick compliance check when topic changes
  const [complianceCheckResult, setComplianceCheckResult] = useState<ReturnType<typeof fullCheck> | null>(null);
  
  useEffect(() => {
    if (formData.topic.trim().length >= 10) {
      const result = fullCheck(formData.topic);
      setComplianceCheckResult(result);
    } else {
      setComplianceCheckResult(null);
    }
  }, [formData.topic, fullCheck]);

  const handleSuggestCompliant = async () => {
    if (!complianceCheckResult || complianceCheckResult.issues.length === 0) return;
    const suggested = await suggestCompliantTopic(formData.topic, complianceCheckResult.issues);
    if (suggested) {
      setFormData(prev => ({ ...prev, topic: suggested }));
    }
  };

  // Estimated time
  const estimatedTime = useMemo(() => {
    const baseTime = 10;
    const perChannelTime = 5;
    return baseTime + (formData.channels.length * perChannelTime);
  }, [formData.channels.length]);

  // Can proceed
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return formData.topic.trim().length >= 10 && !!formData.brandTemplateId;
      case 2:
        return true;
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

  // Hook selection handlers
  const handleSelectHook = (hook: MultiChannelHook) => {
    setFormData(prev => {
      const existingIndex = (prev.selectedHooks || []).findIndex(
        h => h.channel === hook.channel
      );
      
      let newSelectedHooks: MultiChannelSelectedHook[];
      
      if (existingIndex >= 0) {
        // Replace existing hook for this channel
        newSelectedHooks = [...(prev.selectedHooks || [])];
        newSelectedHooks[existingIndex] = {
          channel: hook.channel,
          opening_line: hook.opening_line,
          hook_type: hook.hook_type,
          psychology: hook.psychology,
        };
      } else {
        // Add new hook
        newSelectedHooks = [
          ...(prev.selectedHooks || []),
          {
            channel: hook.channel,
            opening_line: hook.opening_line,
            hook_type: hook.hook_type,
            psychology: hook.psychology,
          }
        ];
      }
      
      return { ...prev, selectedHooks: newSelectedHooks };
    });
    
    toast.success(`Đã chọn hook cho ${CHANNELS.find(c => c.value === hook.channel)?.label || hook.channel}`);
  };

  const handleRemoveHook = (channel: Channel) => {
    setFormData(prev => ({
      ...prev,
      selectedHooks: (prev.selectedHooks || []).filter(h => h.channel !== channel),
    }));
  };

  const handleClearAllHooks = () => {
    setFormData(prev => ({
      ...prev,
      selectedHooks: [],
      globalHook: undefined,
    }));
  };

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current || isGenerating) return;
    submittingRef.current = true;

    if (!formData.topic.trim() || formData.channels.length === 0) {
      submittingRef.current = false;
      toast.error('Vui lòng nhập chủ đề và chọn ít nhất 1 kênh');
      return;
    }

    try {
      await onGenerate({ ...formData, topicHistoryId });
    } finally {
      submittingRef.current = false;
    }
  };

  // Channel categories
  const channelCategories = [
    { name: 'Nền tảng nội dung', key: 'content', channels: CHANNELS.filter(c => c.category === 'content') },
    { name: 'Mạng xã hội', key: 'social', channels: CHANNELS.filter(c => c.category === 'social') },
    { name: 'Kênh trực tiếp', key: 'direct', channels: CHANNELS.filter(c => c.category === 'direct') },
    { name: 'Địa phương', key: 'local', channels: CHANNELS.filter(c => c.category === 'local') },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Step Indicator - Larger on Desktop */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Step Content */}
        <div className="min-h-[350px]">
          {/* Step 1: Topic Input */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
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
                  className="min-h-[140px] resize-y text-sm"
                  disabled={isGenerating}
                  autoFocus
                />

                {formData.topic.length > 0 && formData.topic.length < 10 && (
                  <p className="text-xs text-amber-500">
                    Chủ đề nên có ít nhất 10 ký tự
                  </p>
                )}

                {/* Compliance Warning Badge */}
                {formData.topic.trim().length >= 10 && complianceCheckResult && (
                  <ComplianceWarningBadge
                    result={complianceCheckResult}
                    onSuggestCompliant={handleSuggestCompliant}
                    isSuggesting={isCheckingCompliance}
                  />
                )}

                {/* Brainstorm with AI Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBrainstormSheet(true)}
                  className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
                  disabled={isGenerating}
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
                    elapsedMs={refinementElapsedMs}
                    onSelect={(refined, suggestion) => {
                      const aiSuggestion: AiSuggestionContext | undefined = suggestion ? {
                        targetPersona: suggestion.targetPersona,
                        targetPersonaId: suggestion.targetPersonaId,
                        productFit: suggestion.productFit,
                        productFitId: suggestion.productFitId,
                        suggestedJourneyStage: suggestion.suggestedJourneyStage,
                        suggestedContentAngle: suggestion.suggestedContentAngle,
                        hook: suggestion.hook,
                        angle: suggestion.angle,
                      } : undefined;
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        topic: refined,
                        productId: suggestion?.productFitId || prev.productId,
                        personaId: suggestion?.targetPersonaId || prev.personaId,
                        journeyStage: suggestion?.suggestedJourneyStage || prev.journeyStage,
                        contentAngle: (suggestion?.suggestedContentAngle as ContentAngle) || prev.contentAngle,
                        aiSuggestion,
                      }));
                    }}
                    onRefresh={refreshRefinement}
                    disabled={isGenerating}
                  />
                )}

                {/* Hook Generator - moved to Step 3 after channel selection */}

                {/* Selected Hooks Display */}
                {formData.selectedHooks && formData.selectedHooks.length > 0 && (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">Hooks đã chọn</span>
                          <Badge variant="secondary" className="text-xs">
                            {formData.selectedHooks.length}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={handleClearAllHooks}
                          disabled={isGenerating}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Xóa tất cả
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {formData.selectedHooks.map((hook) => {
                          const channelInfo = CHANNELS.find(c => c.value === hook.channel);
                          return (
                            <div 
                              key={hook.channel}
                              className="flex items-start gap-3 p-2 rounded-lg bg-background/50 group"
                            >
                              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                {channelIcons[hook.channel]}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">{channelInfo?.label}</span>
                                  {hook.hook_type && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                      {hook.hook_type}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  "{hook.opening_line}"
                                </p>
                              </div>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveHook(hook.channel)}
                                disabled={isGenerating}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Targeting */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Targeting Card */}
              {formData.brandTemplateId && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Crosshair className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Nhắm đối tượng</h3>
                        <p className="text-xs text-muted-foreground">Sản phẩm & Persona mục tiêu</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          Sản phẩm/Dịch vụ
                        </Label>
                        <ProductSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.productId}
                          onValueChange={(productId) => setFormData(prev => ({ ...prev, productId }))}
                          disabled={isGenerating}
                          placeholder="Chọn sản phẩm..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Persona mục tiêu
                        </Label>
                        <PersonaSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.personaId}
                          onValueChange={(personaId) => setFormData(prev => ({ ...prev, personaId }))}
                          disabled={isGenerating}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Angle */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Compass className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Góc tiếp cận nội dung</h3>
                      <p className="text-xs text-muted-foreground">Cách triển khai chủ đề</p>
                    </div>
                  </div>

                  <ContentAngleSelector
                    value={formData.contentAngle}
                    onValueChange={(angle) => setFormData(prev => ({ ...prev, contentAngle: angle }))}
                    disabled={isGenerating}
                  />
                </CardContent>
              </Card>

              {/* Journey Stage - Collapsible */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">Giai đoạn hành trình</h3>
                            <Badge variant="outline" className="text-[10px]">Nâng cao</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Điều chỉnh messaging theo phễu</p>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 pb-5">
                      <Separator className="mb-4" />
                      <JourneyStageSelector
                        value={formData.journeyStage}
                        onValueChange={(stage) => setFormData(prev => ({ ...prev, journeyStage: stage }))}
                        disabled={isGenerating}
                        showEmotionalTone={true}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          {/* Step 3: Channel Selection */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Kênh xuất bản
                </Label>
                <Badge variant="secondary">
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
                  disabled={isGenerating}
                  className="text-xs h-8"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  Tất cả
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={isGenerating}
                  className="text-xs h-8"
                >
                  <Square className="w-3.5 h-3.5 mr-1.5" />
                  Bỏ chọn
                </Button>
              </div>

              {/* Channel Grid - 3 columns on Desktop */}
              {channelCategories.map((category) => (
                <div key={category.key} className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {category.channels.map((channel) => {
                      const hasOverride = brandTemplate?.channel_overrides && 
                        Object.keys(brandTemplate.channel_overrides).includes(channel.value);
                      return (
                        <Tooltip key={channel.value}>
                          <TooltipTrigger asChild>
                            <label
                              className={cn(
                                "flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all",
                                formData.channels.includes(channel.value)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border/50 hover:border-border',
                                isGenerating && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <Checkbox
                                checked={formData.channels.includes(channel.value)}
                                onCheckedChange={() => handleChannelToggle(channel.value)}
                                disabled={isGenerating}
                                className="w-4 h-4"
                              />
                              <span className="text-primary">
                                {channelIcons[channel.value]}
                              </span>
                              <span className="text-sm truncate flex-1">{channel.label}</span>
                              {hasOverride && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                                  <Settings2 className="w-2.5 h-2.5 mr-0.5" />
                                </Badge>
                              )}
                            </label>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs">{channel.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quality Mode Selector */}
              <QualityModeQuickSelector
                value={formData.qualityMode || 'balanced'}
                onChange={(mode) => setFormData(prev => ({ ...prev, qualityMode: mode }))}
                disabled={isGenerating}
                brandTemplateId={brandTemplateId}
                selectedChannels={formData.channels}
                showBrandHints={true}
              />

              {/* Hook Generator - only show after channels selected */}
              {formData.topic.trim().length >= 10 && formData.channels.length > 0 && (
                <MultiChannelHookGenerator
                  topic={formData.topic}
                  channels={formData.channels}
                  organizationId={organizationId}
                  brandTemplateId={brandTemplateId}
                  brandVoice={brandTemplate ? {
                    brand_name: brandTemplate.brand_name,
                    tone_of_voice: brandTemplate.tone_of_voice || [],
                    formality_level: brandTemplate.formality_level || undefined,
                  } : undefined}
                  onSelectHook={handleSelectHook}
                  disabled={isGenerating}
                />
              )}

              {/* Footer Info Option */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Thông tin liên hệ (Footer)</h3>
                        <p className="text-xs text-muted-foreground">Tự động thêm hotline, email, website vào cuối bài</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {brandTemplateId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-primary"
                              asChild
                            >
                              <Link to="/brands/new" state={{ editTemplate: { id: brandTemplateId }, focusFooterInfo: true }}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Sửa
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Chỉnh sửa thông tin liên hệ của thương hiệu</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Checkbox
                        id="includeFooterInfo"
                        checked={formData.includeFooterInfo !== false}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, includeFooterInfo: checked as boolean }))
                        }
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estimated Time */}
              {formData.channels.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>
                    Ước tính: ~{formData.qualityMode === 'fast' 
                      ? Math.round(estimatedTime * 0.6) 
                      : formData.qualityMode === 'quality' 
                        ? Math.round(estimatedTime * 1.3) 
                        : estimatedTime} giây
                    {formData.qualityMode === 'fast' && <Badge variant="outline" className="ml-2 text-[10px]">Nhanh hơn 40%</Badge>}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-xl text-foreground">Sẵn sàng tạo nội dung!</h3>
                <p className="text-muted-foreground">Xem lại thông tin trước khi tạo</p>
              </div>

              {/* Summary Card */}
              <Card className="border-border">
                <CardContent className="p-5 space-y-4">
                  {brandTemplate && (
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Thương hiệu</p>
                        <p className="font-medium">{brandTemplate.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Chủ đề</p>
                      <p className="font-medium line-clamp-2">{formData.topic}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Mục tiêu</p>
                      <p>
                        {CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label || 'Mặc định'}
                        {formData.contentAngle && (
                          <span className="text-muted-foreground"> • {formData.contentAngle}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Kênh ({formData.channels.length})</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {formData.channels.slice(0, 6).map(ch => (
                          <Badge key={ch} variant="outline" className="text-xs">
                            {CHANNELS.find(c => c.value === ch)?.label}
                          </Badge>
                        ))}
                        {formData.channels.length > 6 && (
                          <Badge variant="secondary" className="text-xs">
                            +{formData.channels.length - 6}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="text-center text-sm text-muted-foreground">
                <Timer className="w-4 h-4 inline mr-1" />
                Thời gian ước tính: ~{estimatedTime} giây
              </p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 border-t border-border mt-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isGenerating}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentStep}/4</span>
            </div>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isGenerating}
                className="gap-2 gradient-primary glow-primary"
              >
                Tiếp tục
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isGenerating || !formData.topic.trim() || formData.channels.length === 0}
                className={cn(
                  "gap-2 gradient-primary min-w-[180px]",
                  !isGenerating && "glow-primary"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo...
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
        </div>

        {/* Brainstorm Sheet */}
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
      </div>
    </TooltipProvider>
  );
}
