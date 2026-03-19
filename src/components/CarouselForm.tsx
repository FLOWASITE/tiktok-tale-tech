import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CarouselFormData,
  Platform,
  AITool,
  CarouselStyleType,
  VisualPresetType,
  DEFAULT_BRAND_GUIDELINE,
} from '@/types/carousel';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { PlatformSelector } from '@/components/carousel/PlatformSelector';
import { CarouselStyleSelector } from '@/components/carousel/CarouselStyleSelector';
import { SlideCountSelector } from '@/components/carousel/SlideCountSelector';
import { AIToolSelector } from '@/components/carousel/AIToolSelector';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CarouselFormProps {
  onSubmit: (data: CarouselFormData) => void;
  isLoading: boolean;
  initialTopic?: string;
  topicHistoryId?: string;
}

const LOADING_PHASES = [
  'Đang phân tích chủ đề...',
  'Đang tạo cấu trúc carousel...',
  'Đang viết nội dung slides...',
  'Hoàn thiện prompts...',
];

const MAX_TOPIC_LENGTH = 300;

export function CarouselForm({ onSubmit, isLoading, initialTopic, topicHistoryId }: CarouselFormProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const { currentBrand } = useCurrentBrand();
  const topicInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [topic, setTopic] = useState(initialTopic || '');
  const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyleType>('educational');
  const [slideCount, setSlideCount] = useState(6);
  const [aiTool, setAiTool] = useState<AITool>('ideogram');
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề carousel');
      return;
    }

    onSubmit({
      topic: topic.trim(),
      platform,
      slideCount,
      aiTool,
      brandName: brandName.trim(),
      brandGuideline: brandGuideline.trim(),
      includeLogo,
      logoUrl: getSelectedLogoUrl(),
      brandTemplateId: selectedTemplateId && selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
      topicHistoryId,
      carouselStyle,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Compact Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary shadow-md">
          <Wand2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Tạo Carousel AI</h2>
            <Badge variant="secondary" className="gap-1 text-[10px] h-5">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Nhập chủ đề và để AI tạo prompts carousel chuyên nghiệp
          </p>
        </div>
      </div>

      {/* Topic Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="topic" className="text-foreground font-semibold text-sm flex items-center gap-2">
              Chủ đề Carousel
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
                  className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
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
              "bg-muted/30 border-2 min-h-[80px] max-h-[200px] resize-none text-base transition-all duration-300 pr-20",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <div className={cn(
            "absolute bottom-2 right-3 text-xs font-medium transition-colors",
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
      </div>

      {/* Carousel Style Selector */}
      <div className="space-y-2">
        <Label className="text-foreground font-semibold text-sm">
          Phong cách Carousel
        </Label>
        <CarouselStyleSelector
          value={carouselStyle}
          onChange={setCarouselStyle}
          disabled={isLoading}
        />
      </div>

      {/* Cài đặt tạo ảnh */}
      <div className="space-y-4 p-4 rounded-xl border border-border/60 bg-muted/10">
        <Label className="text-foreground font-semibold text-sm flex items-center gap-1.5">
          <Images className="w-4 h-4" />
          Cài đặt tạo ảnh
        </Label>

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
            <Label className="text-muted-foreground text-xs font-medium">Số lượng ảnh</Label>
            <SlideCountSelector
              value={slideCount}
              onChange={setSlideCount}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={!topic.trim() || isLoading}
          className={cn(
            "w-full h-12 gradient-primary hover:opacity-90 transition-all duration-300 font-semibold text-base relative overflow-hidden group",
            !isLoading && "glow-primary"
          )}
        >
          {!isLoading && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
          
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="animate-pulse">{LOADING_PHASES[loadingPhase]}</span>
            </div>
          ) : (
            <>
              <Images className="w-5 h-5 mr-2" />
              <span>Tạo Prompt Carousel</span>
            </>
          )}
        </Button>
        
        {!isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Thời gian ước tính: ~20-40 giây
          </p>
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
