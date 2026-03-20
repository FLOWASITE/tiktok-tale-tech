import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Zap,
  Settings,
  CheckCircle2,
  X,
  Target,
  Book,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useQuickHookSuggestions } from '@/hooks/useQuickHookSuggestions';
import { useTopicRefinement } from '@/hooks/useTopicRefinement';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
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
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { BrandVoiceVariantSelector } from '@/components/BrandVoiceVariantSelector';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { cn } from '@/lib/utils';
import { 
  ScriptFormData, 
  HookDetails,
  TopicAngle,
  TOPIC_ANGLE_LABELS,
  ScriptPurpose,
  VoiceRegion,
  DialogueStyle,
} from '@/types/script';
import { FRAMEWORK_LABELS, FRAMEWORK_ICONS } from '@/types/hook';

interface ScriptFormStepperProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
}

const STEPS: Step[] = [
  { id: 1, title: 'Mục đích', icon: <Target className="w-4 h-4" /> },
  { id: 2, title: 'Chủ đề', icon: <FileText className="w-4 h-4" /> },
  { id: 3, title: 'Hook', icon: <Zap className="w-4 h-4" />, optional: true },
  { id: 4, title: 'Cấu hình', icon: <Settings className="w-4 h-4" /> },
  { id: 5, title: 'Tạo', icon: <CheckCircle2 className="w-4 h-4" /> },
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
  const [brandValue, setBrandValue] = useState<string>('none');
  const [brandTouched, setBrandTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [complianceCheckResult, setComplianceCheckResult] = useState<PreCheckResult | null>(null);
  const [isSuggestingCompliant, setIsSuggestingCompliant] = useState(false);

  const [formData, setFormData] = useState<ScriptFormData>({
    topic: initialTopic || '',
    duration: 60,
    video_type: 'expert_share',
    character_type: 'the_virtuoso',
    script_purpose: 'ai_video_veo3',
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

  // Memoize brandVoiceForHook to prevent infinite re-renders
  const brandVoiceForHook = useMemo(() => {
    if (!selectedTemplate) return undefined;
    return {
      brand_name: selectedTemplate.brand_name,
      tone_of_voice: selectedTemplate.tone_of_voice || undefined,
      formality_level: selectedTemplate.formality_level || undefined,
    };
  }, [selectedTemplate?.id, selectedTemplate?.brand_name, selectedTemplate?.tone_of_voice, selectedTemplate?.formality_level]);

  // Quick hook suggestions - now on step 3
  const {
    suggestions: quickHookSuggestions,
    isLoading: isLoadingHooks,
  } = useQuickHookSuggestions({
    topic: formData.topic,
    brandVoice: brandVoiceForHook,
    enabled: currentStep === 3 && formData.topic.length >= 10,
  });

  // Map script purpose to content goal for AI suggestions
  const scriptContentGoal: ContentGoal = useMemo(() => {
    switch (formData.script_purpose) {
      case 'ai_video_veo3':
      case 'ai_video_minimax':
        return 'engagement';
      case 'teleprompter':
      case 'voiceover':
        return 'education';
      case 'production':
        return 'expertise';
      default:
        return 'education';
    }
  }, [formData.script_purpose]);

  // Enhanced Topic Suggestions (same as Carousel)
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
    enabled: currentStep === 2,
  });

  // Compliance pre-check hook
  const complianceOptions = useMemo(() => ({
    industryForbiddenTerms: [],
    brandForbiddenWords: [],
  }), []);

  const { fullCheck, suggestCompliantTopic, isChecking: isCheckingCompliance } = useCompliancePrecheck(complianceOptions);

  // Run compliance check when topic changes
  useEffect(() => {
    if (formData.topic.trim().length >= TOPIC_MIN_LENGTH_FOR_REFINEMENT) {
      const result = fullCheck(formData.topic);
      setComplianceCheckResult(result);
    } else {
      setComplianceCheckResult(null);
    }
  }, [formData.topic, fullCheck]);

  // Handle suggest compliant topic
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

  // Check if topic is substantial enough
  const isTopicSubstantial = formData.topic.trim().length >= TOPIC_MIN_LENGTH_FOR_REFINEMENT;

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

  // Set default template from global brand context or default template
  useEffect(() => {
    if (templatesLoading || brandTouched || templates.length === 0) return;
    
    // If brandValue is still 'none', set from global context or default
    if (brandValue === 'none') {
      const initialBrand = currentBrand 
        ? templates.find(t => t.id === currentBrand.id)
        : (templates.find(t => t.is_default) ?? templates[0]);
      if (initialBrand) {
        setBrandValue(initialBrand.id);
        setFormData(prev => ({ ...prev, brandTemplateId: initialBrand.id }));
      }
    }
  }, [templatesLoading, templates, brandTouched, brandValue, currentBrand]);

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
        return true; // Purpose always has default
      case 2:
        return formData.topic.trim().length >= 10;
      case 3:
        return true; // Hook is optional
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData.topic]);

  const handleNext = () => {
    if (currentStep < 5 && canProceed) {
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

  const handleSkipHook = () => {
    setCompletedSteps(prev => [...prev.filter(s => s !== 3), 3]);
    setCurrentStep(4);
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim()) {
      toast.error('Vui lòng nhập chủ đề video');
      setCurrentStep(2);
      return;
    }
    await onSubmit({ ...formData, topicHistoryId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg glow-primary animate-pulse-glow">
          <Wand2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tạo kịch bản AI</h2>
          <p className="text-sm text-muted-foreground">
            Làm theo các bước để tạo kịch bản chuyên nghiệp
          </p>
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
        {/* Step 1: Purpose */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-3">
              <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
                Mục đích sử dụng kịch bản
                <span className="text-primary">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Chọn mục đích để AI tạo kịch bản với định dạng phù hợp
              </p>
              <ScriptPurposeSelector
                value={formData.script_purpose}
                onChange={(value) => setFormData((prev) => ({ ...prev, script_purpose: value }))}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Step 2: Topic */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Brand Template Selection - First */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="brandTemplate" className="text-foreground font-semibold text-sm">
                  Chọn thương hiệu
                  <span className="text-xs text-muted-foreground ml-2">(ảnh hưởng đến gợi ý chủ đề)</span>
                </Label>
                {selectedTemplate && (
                  <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                    <Sparkles className="w-3 h-3" />
                    Brand Voice Applied
                  </Badge>
                )}
              </div>
              
              {templatesLoading ? (
                <div className="h-10 bg-muted/50 border border-border rounded-lg flex items-center px-3 animate-pulse">
                  <span className="text-sm text-muted-foreground">Đang tải templates...</span>
                </div>
              ) : (
                <Select
                  value={brandValue}
                  onValueChange={(value) => {
                    setBrandTouched(true);
                    setBrandValue(value);
                    setFormData((prev) => ({
                      ...prev,
                      brandTemplateId: value === 'none' ? undefined : value,
                    }));
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-muted/30 border-2 border-border focus:border-primary text-sm h-10 transition-all">
                    <SelectValue placeholder="Chọn Brand Template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" textValue="Không sử dụng" className="text-sm">
                      Không sử dụng
                    </SelectItem>
                    {templates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                        textValue={template.name}
                        className="text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {template.primary_color && (
                            <span
                              className="w-3 h-3 rounded-full inline-block ring-2 ring-offset-1 ring-offset-background"
                              style={{ backgroundColor: template.primary_color }}
                            />
                          )}
                          <span className="truncate">{template.name}</span>
                          {template.is_default && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">Mặc định</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedTemplate && (
                <BrandPreviewCard template={selectedTemplate} defaultOpen={false} />
              )}
              
              {/* A/B Testing Voice Variant Selector */}
              <BrandVoiceVariantSelector
                brandTemplateId={formData.brandTemplateId}
                value={formData.brandVoiceVariantId}
                onValueChange={(variantId) => setFormData(prev => ({ ...prev, brandVoiceVariantId: variantId }))}
                disabled={isLoading}
              />
            </div>

            {/* Topic Input - Second */}
            <div className="space-y-3">
              {/* Topic Label with Brainstorm Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="topic" className="text-foreground font-semibold text-sm flex items-center gap-2">
                    Chủ đề video
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
                </div>
              </div>
              
              {/* Topic Textarea */}
              <div className="relative group">
                <Textarea
                  ref={topicTextareaRef}
                  id="topic"
                  placeholder="Nhập chủ đề video của bạn, ví dụ: 5 sai lầm phổ biến khi đầu tư chứng khoán mà người mới thường mắc phải..."
                  value={formData.topic}
                  onChange={(e) => setFormData((prev) => ({ 
                    ...prev, 
                    topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) 
                  }))}
                  className={cn(
                    "min-h-[120px] bg-muted/30 border-2 resize-none text-sm transition-all duration-300",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
                    "placeholder:text-muted-foreground/60"
                  )}
                  disabled={isLoading}
                />
                
                <div className={cn(
                  "absolute bottom-2 right-3 text-xs font-medium transition-colors",
                  charCountColor
                )}>
                  {topicLength}/{MAX_TOPIC_LENGTH}
                </div>
              </div>

              {/* Compliance Warning Badge */}
              {complianceCheckResult && complianceCheckResult.issues.length > 0 && (
                <ComplianceWarningBadge
                  result={complianceCheckResult}
                  onSuggestCompliant={handleSuggestCompliant}
                  isSuggesting={isSuggestingCompliant}
                />
              )}

              {/* Topic Idea Hub - Same as Carousel */}
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

              {/* Topic Angle Selector - Script specific */}
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

            {/* Topic Brainstorm Sheet */}
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

        {/* Step 3: Hook */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <HookStepContent
              topic={formData.topic}
              selectedHook={formData.hook}
              onSelectHook={(hook) => {
                handleSelectHook(hook);
                setCompletedSteps(prev => [...prev.filter(s => s !== 3), 3]);
              }}
              onSkip={handleSkipHook}
              brandTemplateId={formData.brandTemplateId}
              brandVoice={brandVoiceForHook}
              quickSuggestions={quickHookSuggestions}
              isLoadingSuggestions={isLoadingHooks}
            />
          </div>
        )}

        {/* Step 4: Configuration */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            {/* Selected Hook Display (if any) */}
            {formData.hook && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FRAMEWORK_ICONS[formData.hook.framework || ''] || '🎣'}</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      "{formData.hook.opening_line}"
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={handleRemoveHook}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-foreground font-semibold text-sm">
                Thời lượng video
              </Label>
              <DurationSelector
                value={formData.duration}
                onChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                disabled={isLoading}
              />
            </div>

            {/* Video Type */}
            <div className="space-y-3">
              <Label className="text-foreground font-semibold text-sm">
                Thể loại video
              </Label>
              
              {/* Smart Recommendations */}
              <VideoTypeRecommendations
                topic={formData.topic}
                industry={selectedTemplate?.industry?.[0]}
                currentValue={formData.video_type}
                onSelect={(value) => setFormData((prev) => ({ ...prev, video_type: value }))}
                disabled={isLoading}
              />
              
              <VideoTypeSelector
                value={formData.video_type}
                onChange={(value) => setFormData((prev) => ({ ...prev, video_type: value }))}
                disabled={isLoading}
              />
            </div>

            {/* Character Type - Now visible by default */}
            <div className="space-y-3">
              <Label className="text-foreground font-semibold text-sm">
                Nhân vật
              </Label>
              
              {/* Smart Character Recommendations */}
              <CharacterTypeRecommendations
                topic={formData.topic}
                videoType={formData.video_type}
                industry={selectedTemplate?.industry?.[0]}
                selectedCharacterType={formData.character_type}
                onSelect={(value) => setFormData((prev) => ({ ...prev, character_type: value }))}
                enabled={!isLoading}
              />
              
              <CharacterTypeSelector
                value={formData.character_type}
                onChange={(value) => setFormData((prev) => ({ ...prev, character_type: value }))}
                disabled={isLoading}
              />
            </div>

            {/* Voice Region */}
            <VoiceRegionSelector
              value={formData.voice_region}
              onChange={(value) => setFormData((prev) => ({ ...prev, voice_region: value }))}
              disabled={isLoading}
            />

            {/* Dialogue Style */}
            <DialogueStyleSelector
              value={formData.dialogue_style}
              onChange={(value) => setFormData((prev) => ({ ...prev, dialogue_style: value }))}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Sẵn sàng tạo kịch bản!</h3>
              <p className="text-sm text-muted-foreground">Xem lại thông tin trước khi tạo</p>
            </div>

            {/* Summary */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Mục đích</p>
                    <p className="text-sm font-medium">
                      {formData.script_purpose === 'ai_video_veo3' && 'Video AI (VEO 3)'}
                      {formData.script_purpose === 'ai_video_minimax' && 'Video AI (Minimax)'}
                      {formData.script_purpose === 'teleprompter' && 'Quay người thật'}
                      {formData.script_purpose === 'voiceover' && 'Voice-Over / TTS'}
                      {formData.script_purpose === 'production' && 'Production Script'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Chủ đề</p>
                    <p className="text-sm font-medium">{formData.topic}</p>
                  </div>
                </div>

                {formData.hook && (
                  <div className="flex items-start gap-3">
                    <Zap className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Hook</p>
                      <p className="text-sm">"{formData.hook.opening_line}"</p>
                    </div>
                  </div>
                )}

                {formData.angle && (
                  <div className="flex items-start gap-3">
                    <Target className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Góc tiếp cận</p>
                      <p className="text-sm">{TOPIC_ANGLE_LABELS[formData.angle].icon} {TOPIC_ANGLE_LABELS[formData.angle].label}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Cấu hình</p>
                    <p className="text-sm">{formData.duration}s • {formData.video_type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Giọng & Phong cách</p>
                    <p className="text-sm">
                      {formData.voice_region === 'northern' && '🏛️ Miền Bắc'}
                      {formData.voice_region === 'central' && '🏯 Miền Trung'}
                      {formData.voice_region === 'southern' && '🌴 Miền Nam'}
                      {' • '}
                      {formData.dialogue_style === 'monologue' && '🎤 Độc thoại'}
                      {formData.dialogue_style === 'conversational' && '💬 Trò chuyện'}
                      {formData.dialogue_style === 'internal' && '🧠 Suy tư'}
                      {formData.dialogue_style === 'narrative' && '📖 Kể chuyện'}
                    </p>
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Brand</p>
                      <p className="text-sm">{selectedTemplate.name}</p>
                    </div>
                  </div>
                )}
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
                disabled={isLoading}
                placeholder="Chọn chiến dịch..."
                showActiveOnly={true}
              />
            </div>
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

        {currentStep < 5 ? (
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

      {/* Estimated time */}
      {currentStep === 5 && !isLoading && (
        <p className="text-center text-xs text-muted-foreground">
          Thời gian ước tính: ~15-30 giây
        </p>
      )}
    </div>
  );
}
