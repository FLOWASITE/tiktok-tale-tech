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
  Crosshair,
  Compass,
  Rocket,
  ChevronDown,
  X,
  Star,
  Settings2,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useTopicRefinement, RefinedTopic } from '@/hooks/useTopicRefinement';
import { TopicRefinementSuggestions } from '@/components/script/TopicRefinementSuggestions';
import { StepIndicator, Step } from '@/components/script/StepIndicator';
import { ContentAngleSelector } from '@/components/multichannel/ContentAngleSelector';
import { MultiChannelHookGenerator } from '@/components/multichannel/MultiChannelHookGenerator';
// ContentGoalCombobox removed - auto-derive from journeyStage
import { ProductSelector } from '@/components/topic/ProductSelector';
import { PersonaSelector } from '@/components/multichannel/PersonaSelector';
import { CompactBrandSelector } from '@/components/multichannel/CompactBrandSelector';
import { JourneyStageSelector } from '@/components/multichannel/JourneyStageSelector';
import { TopicIdeaHub } from '@/components/topic/TopicIdeaHub';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { TopicContextBar } from '@/components/multichannel/TopicContextBar';
import { AIGenerationProgress } from '@/components/multichannel/AIGenerationProgress';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { cn } from '@/lib/utils';
import { 
  MultiChannelFormData, 
  ContentGoal, 
  ContentAngle,
  Channel, 
  CHANNELS,
  CONTENT_GOALS,
  JOURNEY_TO_GOAL_MAP,
  JOURNEY_TO_ANGLE_MAP,
  AiSuggestionContext,
} from '@/types/multichannel';
import { JourneyStage } from '@/types/customerPersona';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { JOURNEY_STAGE_CONFIG } from '@/types/journeyStageMessaging';

interface ChannelContentPreview {
  channel: string;
  preview: string;
  fullContent?: string;
  wordCount: number;
  isStreaming?: boolean;
}

interface StreamingTextChunk {
  channel: string;
  text: string;
  isComplete: boolean;
}

interface ProgressEvent {
  type: 'progress' | 'result' | 'error' | 'streaming_text';
  step?: string;
  progress?: number;
  message?: string;
  currentChannel?: string;
  completedChannels?: string[];
  totalChannels?: string[];
  channelContents?: ChannelContentPreview[];
  streamingChunk?: StreamingTextChunk;
}

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
  /** Elapsed time in ms from parent (for synchronized progress display) */
  generationElapsedMs?: number;
  /** SSE progress events from streaming generation */
  sseProgress?: ProgressEvent | null;
  /** Streaming text content per channel for typewriter effect */
  streamingTexts?: Record<string, string>;
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

