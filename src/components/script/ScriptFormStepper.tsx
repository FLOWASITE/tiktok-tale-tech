import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Zap,
  CheckCircle2,
  X,
  Target,
  Book,
  Megaphone,
  ChevronRight,
  Clock,
  Film,
  Users,
  Mic,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useQuickHookSuggestions } from '@/hooks/useQuickHookSuggestions';
import { TopicAngleSelector } from '@/components/script/TopicAngleSelector';
import { TopicAnglePreview } from '@/components/script/TopicAnglePreview';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { ComplianceWarningBadge } from '@/components/multichannel/ComplianceWarningBadge';
import { TopicIdeaHub } from '@/components/topic/TopicIdeaHub';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useCompliancePrecheck, PreCheckResult } from '@/hooks/useCompliancePrecheck';
import { ContentGoal } from '@/types/multichannel';
import { DurationSelector } from '@/components/script/DurationSelector';
import { VideoTypeSelector } from '@/components/script/VideoTypeSelector';
import { VideoTypeRecommendations } from '@/components/script/VideoTypeRecommendations';
import { CharacterTypeSelector } from '@/components/script/CharacterTypeSelector';
import { CharacterTypeRecommendations } from '@/components/script/CharacterTypeRecommendations';
import { StepIndicator, Step } from '@/components/script/StepIndicator';
import { HookStepContent } from '@/components/script/HookStepContent';
import { ScriptPurposeSelector } from '@/components/script/ScriptPurposeSelector';
import { VoiceRegionSelector } from '@/components/script/VoiceRegionSelector';
import { DialogueStyleSelector } from '@/components/script/DialogueStyleSelector';
import { ConfigChipSelector } from '@/components/script/ConfigChipSelector';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { useVideoTypeRecommendations } from '@/hooks/useVideoTypeRecommendations';
import { useCharacterTypeRecommendations } from '@/hooks/useCharacterTypeRecommendations';
import { cn } from '@/lib/utils';
import { 
  ScriptFormData, 
  HookDetails,
  TopicAngle,
  TOPIC_ANGLE_LABELS,
  ScriptPurpose,
  SCRIPT_PURPOSE_CONFIG,
  VoiceRegion,
  VOICE_REGION_CONFIG,
  DialogueStyle,
  DIALOGUE_STYLE_CONFIG,
  VIDEO_TYPE_LABELS,
  CHARACTER_TYPE_LABELS,
  DURATION_LABELS,
} from '@/types/script';
import { FRAMEWORK_ICONS } from '@/types/hook';

interface ScriptFormStepperProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Nội dung', icon: <FileText className="w-4 h-4" /> },
  { id: 2, title: 'Tạo kịch bản', icon: <Sparkles className="w-4 h-4" /> },
];

const LOADING_PHASES = [
  'Đang phân tích chủ đề...',
  'Đang tạo cấu trúc kịch bản...',
  'Đang viết nội dung...',
  'Hoàn thiện kịch bản...',
];

const MAX_TOPIC_LENGTH = 300;
const TOPIC_MIN_LENGTH_FOR_REFINEMENT = 10;

