import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, Library, Wand2, ChevronDown, ChevronUp, X, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useScriptTopicSuggestions } from '@/hooks/useScriptTopicSuggestions';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
import { HookLibrary } from '@/components/script/HookLibrary';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { DurationSelector } from '@/components/script/DurationSelector';
import { VideoTypeSelector } from '@/components/script/VideoTypeSelector';
import { CharacterTypeSelector } from '@/components/script/CharacterTypeSelector';
import { cn } from '@/lib/utils';
import { 
  ScriptFormData, 
  VideoType, 
  CharacterType, 
  Duration,
  HookDetails,
} from '@/types/script';
import { FRAMEWORK_LABELS, FRAMEWORK_ICONS } from '@/types/hook';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
}

const LOADING_PHASES = [
  'Đang phân tích chủ đề...',
  'Đang tạo cấu trúc kịch bản...',
  'Đang viết nội dung...',
  'Hoàn thiện kịch bản...',
];

const MAX_TOPIC_LENGTH = 300;

export function ScriptForm({ onSubmit, isLoading }: ScriptFormProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();

  const [brandValue, setBrandValue] = useState<string>('none');
  const [brandTouched, setBrandTouched] = useState(false);
  const [hookLibraryOpen, setHookLibraryOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const [formData, setFormData] = useState<ScriptFormData>({
    topic: '',
    duration: 60,
    video_type: 'expert_share',
    character_type: 'male_expert',
    brandTemplateId: undefined,
    hook: undefined,
  });

  // Selected hook for display
  const selectedHook = formData.hook;
  const selectedTemplate = templates.find((t) => t.id === formData.brandTemplateId);

  // Handler for hook selection
  const handleSelectHook = (hook: HookDetails) => {
    setFormData(prev => ({ ...prev, hook }));
    toast.success('Đã chọn hook');
  };

  // Handler for removing hook
  const handleRemoveHook = () => {
    setFormData(prev => ({ ...prev, hook: undefined }));
    toast.success('Đã xóa hook');
  };

  // AI Topic Suggestions
  const {
    suggestions: topicSuggestions,
    source: suggestionsSource,
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions,
  } = useScriptTopicSuggestions({
    videoType: formData.video_type,
    brandTemplateId: formData.brandTemplateId,
    industry: selectedTemplate?.industry?.[0],
    enabled: true,
  });

  // Cycle through loading phases
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

  // Set default template once
  useEffect(() => {
    if (templatesLoading) return;
    if (brandTouched) return;
    if (templates.length === 0) return;
    if (brandValue !== 'none') return;

    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    if (!defaultTemplate) return;

    setBrandValue(defaultTemplate.id);
    setFormData((prev) => ({ ...prev, brandTemplateId: defaultTemplate.id }));
  }, [templatesLoading, templates, brandTouched, brandValue]);

  // selectedTemplate already declared above

  // Character count color
  const topicLength = formData.topic.length;
  const charCountColor = useMemo(() => {
    if (topicLength === 0) return 'text-muted-foreground';
    if (topicLength < 20) return 'text-amber-500';
    if (topicLength > MAX_TOPIC_LENGTH * 0.9) return 'text-destructive';
    return 'text-green-500';
  }, [topicLength]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) {
      toast.error('Vui lòng nhập chủ đề video');
      return;
    }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg glow-primary animate-pulse-glow">
          <Wand2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tạo kịch bản AI</h2>
          <p className="text-sm text-muted-foreground">
            Nhập chủ đề và để AI viết kịch bản chuyên nghiệp cho bạn
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="w-3 h-3" />
          AI Powered
        </Badge>
      </div>

      {/* Topic Input Section */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <Label htmlFor="topic" className="text-foreground font-semibold text-sm flex items-center gap-2">
            Chủ đề video
            <span className="text-primary">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHookLibraryOpen(true)}
            className="h-7 text-xs gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/5"
          >
            <Library className="h-3.5 w-3.5 text-primary" />
            Hook Library
          </Button>
        </div>
        
        <div className="relative group">
          <Textarea
            id="topic"
            placeholder="Nhập chủ đề video của bạn, ví dụ: 5 sai lầm phổ biến khi đầu tư chứng khoán mà người mới thường mắc phải..."
            value={formData.topic}
            onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value.slice(0, MAX_TOPIC_LENGTH) }))}
            className={cn(
              "min-h-[100px] bg-muted/30 border-2 resize-none text-sm transition-all duration-300",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
              "placeholder:text-muted-foreground/60"
            )}
            disabled={isLoading}
          />
          
          {/* Character counter */}
          <div className={cn(
            "absolute bottom-2 right-3 text-xs font-medium transition-colors",
            charCountColor
          )}>
            {topicLength}/{MAX_TOPIC_LENGTH}
          </div>
        </div>

        {/* AI Topic Suggestions */}
        <TopicSuggestionPanel
          suggestions={topicSuggestions}
          source={suggestionsSource}
          isLoading={suggestionsLoading}
          onSelect={(suggestion) => {
            setFormData((prev) => ({ ...prev, topic: suggestion }));
            toast.success('Đã chọn chủ đề gợi ý');
          }}
          onRefresh={refreshSuggestions}
          disabled={isLoading}
        />
      </div>

      {/* Selected Hook Display */}
      {selectedHook && (
        <Card className="border-primary/30 bg-primary/5 animate-scale-in">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{FRAMEWORK_ICONS[selectedHook.framework || ''] || '🎣'}</span>
                <span className="font-medium text-sm">
                  {FRAMEWORK_LABELS[selectedHook.framework || ''] || 'Hook đã chọn'}
                </span>
                <Badge variant="secondary" className="text-xs">Đã chọn</Badge>
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
            </div>
            <div className="bg-background/80 rounded-lg p-3 border border-border/50">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                🎬 "{selectedHook.opening_line}"
              </p>
            </div>
            {(selectedHook.visual_direction || selectedHook.text_overlay) && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {selectedHook.visual_direction && (
                  <p>👁️ <span className="text-foreground/80">{selectedHook.visual_direction}</span></p>
                )}
                {selectedHook.text_overlay && (
                  <p>📱 <span className="text-foreground/80">{selectedHook.text_overlay}</span></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hook Suggestion when topic is present */}
      {formData.topic.trim() && !selectedHook && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed border-border animate-fade-in">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            Thêm Hook để mở đầu ấn tượng hơn?
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHookLibraryOpen(true)}
            className="ml-auto h-7 text-xs gap-1.5"
          >
            <Library className="h-3.5 w-3.5" />
            Mở Hook Library
          </Button>
        </div>
      )}

      {/* Hook Library Sheet */}
      <HookLibrary
        open={hookLibraryOpen}
        onOpenChange={setHookLibraryOpen}
        brandTemplateId={formData.brandTemplateId}
        initialTopic={formData.topic}
        brandVoice={selectedTemplate ? {
          brand_name: selectedTemplate.brand_name,
          tone_of_voice: selectedTemplate.tone_of_voice || undefined,
          formality_level: selectedTemplate.formality_level || undefined,
          preferred_words: selectedTemplate.preferred_words || undefined,
          forbidden_words: selectedTemplate.forbidden_words || undefined,
          brand_positioning: selectedTemplate.brand_positioning || undefined,
        } : undefined}
        onSelectHook={handleSelectHook}
      />

      {/* Brand Template Section */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center justify-between">
          <Label htmlFor="brandTemplate" className="text-foreground font-semibold text-sm">
            Brand Template
            <span className="text-xs text-muted-foreground ml-2">(Brand Voice)</span>
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
              toast.success(value === 'none' ? 'Đã bỏ chọn Brand' : 'Đã chọn Brand');
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
                        style={{ backgroundColor: template.primary_color, boxShadow: `0 0 8px ${template.primary_color}40` }}
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
          <div className="animate-scale-in">
            <BrandPreviewCard template={selectedTemplate} defaultOpen={false} />
          </div>
        )}
      </div>

      {/* Duration Section */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '200ms' }}>
        <Label className="text-foreground font-semibold text-sm">
          Thời lượng video
        </Label>
        <DurationSelector
          value={formData.duration}
          onChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
          disabled={isLoading}
        />
      </div>

      {/* Video Type Section */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '250ms' }}>
        <Label className="text-foreground font-semibold text-sm">
          Thể loại video
        </Label>
        <VideoTypeSelector
          value={formData.video_type}
          onChange={(value) => setFormData((prev) => ({ ...prev, video_type: value }))}
          disabled={isLoading}
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAdvanced ? 'Ẩn cài đặt nâng cao' : 'Hiện cài đặt nâng cao'}
      </button>

      {/* Character Type Section - Collapsible */}
      {showAdvanced && (
        <div className="space-y-3 animate-slide-up">
          <Label className="text-foreground font-semibold text-sm">
            Nhân vật
          </Label>
          <CharacterTypeSelector
            value={formData.character_type}
            onChange={(value) => setFormData((prev) => ({ ...prev, character_type: value }))}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2 stagger-item" style={{ animationDelay: '300ms' }}>
        <Button
          type="submit"
          disabled={isLoading || !formData.topic.trim()}
          className={cn(
            "w-full h-12 gradient-primary hover:opacity-90 transition-all duration-300 font-semibold text-base relative overflow-hidden group",
            !isLoading && "glow-primary"
          )}
        >
          {/* Shimmer effect */}
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
              <Sparkles className="w-5 h-5 mr-2" />
              <span>Tạo kịch bản AI</span>
            </>
          )}
        </Button>
        
        {/* Estimated time */}
        {!isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Thời gian ước tính: ~15-30 giây
          </p>
        )}
      </div>
    </form>
  );
}
