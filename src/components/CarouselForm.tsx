import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CarouselFormData,
  CarouselSlide,
  StructuredTextContent,
  Platform,
  CarouselStyleType,
  VisualPresetType,
  DEFAULT_BRAND_GUIDELINE,
} from '@/types/carousel';
import { CarouselLayoutPreview } from '@/components/carousel/CarouselLayoutPreview';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { PlatformSelector } from '@/components/carousel/PlatformSelector';
import { CarouselStyleSelector } from '@/components/carousel/CarouselStyleSelector';
import { VisualPresetSelector } from '@/components/carousel/VisualPresetSelector';
import { SlideCountSelector } from '@/components/carousel/SlideCountSelector';

import { TopicIdeaHub } from '@/components/topic/TopicIdeaHub';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { 
  Images, 
  Loader2, 
  Sparkles, 
  Wand2,
  Book,
  MessageSquare,
  ChevronDown,
  Palette,
  Settings2,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CarouselFormProps {
  onSubmit: (data: CarouselFormData) => void;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
}

const LOADING_PHASES = [
  { label: 'Phân tích chủ đề & ngữ cảnh thương hiệu', icon: '🔍', duration: '~5s' },
  { label: 'Thiết kế cấu trúc carousel', icon: '🏗️', duration: '~10s' },
  { label: 'Viết nội dung từng slide', icon: '✍️', duration: '~15s' },
  { label: 'Hoàn thiện & tối ưu prompt ảnh', icon: '✨', duration: '~5s' },
];

const MAX_TOPIC_LENGTH = 300;

// Step numbering component
function StepNumber({ step, active = true }: { step: number; active?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors",
      active
        ? "gradient-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground"
    )}>
      {step}
    </span>
  );
}