export function ScriptFormStepper({ onSubmit, isLoading, initialTopic, topicHistoryId }: ScriptFormStepperProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const { currentBrand } = useCurrentBrand();
  const topicTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [complianceCheckResult, setComplianceCheckResult] = useState<PreCheckResult | null>(null);
  const [isSuggestingCompliant, setIsSuggestingCompliant] = useState(false);
  // Track if user manually changed video_type or character_type
  const [userOverrodeVideoType, setUserOverrodeVideoType] = useState(false);
  const [userOverrodeCharacterType, setUserOverrodeCharacterType] = useState(false);

  const [formData, setFormData] = useState<ScriptFormData>({
    topic: initialTopic || '',
    duration: 60,
    video_type: 'expert_share',
    character_type: 'the_virtuoso',
    script_purpose: 'ai_video',
    voice_region: 'northern',
    dialogue_style: 'monologue',
    brandTemplateId: undefined,
    brandVoiceVariantId: undefined,
    hook: undefined,
    angle: undefined,
    campaignId: undefined,
  });

  // Handle initialTopic prop changes
  useEffect(() => {
    if (initialTopic) {
      setFormData(prev => ({ ...prev, topic: initialTopic }));
    }
  }, [initialTopic]);

  const selectedTemplate = templates.find((t) => t.id === formData.brandTemplateId);

  // Memoize brandVoiceForHook
  const brandVoiceForHook = useMemo(() => {
    if (!selectedTemplate) return undefined;
    return {
      brand_name: selectedTemplate.brand_name,
      tone_of_voice: selectedTemplate.tone_of_voice || undefined,
      formality_level: selectedTemplate.formality_level || undefined,
    };
  }, [selectedTemplate?.id, selectedTemplate?.brand_name, selectedTemplate?.tone_of_voice, selectedTemplate?.formality_level]);

  // Quick hook suggestions
  const {
    suggestions: quickHookSuggestions,
    isLoading: isLoadingHooks,
  } = useQuickHookSuggestions({
    topic: formData.topic,
    brandVoice: brandVoiceForHook,
    enabled: currentStep === 1 && formData.topic.length >= 10,
  });

  // Map script purpose to content goal
  const scriptContentGoal: ContentGoal = useMemo(() => {
    switch (formData.script_purpose) {
      case 'ai_video':
        return 'engagement';
      case 'teleprompter':
        return 'education';
      case 'production':
        return 'expertise';
      default:
        return 'education';
    }
  }, [formData.script_purpose]);

  // Enhanced Topic Suggestions
  const {
    suggestions: enhancedSuggestions,
    source: suggestionsSource,
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions,
    saveSuggestion,
    submitFeedback,
  } = useEnhancedTopicSuggestions({
    brandTemplateId: formData.brandTemplateId,
    contentGoal: scriptContentGoal,
    format: 'script',
    enabled: currentStep === 1,
  });

  // Compliance pre-check
  const complianceOptions = useMemo(() => ({
    industryForbiddenTerms: [],
    brandForbiddenWords: [],
  }), []);

  const { fullCheck, suggestCompliantTopic, isChecking: isCheckingCompliance } = useCompliancePrecheck(complianceOptions);

  useEffect(() => {
    if (formData.topic.trim().length >= TOPIC_MIN_LENGTH_FOR_REFINEMENT) {
      const result = fullCheck(formData.topic);
      setComplianceCheckResult(result);
    } else {
      setComplianceCheckResult(null);
    }
  }, [formData.topic, fullCheck]);

  const handleSuggestCompliant = useCallback(async () => {
    if (!complianceCheckResult?.issues?.length) return;
    setIsSuggestingCompliant(true);
    try {
      const suggested = await suggestCompliantTopic(formData.topic, complianceCheckResult.issues);
      if (suggested) {
        setFormData(prev => ({ ...prev, topic: suggested }));
        toast.success('Đã thay thế bằng topic an toàn');
      }
    } finally {
      setIsSuggestingCompliant(false);
    }
  }, [formData.topic, complianceCheckResult, suggestCompliantTopic]);

  // AI Recommendations - auto-apply smart defaults
  const { recommendations: videoRecs, topRecommendation: topVideoRec } = useVideoTypeRecommendations({
    topic: formData.topic,
    industry: selectedTemplate?.industry?.[0],
    enabled: formData.topic.trim().length >= 10,
  });

  const { recommendations: charRecs, topRecommendation: topCharRec } = useCharacterTypeRecommendations({
    topic: formData.topic,
    videoType: formData.video_type,
    industry: selectedTemplate?.industry?.[0],
    enabled: formData.topic.trim().length >= 10,
  });

  // Auto-apply top recommendations (only if user hasn't manually overridden)
  useEffect(() => {
    if (topVideoRec && !userOverrodeVideoType) {
      setFormData(prev => ({ ...prev, video_type: topVideoRec.videoType }));
    }
  }, [topVideoRec?.videoType, userOverrodeVideoType]);

  useEffect(() => {
    if (topCharRec && !userOverrodeCharacterType) {
      setFormData(prev => ({ ...prev, character_type: topCharRec.characterType }));
    }
  }, [topCharRec?.characterType, userOverrodeCharacterType]);

  // Loading phases
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhase((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Sync brandTemplateId from global brand context
  useEffect(() => {
    if (templatesLoading || templates.length === 0) return;
    const brand = currentBrand 
      ? templates.find(t => t.id === currentBrand.id)
      : (templates.find(t => t.is_default) ?? templates[0]);
    if (brand) {
      setFormData(prev => ({ ...prev, brandTemplateId: brand.id }));
    }
  }, [templatesLoading, templates, currentBrand]);

  // Character count color
  const topicLength = formData.topic.length;
  const charCountColor = useMemo(() => {
    if (topicLength === 0) return 'text-muted-foreground';
    if (topicLength < 20) return 'text-amber-500';
    if (topicLength > MAX_TOPIC_LENGTH * 0.9) return 'text-destructive';
    return 'text-green-500';
  }, [topicLength]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return formData.topic.trim().length >= 10;
      case 2:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData.topic]);

  const handleNext = () => {
    if (currentStep < 2 && canProceed) {
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

  const handleSelectHook = (hook: HookDetails) => {
    setFormData(prev => ({ ...prev, hook }));
    toast.success('Đã chọn hook');
  };

  const handleRemoveHook = () => {
    setFormData(prev => ({ ...prev, hook: undefined }));
    toast.success('Đã xóa hook');
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim()) {
      toast.error('Vui lòng nhập chủ đề video');
      setCurrentStep(1);
      return;
    }
    await onSubmit({ ...formData, topicHistoryId });
  };

  // Labels for chips
  const purposeLabel = SCRIPT_PURPOSE_CONFIG[formData.script_purpose]?.label || formData.script_purpose;
  const durationLabel = DURATION_LABELS[formData.duration] || `${formData.duration}s`;
  const videoTypeLabel = VIDEO_TYPE_LABELS[formData.video_type] || formData.video_type;
  const characterLabel = CHARACTER_TYPE_LABELS[formData.character_type] || formData.character_type;
  const voiceLabel = VOICE_REGION_CONFIG[formData.voice_region]?.label || formData.voice_region;
  const dialogueLabel = DIALOGUE_STYLE_CONFIG[formData.dialogue_style]?.label || formData.dialogue_style;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <div className="min-h-[300px]">
        {/* ====== Step 1: Nội dung (Purpose + Topic + Hook) ====== */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Section 01: Chủ đề + Mục đích (gộp) */}
            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-visible relative z-10">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Chủ đề video <span className="text-primary">*</span></p>
                  <p className="text-xs text-muted-foreground">Mô tả nội dung bạn muốn tạo kịch bản</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTemplate?.industry_template_id && (
                    <GlossaryQuickLookup
                      industryTemplateId={selectedTemplate.industry_template_id}
                      onInsertTerm={(term) => {
                        const textarea = topicTextareaRef.current;
                        if (textarea) {
                          const cursorPos = textarea.selectionStart;
                          const currentTopic = formData.topic;
                          const before = currentTopic.slice(0, cursorPos);
                          const after = currentTopic.slice(cursorPos);
                          setFormData((prev) => ({ 
                            ...prev, 
                            topic: (before + term + after).slice(0, MAX_TOPIC_LENGTH) 
                          }));
                          setTimeout(() => {
                            textarea.focus();
                            const newPos = cursorPos + term.length;
                            textarea.setSelectionRange(newPos, newPos);
                          }, 0);
                        } else {
                          setFormData((prev) => ({ 
                            ...prev, 
                            topic: (prev.topic + ' ' + term).slice(0, MAX_TOPIC_LENGTH) 
                          }));
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
                  <span className="text-xs font-mono text-muted-foreground/40">01</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Purpose selector */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Định dạng kịch bản</span>
                  <ScriptPurposeSelector
                    value={formData.script_purpose}
                    onChange={(value) => setFormData((prev) => ({ ...prev, script_purpose: value }))}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="h-px bg-border/30" />

                {/* Premium textarea */}
                <div className="relative group rounded-lg p-[1.5px] transition-all duration-300 bg-border/40 focus-within:bg-gradient-to-r focus-within:from-primary/60 focus-within:via-accent/50 focus-within:to-primary/60">
                  <Textarea
                    ref={topicTextareaRef}
                    id="topic"
                    placeholder="Nhập chủ đề video của bạn, ví dụ: 5 sai lầm phổ biến khi đầu tư chứng khoán mà người mới thường mắc phải..."
                    value={formData.topic}
                    onChange={(e) => {
                      setFormData((prev) => ({ 
                        ...prev, 
                        topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                      }));
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    className={cn(
                      "min-h-[72px] bg-background border-0 resize-none text-base transition-all duration-300",
                      "focus-visible:ring-0 focus-visible:ring-offset-0",
                      "placeholder:text-muted-foreground/50 rounded-[5px]"
                    )}
                    disabled={isLoading}
                  />
                </div>
                
                {/* Progress bar character counter */}
                <div className="space-y-1">
                  <Progress 
                    value={Math.min((topicLength / MAX_TOPIC_LENGTH) * 100, 100)} 
                    className={cn(
                      "h-1",
                      topicLength > MAX_TOPIC_LENGTH * 0.9 ? "[&>div]:bg-destructive" : 
                      topicLength >= 20 ? "[&>div]:bg-primary" : "[&>div]:bg-muted-foreground/30"
                    )}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/60">
                      {topicLength < 10 ? 'Tối thiểu 10 ký tự' : topicLength < 20 ? 'Thêm chi tiết để gợi ý tốt hơn' : ''}
                    </span>
                    <span className={cn("text-[10px] font-mono", charCountColor)}>
                      {topicLength}/{MAX_TOPIC_LENGTH}
                    </span>
                  </div>
                </div>

                {complianceCheckResult && complianceCheckResult.issues.length > 0 && (
                  <ComplianceWarningBadge
                    result={complianceCheckResult}
                    onSuggestCompliant={handleSuggestCompliant}
                    isSuggesting={isSuggestingCompliant}
                  />
                )}

                <TopicIdeaHub
                  suggestions={enhancedSuggestions}
                  source={suggestionsSource}
                  isLoading={suggestionsLoading}
                  onSelect={(topic) => setFormData(prev => ({ ...prev, topic }))}
                  onRefresh={() => refreshSuggestions()}
                  onCategoryRefresh={(category) => refreshSuggestions(category)}
                  onBrainstorm={() => setShowBrainstormSheet(true)}
                  onSave={saveSuggestion}
                  onFeedback={submitFeedback}
                  disabled={isLoading}
                  showEnhancedInfo={true}
                  brandTemplateId={formData.brandTemplateId}
                  contentGoal={scriptContentGoal}
                />

                {formData.topic.trim().length >= 20 && (
                  <div>
                    <TopicAngleSelector
                      value={formData.angle}
                      onChange={(angle) => setFormData((prev) => ({ ...prev, angle }))}
                      disabled={isLoading}
                    />
                    {formData.angle && (
                      <TopicAnglePreview 
                        angle={formData.angle} 
                        topic={formData.topic}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Gradient divider */}
            {formData.topic.trim().length >= 10 && (
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            )}

            {/* Section 03: Hook — Collapsible */}
            {formData.topic.trim().length >= 10 && (
              <Collapsible>
                <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/80 to-orange-500/80 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-foreground">
                        {formData.hook ? `Hook: "${formData.hook.opening_line.slice(0, 40)}..."` : 'Thêm Hook mở đầu'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formData.hook ? 'Đã chọn hook — nhấn để thay đổi' : 'Tuỳ chọn — Thu hút 3 giây đầu tiên'}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/40 mr-2">02</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/30 p-4">
                      <HookStepContent
                        topic={formData.topic}
                        selectedHook={formData.hook}
                        onSelectHook={(hook) => handleSelectHook(hook)}
                        onSkip={() => {}}
                        brandTemplateId={formData.brandTemplateId}
                        brandVoice={brandVoiceForHook}
                        quickSuggestions={quickHookSuggestions}
                        isLoadingSuggestions={isLoadingHooks}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            <TopicBrainstormSheet
              open={showBrainstormSheet}
              onOpenChange={setShowBrainstormSheet}
              brandTemplateId={formData.brandTemplateId}
              contentGoal={scriptContentGoal}
              onSelectTopic={(topic) => {
                setFormData((prev) => ({ ...prev, topic }));
                toast.success('Đã chọn chủ đề từ AI Brainstorm');
              }}
            />
          </div>
        )}

        {/* ====== Step 2: Smart Summary + Generate ====== */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Header with topic context */}
            <div className="text-center py-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Sẵn sàng tạo kịch bản</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto truncate">
                Chủ đề: <span className="text-foreground font-medium">{formData.topic.length > 60 ? formData.topic.slice(0, 60) + '...' : formData.topic}</span>
              </p>
              {(formData.hook || formData.angle) && (
                <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                  {formData.hook && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Hook đã chọn
                    </span>
                  )}
                  {formData.angle && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-primary" />
                      {TOPIC_ANGLE_LABELS[formData.angle].label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Smart Config Chips */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Cấu hình</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Duration chip */}
                <ConfigChipSelector
                  label={`${formData.duration}s`}
                  icon={<Clock className="w-3.5 h-3.5" />}
                >
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Thời lượng</p>
                    <DurationSelector
                      value={formData.duration}
                      onChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                      disabled={isLoading}
                    />
                  </div>
                </ConfigChipSelector>

                {/* Video Type chip */}
                <ConfigChipSelector
                  label={videoTypeLabel}
                  icon={<Film className="w-3.5 h-3.5" />}
                  isAiSuggested={!userOverrodeVideoType && !!topVideoRec}
                  popoverClassName="min-w-[320px] max-w-[460px]"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Thể loại</p>
                    <VideoTypeRecommendations
                      topic={formData.topic}
                      industry={selectedTemplate?.industry?.[0]}
                      currentValue={formData.video_type}
                      onSelect={(value) => {
                        setFormData((prev) => ({ ...prev, video_type: value }));
                        setUserOverrodeVideoType(true);
                      }}
                      disabled={isLoading}
                    />
                    <Collapsible>
                      <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-300">
                        <span className="tracking-wide">Xem tất cả</span>
                        <ChevronDown className="w-3 h-3 [[data-state=open]>&]:rotate-180 transition-transform duration-300" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <VideoTypeSelector
                          value={formData.video_type}
                          onChange={(value) => {
                            setFormData((prev) => ({ ...prev, video_type: value }));
                            setUserOverrodeVideoType(true);
                          }}
                          disabled={isLoading}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ConfigChipSelector>

                {/* Character chip */}
                <ConfigChipSelector
                  label={characterLabel}
                  icon={<Users className="w-3.5 h-3.5" />}
                  isAiSuggested={!userOverrodeCharacterType && !!topCharRec}
                  popoverClassName="min-w-[320px] max-w-[460px]"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Nhân vật</p>
                    <CharacterTypeRecommendations
                      topic={formData.topic}
                      videoType={formData.video_type}
                      industry={selectedTemplate?.industry?.[0]}
                      selectedCharacterType={formData.character_type}
                      onSelect={(value) => {
                        setFormData((prev) => ({ ...prev, character_type: value }));
                        setUserOverrodeCharacterType(true);
                      }}
                      enabled={!isLoading}
                    />
                    <Collapsible>
                      <CollapsibleTrigger className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-300">
                        <span className="tracking-wide">Xem tất cả</span>
                        <ChevronDown className="w-3 h-3 [[data-state=open]>&]:rotate-180 transition-transform duration-300" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CharacterTypeSelector
                          value={formData.character_type}
                          onChange={(value) => {
                            setFormData((prev) => ({ ...prev, character_type: value }));
                            setUserOverrodeCharacterType(true);
                          }}
                          disabled={isLoading}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ConfigChipSelector>

                {/* Voice & Dialogue chip */}
                <ConfigChipSelector
                  label={`${voiceLabel.replace('Giọng ', '')} • ${dialogueLabel}`}
                  icon={<Mic className="w-3.5 h-3.5" />}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-3">Giọng vùng miền</p>
                      <VoiceRegionSelector
                        value={formData.voice_region}
                        onChange={(value) => setFormData((prev) => ({ ...prev, voice_region: value }))}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="h-px bg-border/20" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-3">Phong cách hội thoại</p>
                      <DialogueStyleSelector
                        value={formData.dialogue_style}
                        onChange={(value) => setFormData((prev) => ({ ...prev, dialogue_style: value }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </ConfigChipSelector>
              </div>
            </div>

            {/* Campaign selector */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-accent/30 transition-colors">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground flex-1 text-left">Tùy chỉnh nâng cao</span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", showAdvanced && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-3 p-4 rounded-xl border border-border/40 bg-card/50">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
                      <Megaphone className="w-4 h-4" />
                      Liên kết với Chiến dịch
                      <span className="text-xs text-muted-foreground">(tùy chọn)</span>
                    </Label>
                    <CampaignSelector
                      value={formData.campaignId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, campaignId: value }))}
                      disabled={isLoading}
                      placeholder="Chọn chiến dịch..."
                      showActiveOnly={true}
                    />
                  </div>

                  {selectedTemplate && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Brand</p>
                        <p className="text-sm font-medium">{selectedTemplate.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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

        {currentStep < 2 ? (
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
            disabled={isLoading || !formData.topic.trim()}
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
                Tạo kịch bản AI
              </>
            )}
          </Button>
        )}
      </div>

      {currentStep === 2 && !isLoading && (
        <p className="text-center text-xs text-muted-foreground">
          Thời gian ước tính: ~15-30 giây
        </p>
      )}
    </div>
  );
}