const MAX_TOPIC_LENGTH = 300;

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
  generationElapsedMs: externalElapsedMs,
  sseProgress,
  streamingTexts,
}: MultiChannelFormStepperProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const topicInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  const [uiLoading, setUiLoading] = useState(false);
  const uiLoadingStartedAtRef = useRef<number | null>(null);

  const effectiveLoading = isLoading || uiLoading;
  // Use external elapsed if provided, otherwise internal
  const generationElapsedMs = externalElapsedMs ?? internalElapsedMs;

  const [formData, setFormData] = useState<MultiChannelFormData>({
    topic: typeof initialTopic === 'string' ? initialTopic : '',
    contentGoal: undefined, // Will be auto-derived from journeyStage
    contentAngle: undefined,
    channels: ['facebook', 'instagram'],
    brandTemplateId: undefined,
    brandVoiceVariantId: undefined,
    productId: initialProductId,
    personaId: initialPersonaId,
    contentPurpose: initialContentPurpose,
    marketingFramework: initialMarketingFramework,
    journeyStage: undefined,
    campaignId: undefined,
  });

  // Handle initialTopic prop changes
  useEffect(() => {
    if (initialTopic !== undefined) {
      setFormData((prev) => ({
        ...prev,
        topic: typeof initialTopic === 'string' ? initialTopic : '',
      }));
    }
  }, [initialTopic]);

  useEffect(() => {
    if (initialGoal) {
      setFormData(prev => ({ ...prev, contentGoal: initialGoal }));
    }
  }, [initialGoal]);

  // Auto-derive contentGoal from journeyStage + suggest contentAngle
  useEffect(() => {
    if (formData.journeyStage) {
      const derivedGoal = JOURNEY_TO_GOAL_MAP[formData.journeyStage];
      // Only auto-suggest angle if not already set by AI or user
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

  const selectedTemplate = templates.find((t) => t.id === formData.brandTemplateId);

  // Auto-select default template
  useEffect(() => {
    if (templatesLoading || templates.length === 0 || formData.brandTemplateId) return;
    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    if (defaultTemplate) {
      setFormData(prev => ({ ...prev, brandTemplateId: defaultTemplate.id }));
    }
  }, [templatesLoading, templates, formData.brandTemplateId]);

  // Track if topic was set from quick-action (skip auto-refine)
  const [topicFromQuickAction, setTopicFromQuickAction] = useState(false);

  // Topic Refinement - disabled when topic comes from quick-action chip
  const {
    refinedTopics,
    isLoading: isLoadingRefinement,
    isTyping: isTypingTopic,
    refresh: refreshRefinement,
    elapsedMs: refinementElapsedMs,
  } = useTopicRefinement({
    rawTopic: formData.topic,
    brandTemplateId: formData.brandTemplateId,
    enabled: currentStep === 1 && formData.topic.trim().length >= 10 && !topicFromQuickAction,
  });

  // Topic Suggestions (like CarouselForm)
  const {
    suggestions: topicSuggestions,
    source: suggestionsSource,
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions,
    saveSuggestion,
    submitFeedback,
  } = useEnhancedTopicSuggestions({
    brandTemplateId: formData.brandTemplateId,
    contentGoal: formData.contentGoal || 'engagement',
    enabled: currentStep === 1 && !!formData.brandTemplateId,
  });

  // Loading phases - only track internal elapsed if external not provided
  useEffect(() => {
    if (!effectiveLoading) {
      setLoadingPhase(0);
      setInternalElapsedMs(0);
      return;
    }
    const startTime = Date.now();
    const phaseInterval = setInterval(() => {
      setLoadingPhase((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2500);
    // Only track internal elapsed if external not provided
    const elapsedInterval = externalElapsedMs === undefined
      ? setInterval(() => {
          setInternalElapsedMs(Date.now() - startTime);
        }, 100)
      : undefined;
    return () => {
      clearInterval(phaseInterval);
      if (elapsedInterval) clearInterval(elapsedInterval);
    };
  }, [effectiveLoading, externalElapsedMs]);

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

  // Synchronous guard ref to prevent double-submit
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    // Synchronous guard - block immediately if already submitting
    if (submittingRef.current || effectiveLoading) {
      console.log('[Stepper] Blocked double-submit');
      return;
    }
    submittingRef.current = true;

    if (!formData.topic.trim() || formData.channels.length === 0) {
      submittingRef.current = false;
      toast.error('Vui lòng nhập chủ đề và chọn ít nhất 1 kênh');
      return;
    }

    // Ensure the progress UI is visible long enough to be perceived
    const MIN_PROGRESS_VISIBLE_MS = 1200;
    setUiLoading(true);
    uiLoadingStartedAtRef.current = Date.now();

    try {
      await onSubmit({ ...formData, topicHistoryId });
    } finally {
      submittingRef.current = false;
      const startedAt = uiLoadingStartedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_PROGRESS_VISIBLE_MS - elapsed);
      window.setTimeout(() => {
        setUiLoading(false);
        uiLoadingStartedAtRef.current = null;
      }, remaining);
    }
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
              {/* Topic Input - Single-line like CarouselForm */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
                      Chủ đề / Ý tưởng
                      <span className="text-primary">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBrainstormSheet(true)}
                      className="h-7 gap-1.5 text-xs bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/40 text-primary hover:from-primary/20 hover:to-purple-500/20 shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5 animate-pulse" />
                      Brainstorm AI
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlossaryQuickLookup
                      industryTemplateId={selectedTemplate?.industry_template_id}
                      onInsertTerm={(term) => {
                        setFormData(prev => ({
                          ...prev,
                          topic: (prev.topic + ' ' + term).trim().slice(0, MAX_TOPIC_LENGTH),
                        }));
                        topicInputRef.current?.focus();
                      }}
                    />
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    data-topic-input
                    ref={topicInputRef}
                    rows={1}
                    value={formData.topic}
                    onChange={(e) => {
                      setTopicFromQuickAction(false);
                      setFormData(prev => ({ 
                        ...prev, 
                        topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                      }));
                    }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                    }}
                    placeholder="VD: Skincare mùa hè, Mẹo tiết kiệm chi phí..."
                    className="min-h-[80px] max-h-[200px] resize-none border-2 pr-20 text-base"
                    disabled={isLoading}
                    autoFocus
                  />
                  <Badge
                    variant="secondary"
                    className={cn(
                      "absolute right-3 bottom-2 text-[10px] font-mono",
                      formData.topic.length < 10 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {formData.topic.length}/{MAX_TOPIC_LENGTH}
                  </Badge>
                </div>

                {formData.topic.length > 0 && formData.topic.length < 10 && (
                  <p className="text-xs text-amber-500">
                    Chủ đề nên có ít nhất 10 ký tự
                  </p>
                )}

                {/* Unified Topic Idea Hub - Suggestions + Brainstorm AI */}
                <TopicIdeaHub
                  suggestions={topicSuggestions}
                  source={suggestionsSource}
                  isLoading={suggestionsLoading}
                  onSelect={(topic) => { setTopicFromQuickAction(false); setFormData(prev => ({ ...prev, topic })); }}
                  onQuickActionSelect={(topic) => { setTopicFromQuickAction(true); setFormData(prev => ({ ...prev, topic })); }}
                  onRefresh={refreshSuggestions}
                  onCategoryRefresh={(category) => { console.log('[TopicIdeaHub] Category refresh:', category); refreshSuggestions(category); }}
                  onSave={saveSuggestion}
                  onFeedback={submitFeedback}
                  disabled={isLoading}
                  showNavigateToTopics
                  showEnhancedInfo
                  contentGoal={formData.contentGoal}
                  brandTemplateId={formData.brandTemplateId}
                />

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
            <div className="space-y-4 animate-fade-in">
              {/* Topic Context Bar */}
              {formData.topic && (
                <TopicContextBar
                  topic={formData.topic}
                  brandName={selectedTemplate?.brand_name}
                  aiSuggestion={formData.aiSuggestion}
                  onEdit={() => setCurrentStep(1)}
                />
              )}
              {/* Section 1: Targeting */}
              {formData.brandTemplateId && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden animate-fade-in" style={{ animationDelay: '0ms' }}>
                  <CardContent className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                          <Crosshair className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Nhắm đối tượng</h3>
                          <p className="text-[10px] text-muted-foreground">Sản phẩm & Persona mục tiêu</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Tùy chọn
                      </Badge>
                    </div>

                    {/* Selectors Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Product Selector */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          Sản phẩm/Dịch vụ
                          {formData.aiSuggestion?.productFitId && formData.productId === formData.aiSuggestion.productFitId && (
                            <Sparkles className="w-3 h-3 text-amber-500" />
                          )}
                        </Label>
                        <ProductSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.productId}
                          onValueChange={(productId) => setFormData(prev => ({ 
                            ...prev, 
                            productId,
                            // Clear AI indicator if user manually changed
                            aiSuggestion: prev.aiSuggestion && prev.aiSuggestion.productFitId !== productId
                              ? { ...prev.aiSuggestion, productFitId: undefined }
                              : prev.aiSuggestion
                          }))}
                          disabled={isLoading}
                          placeholder="Chọn sản phẩm..."
                        />
                      </div>

                      {/* Persona Selector */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Persona mục tiêu
                          {formData.aiSuggestion?.targetPersonaId && formData.personaId === formData.aiSuggestion.targetPersonaId && (
                            <Sparkles className="w-3 h-3 text-amber-500" />
                          )}
                        </Label>
                        <PersonaSelector
                          brandTemplateId={formData.brandTemplateId}
                          value={formData.personaId}
                          onValueChange={(personaId) => setFormData(prev => ({ 
                            ...prev, 
                            personaId,
                            // Clear AI indicator if user manually changed
                            aiSuggestion: prev.aiSuggestion && prev.aiSuggestion.targetPersonaId !== personaId
                              ? { ...prev.aiSuggestion, targetPersonaId: undefined }
                              : prev.aiSuggestion
                          }))}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Selection Summary Chips */}
                    {(formData.productId || formData.personaId) && (
                      <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in">
                        {formData.productId && (
                          <Badge variant="secondary" className="gap-1.5 pr-1.5 bg-primary/10 hover:bg-primary/15 transition-colors">
                            <Package className="w-3 h-3" />
                            <span className="text-xs">Đã chọn sản phẩm</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, productId: undefined, aiSuggestion: prev.aiSuggestion ? { ...prev.aiSuggestion, productFitId: undefined } : undefined }))}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )}
                        {formData.personaId && (
                          <Badge variant="secondary" className="gap-1.5 pr-1.5 bg-primary/10 hover:bg-primary/15 transition-colors">
                            <Users className="w-3 h-3" />
                            <span className="text-xs">Đã chọn persona</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, personaId: undefined, aiSuggestion: prev.aiSuggestion ? { ...prev.aiSuggestion, targetPersonaId: undefined } : undefined }))}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* AI Suggestion Indicator - Enhanced with badges and hook */}
                    {formData.aiSuggestion && (formData.aiSuggestion.targetPersonaId || formData.aiSuggestion.productFitId || formData.aiSuggestion.hook) && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 border border-amber-500/20 animate-fade-in">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-md bg-amber-500/20">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              AI đề xuất dựa trên chủ đề
                            </p>
                            
                            {/* Suggestion Badges */}
                            <div className="flex flex-wrap gap-1.5">
                              {formData.aiSuggestion.targetPersona && (
                                <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                  <Users className="w-2.5 h-2.5" />
                                  {formData.aiSuggestion.targetPersona}
                                </Badge>
                              )}
                              {formData.aiSuggestion.productFit && (
                                <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                  <Package className="w-2.5 h-2.5" />
                                  {formData.aiSuggestion.productFit}
                                </Badge>
                              )}
                              {formData.aiSuggestion.suggestedJourneyStage && (
                                <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                  <Rocket className="w-2.5 h-2.5" />
                                  {JOURNEY_STAGE_CONFIG[formData.aiSuggestion.suggestedJourneyStage]?.label}
                                </Badge>
                              )}
                            </div>

                            {/* Hook Preview */}
                            {formData.aiSuggestion.hook && (
                              <div className="p-2 rounded-md bg-background/50 border border-border/30">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Hook gợi ý:</p>
                                <p className="text-xs italic text-foreground line-clamp-2">"{formData.aiSuggestion.hook}"</p>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              aiSuggestion: undefined,
                              productId: undefined,
                              personaId: undefined,
                              journeyStage: undefined,
                              contentAngle: undefined,
                            }))}
                            className="p-1 rounded-md hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Section 2: Content Angle (Content Goal removed - auto-derived from Journey Stage) */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
                <CardContent className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Compass className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Góc tiếp cận nội dung</h3>
                        <p className="text-[10px] text-muted-foreground">Cách triển khai chủ đề</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Tùy chọn
                    </Badge>
                  </div>

                  {/* Content Angle - Now the main focus of this section */}
                  <ContentAngleSelector
                    value={formData.contentAngle}
                    onValueChange={(angle) => setFormData(prev => ({ ...prev, contentAngle: angle }))}
                    disabled={isLoading}
                  />

                  {/* Auto-derived Content Goal indicator */}
                  {formData.journeyStage && formData.contentGoal && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 animate-fade-in">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Mục tiêu tự động: <span className="font-medium text-foreground">
                          {CONTENT_GOALS.find(g => g.value === formData.contentGoal)?.label}
                        </span> (từ giai đoạn {JOURNEY_STAGE_CONFIG[formData.journeyStage]?.label})
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: Journey Stage - Always visible in collapsible */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Collapsible defaultOpen={!!(formData.productId || formData.personaId)}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                          <Rocket className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">Giai đoạn hành trình</h3>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Nâng cao
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Điều chỉnh messaging theo phễu</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.journeyStage && (
                          <Badge variant="secondary" className="text-xs">
                            {JOURNEY_STAGE_CONFIG[formData.journeyStage]?.label}
                          </Badge>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <Separator className="mb-4" />
                      <JourneyStageSelector
                        value={formData.journeyStage}
                        onValueChange={(stage) => setFormData(prev => ({ ...prev, journeyStage: stage }))}
                        disabled={isLoading}
                        showEmotionalTone={true}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Progress indicator - 3 sections: Targeting, Angle, Journey */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  (formData.productId || formData.personaId) ? "bg-primary" : "bg-muted-foreground/30"
                )} />
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  formData.contentAngle ? "bg-primary" : "bg-muted-foreground/30"
                )} />
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  formData.journeyStage ? "bg-primary" : "bg-muted-foreground/30"
                )} />
              </div>
            </div>
          )}

          {/* Step 3: Channel Selection */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Topic Context Bar */}
              {formData.topic && (
                <TopicContextBar
                  topic={formData.topic}
                  brandName={selectedTemplate?.brand_name}
                  aiSuggestion={formData.aiSuggestion}
                  onEdit={() => setCurrentStep(1)}
                />
              )}
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
                    {category.channels.map((channel) => {
                      const hasOverride = selectedTemplate?.channel_overrides && 
                        Object.keys(selectedTemplate.channel_overrides).includes(channel.value);
                      return (
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
                            <span className="text-sm truncate flex-1">{channel.label}</span>
                            {hasOverride && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
                                <Settings2 className="w-2.5 h-2.5 mr-0.5" />
                                Custom
                              </Badge>
                            )}
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{channel.description}</p>
                          {hasOverride && (
                            <p className="text-xs text-purple-500 mt-1">✨ Có cấu hình riêng cho kênh này</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      );
                    })}
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
              {/* Topic Context Bar */}
              {formData.topic && !effectiveLoading && (
                <TopicContextBar
                  topic={formData.topic}
                  brandName={selectedTemplate?.brand_name}
                  aiSuggestion={formData.aiSuggestion}
                  onEdit={() => setCurrentStep(1)}
                />
              )}

              {/* AI Generation Progress - Show when loading */}
              {effectiveLoading ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <AIGenerationProgress
                      isLoading={effectiveLoading}
                      channelCount={formData.channels.length}
                      elapsedMs={generationElapsedMs}
                      sseStep={sseProgress?.step}
                      sseProgress={sseProgress?.progress}
                      sseMessage={sseProgress?.message}
                      completedChannels={sseProgress?.completedChannels}
                      totalChannels={sseProgress?.totalChannels}
                      currentChannel={sseProgress?.currentChannel}
                      channelContents={sseProgress?.channelContents}
                      streamingTexts={streamingTexts}
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
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

                  {/* Campaign Selector */}
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
                      <Megaphone className="w-4 h-4" />
                      Liên kết với Chiến dịch
                      <span className="text-xs text-muted-foreground">(tùy chọn)</span>
                    </Label>
                    <CampaignSelector
                      value={formData.campaignId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, campaignId: value }))}
                      disabled={effectiveLoading}
                      placeholder="Chọn chiến dịch..."
                      showActiveOnly={true}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || effectiveLoading}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || effectiveLoading}
              className="gap-2 gradient-primary glow-primary"
            >
              Tiếp tục
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={effectiveLoading || !formData.topic.trim() || formData.channels.length === 0}
              className={cn(
                "gap-2 gradient-primary min-w-[180px]",
                !effectiveLoading && "glow-primary"
              )}
            >
              {effectiveLoading ? (
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

        {/* Estimated time hint */}
        {currentStep === 4 && !effectiveLoading && (
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
          toast.success('Đã chọn chủ đề từ AI Brainstorm');
        }}
      />
    </TooltipProvider>
  );
}