export function CarouselForm({ onSubmit, isLoading, initialTopic, topicHistoryId }: CarouselFormProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const { currentBrand } = useCurrentBrand();
  const topicInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [topic, setTopic] = useState(initialTopic || '');
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
  const [designOpen, setDesignOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyleType>('educational');
  const [slideCount, setSlideCount] = useState(6);
  
  const [visualPreset, setVisualPreset] = useState<VisualPresetType>('minimalist');
  
  // Brand fields - auto-loaded from template, hidden from UI
  const [brandName, setBrandName] = useState('Thuế Hộ by TAF.vn');
  const [brandGuideline, setBrandGuideline] = useState(DEFAULT_BRAND_GUIDELINE);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingPhase, setLoadingPhase] = useState(0);

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

  // Auto-load brand template silently
  useEffect(() => {
    if (!templatesLoading && templates.length > 0 && !selectedTemplateId) {
      const initialBrand = currentBrand
        ? templates.find(t => t.id === currentBrand.id)
        : templates.find(t => t.is_default);
      if (initialBrand) {
        applyTemplate(initialBrand);
        setSelectedTemplateId(initialBrand.id);
      }
    }
  }, [templatesLoading, templates, selectedTemplateId, currentBrand]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const {
    suggestions: enhancedSuggestions,
    source: suggestionsSource,
    isEnhancing: suggestionsLoading,
    refresh: refreshSuggestions,
    saveSuggestion,
    submitFeedback,
  } = useEnhancedTopicSuggestions({
    brandTemplateId: selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
    contentGoal: 'education',
    format: 'carousel',
    enabled: true,
  });

  const charCountColor = useMemo(() => {
    const length = topic.length;
    if (length === 0) return 'text-muted-foreground';
    if (length < 20) return 'text-amber-500';
    if (length > MAX_TOPIC_LENGTH * 0.9) return 'text-destructive';
    return 'text-green-500';
  }, [topic.length]);

  const applyTemplate = (template: BrandTemplate) => {
    setBrandName(template.brand_name);
    setBrandGuideline(template.brand_guideline);
    setIncludeLogo(template.include_logo);
  };

  const getSelectedLogoUrl = (): string | null => {
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const template = templates.find(t => t.id === selectedTemplateId);
      return template?.logo_url || null;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent, autoGenerateImages = false) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề carousel');
      return;
    }

    onSubmit({
      topic: topic.trim(),
      platform,
      slideCount,
      aiTool: 'ideogram', // Legacy field, backend uses ai_function_configs
      brandName: brandName.trim(),
      brandGuideline: brandGuideline.trim(),
      includeLogo,
      logoUrl: getSelectedLogoUrl(),
      brandTemplateId: selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
      topicHistoryId,
      carouselStyle,
      visualPreset,
      autoGenerateImages,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ══════════════════════════════════════════════
          STEP 1: Chủ đề
         ══════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <StepNumber step={1} />
          <Label htmlFor="topic" className="text-foreground font-bold text-sm">
            Chủ đề Carousel
          </Label>
          <span className="text-primary text-sm font-bold">*</span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowBrainstormSheet(true)}
            className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Brainstorm AI
          </Button>
          {selectedTemplate?.industry_template_id && (
            <GlossaryQuickLookup
              industryTemplateId={selectedTemplate.industry_template_id}
              onInsertTerm={(term) => {
                const input = topicInputRef.current;
                if (input) {
                  const cursorPos = input.selectionStart || topic.length;
                  const before = topic.slice(0, cursorPos);
                  const after = topic.slice(cursorPos);
                  setTopic((before + term + after).slice(0, MAX_TOPIC_LENGTH));
                  setTimeout(() => {
                    input.focus();
                    const newPos = cursorPos + term.length;
                    input.setSelectionRange(newPos, newPos);
                  }, 0);
                } else {
                  setTopic((topic + ' ' + term).slice(0, MAX_TOPIC_LENGTH));
                }
              }}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Book className="h-3 w-3" />
                  Từ điển
                </Button>
              }
            />
          )}
        </div>

        <div className="relative group">
          <Textarea
            ref={topicInputRef}
            id="topic"
            rows={1}
            placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, MAX_TOPIC_LENGTH))}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 200) + 'px';
            }}
            disabled={isLoading}
            className={cn(
              "bg-background border border-border/80 min-h-[72px] max-h-[200px] resize-none text-sm transition-all duration-200 pr-16",
              "focus:border-primary/60 focus:ring-1 focus:ring-primary/20",
              "placeholder:text-muted-foreground/50"
            )}
          />
          <div className={cn(
            "absolute bottom-2 right-3 text-[10px] font-medium transition-colors tabular-nums",
            charCountColor
          )}>
            {topic.length}/{MAX_TOPIC_LENGTH}
          </div>
        </div>
        
        <TopicIdeaHub
          suggestions={enhancedSuggestions}
          source={suggestionsSource}
          isLoading={suggestionsLoading}
          onSelect={(suggestion) => setTopic(suggestion)}
          onRefresh={refreshSuggestions}
          onSave={saveSuggestion}
          onFeedback={submitFeedback}
          disabled={isLoading}
          showEnhancedInfo={true}
          brandTemplateId={selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined}
          contentGoal="education"
        />
      </section>

      <div className="h-px bg-border/60" />

      {/* ══════════════════════════════════════════════
          STEP 2: Phong cách nội dung
         ══════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <StepNumber step={2} />
          <Label className="text-foreground font-bold text-sm flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            Phong cách nội dung
          </Label>
        </div>
        <CarouselStyleSelector
          value={carouselStyle}
          onChange={setCarouselStyle}
          disabled={isLoading}
        />
      </section>

      <div className="h-px bg-border/60" />

      {/* ══════════════════════════════════════════════
          STEP 3: Phong cách thiết kế (collapsible)
         ══════════════════════════════════════════════ */}
      <Collapsible open={designOpen} onOpenChange={setDesignOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 w-full text-left group"
          >
            <StepNumber step={3} />
            <Label className="text-foreground font-bold text-sm flex items-center gap-1.5 cursor-pointer">
              <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              Phong cách thiết kế ảnh
            </Label>
            <div className="flex-1" />
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              designOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <VisualPresetSelector
            value={visualPreset}
            onChange={setVisualPreset}
            disabled={isLoading}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="h-px bg-border/60" />

      {/* ══════════════════════════════════════════════
          STEP 4: Cài đặt (collapsible)
         ══════════════════════════════════════════════ */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 w-full text-left group"
          >
            <StepNumber step={4} />
            <Label className="text-foreground font-bold text-sm flex items-center gap-1.5 cursor-pointer">
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              Cài đặt
            </Label>
            {/* Inline summary when collapsed */}
            {!settingsOpen && (
              <div className="flex items-center gap-2 ml-1">
                <Badge variant="secondary" className="text-[10px] h-5 font-normal gap-1">
                  {platform === 'facebook' ? 'Facebook' : 'TikTok'}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                  {slideCount} slides
                </Badge>
              </div>
            )}
            <div className="flex-1" />
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              settingsOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-medium">Nền tảng</Label>
              <PlatformSelector
                value={platform}
                onChange={setPlatform}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-medium">Số lượng slide</Label>
              <SlideCountSelector
                value={slideCount}
                onChange={setSlideCount}
                disabled={isLoading}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ══════════════════════════════════════════════
          Submit Buttons & Loading State
         ══════════════════════════════════════════════ */}
      <div className="pt-1 space-y-3">
        {isLoading ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              {LOADING_PHASES.map((phase, idx) => {
                const isActive = idx === loadingPhase;
                const isDone = idx < loadingPhase;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500",
                      isActive && "bg-primary/10 border border-primary/20",
                      isDone && "opacity-50",
                      !isActive && !isDone && "opacity-25"
                    )}
                  >
                    <span className="text-sm w-5 text-center">
                      {isDone ? '✅' : isActive ? (
                        <span className="inline-block animate-pulse">{phase.icon}</span>
                      ) : phase.icon}
                    </span>
                    <span className={cn(
                      "text-xs flex-1",
                      isActive && "font-medium text-foreground",
                      isDone && "text-muted-foreground line-through",
                      !isActive && !isDone && "text-muted-foreground"
                    )}>
                      {phase.label}
                    </span>
                    {isActive && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full gradient-primary transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(((loadingPhase + 1) / LOADING_PHASES.length) * 100, 100)}%` }}
                />
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                Bước {loadingPhase + 1}/{LOADING_PHASES.length} · Đừng đóng trang này
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="submit"
                disabled={!topic.trim()}
                variant="outline"
                className="h-11 font-semibold text-xs transition-all duration-200 border-border hover:border-primary/50 hover:bg-primary/5"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Tạo Prompt
              </Button>

              <Button
                type="button"
                disabled={!topic.trim()}
                onClick={(e) => handleSubmit(e as any, true)}
                className={cn(
                  "h-11 gradient-primary hover:opacity-90 transition-all duration-200 font-semibold text-xs relative overflow-hidden group"
                )}
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <Images className="w-3.5 h-3.5 mr-1.5" />
                Tạo Prompt + Ảnh
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              ⏱ ~20-40s (Prompt) · ~1-2 phút (Prompt + Ảnh)
            </p>
          </>
        )}
      </div>

      {/* Topic Brainstorm Sheet */}
      <TopicBrainstormSheet
        open={showBrainstormSheet}
        onOpenChange={setShowBrainstormSheet}
        brandTemplateId={selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined}
        contentGoal="education"
        onSelectTopic={(t) => {
          setTopic(t);
          toast.success('Đã chọn chủ đề từ AI Brainstorm');
        }}
      />
    </form>
  );
}
