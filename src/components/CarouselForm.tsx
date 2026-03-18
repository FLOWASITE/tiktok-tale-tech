import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CarouselFormData,
  Platform,
  AITool,
  CarouselStyleType,
  DEFAULT_BRAND_GUIDELINE,
} from '@/types/carousel';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
import { PlatformSelector } from '@/components/carousel/PlatformSelector';
import { CarouselStyleSelector } from '@/components/carousel/CarouselStyleSelector';
import { SlideCountSelector } from '@/components/carousel/SlideCountSelector';
import { AIToolSelector } from '@/components/carousel/AIToolSelector';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { GlossaryQuickLookup } from '@/components/GlossaryQuickLookup';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { 
  Images, 
  Loader2, 
  Save, 
  Trash2, 
  Bookmark, 
  Sparkles, 
  Wand2,
  ChevronDown,
  ChevronUp,
  Book,
  Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const { templates, loading: templatesLoading, saveTemplate, deleteTemplate } = useBrandTemplates();
  const { currentBrand } = useCurrentBrand();
  const topicInputRef = useRef<HTMLInputElement>(null);
  
  const [topic, setTopic] = useState(initialTopic || '');

  // Handle initialTopic prop changes
  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyleType>('educational');
  const [slideCount, setSlideCount] = useState(6);
  const [aiTool, setAiTool] = useState<AITool>('ideogram');
  const [brandName, setBrandName] = useState('Thuế Hộ by TAF.vn');
  const [brandGuideline, setBrandGuideline] = useState(DEFAULT_BRAND_GUIDELINE);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Loading phases animation
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

  // Load default template from global brand context or default on mount
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

  // Topic suggestions - unified AI engine
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

  // Character count color
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

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') {
      setBrandName('');
      setBrandGuideline('');
      setIncludeLogo(true);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        applyTemplate(template);
        toast.success('Đã chọn Brand Template');
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !brandName.trim() || !brandGuideline.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const result = await saveTemplate({
      name: newTemplateName.trim(),
      brand_name: brandName.trim(),
      industry: null,
      brand_guideline: brandGuideline.trim(),
      include_logo: includeLogo,
      is_default: false,
      logo_url: null,
      primary_color: '#000000',
      industry_template_id: null,
      brand_positioning: null,
      tone_of_voice: null,
      formality_level: null,
      language_style: null,
      preferred_words: null,
      forbidden_words: null,
      allow_emoji: true,
      compliance_rules: null,
      channel_overrides: null,
      sample_texts: null,
      content_pillars: [],
    });

    if (result) {
      setSaveDialogOpen(false);
      setNewTemplateName('');
      setSelectedTemplateId(result.id);
    }
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
      campaignId: selectedCampaignId,
      carouselStyle,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2 animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg glow-primary animate-pulse-glow">
          <Wand2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tạo Carousel AI</h2>
          <p className="text-sm text-muted-foreground">
            Nhập chủ đề và để AI tạo prompts carousel chuyên nghiệp
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="w-3 h-3" />
          AI Powered
        </Badge>
      </div>

      {/* Topic Input */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <Label htmlFor="topic" className="text-foreground font-semibold text-sm flex items-center gap-2">
            Chủ đề Carousel
            <span className="text-primary">*</span>
          </Label>
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
          <Input
            ref={topicInputRef}
            id="topic"
            placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, MAX_TOPIC_LENGTH))}
            disabled={isLoading}
            className={cn(
              "bg-muted/30 border-2 h-11 text-sm transition-all duration-300",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
              "placeholder:text-muted-foreground/60"
            )}
          />
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 right-3 text-xs font-medium transition-colors",
            charCountColor
          )}>
            {topic.length}/{MAX_TOPIC_LENGTH}
          </div>
        </div>
        
        {/* Topic Suggestions */}
        <TopicSuggestionPanel
          suggestions={enhancedSuggestions}
          source={suggestionsSource}
          isLoading={suggestionsLoading}
          onSelect={(suggestion) => setTopic(suggestion)}
          onRefresh={refreshSuggestions}
          onSave={saveSuggestion}
          onFeedback={submitFeedback}
          disabled={isLoading}
          showEnhancedInfo={true}
        />
      </div>

      {/* Platform Selector */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '150ms' }}>
        <Label className="text-foreground font-semibold text-sm">
          Nền tảng
        </Label>
        <PlatformSelector
          value={platform}
          onChange={setPlatform}
          disabled={isLoading}
        />
      </div>

      {/* Slide Count Selector */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '200ms' }}>
        <Label className="text-foreground font-semibold text-sm">
          Số lượng ảnh
        </Label>
        <SlideCountSelector
          value={slideCount}
          onChange={setSlideCount}
          disabled={isLoading}
        />
      </div>

      {/* AI Tool Selector */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '250ms' }}>
        <Label className="text-foreground font-semibold text-sm">
          Công cụ tạo ảnh AI
        </Label>
        <AIToolSelector
          value={aiTool}
          onChange={setAiTool}
          disabled={isLoading}
        />
      </div>

      {/* Brand Template Section */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-semibold text-sm flex items-center gap-1.5">
            <Bookmark className="w-4 h-4" />
            Brand Template
          </Label>
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Sparkles className="w-3 h-3" />
                Applied
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              className="h-7 text-xs px-2 gap-1"
            >
              <Save className="w-3 h-3" />
              Lưu
            </Button>
          </div>
        </div>
        
        {templatesLoading ? (
          <div className="h-10 bg-muted/50 border border-border rounded-lg flex items-center px-3 animate-pulse">
            <span className="text-sm text-muted-foreground">Đang tải templates...</span>
          </div>
        ) : (
          <Select value={selectedTemplateId} onValueChange={handleTemplateChange} disabled={isLoading}>
            <SelectTrigger className="bg-muted/30 border-2 border-border focus:border-primary text-sm h-10 transition-all">
              <SelectValue placeholder="Chọn template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom" className="text-sm">
                <span className="text-muted-foreground">Tùy chỉnh mới...</span>
              </SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id} className="text-sm">
                  <span className="flex items-center gap-2">
                    {template.primary_color && (
                      <span
                        className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background"
                        style={{ backgroundColor: template.primary_color }}
                      />
                    )}
                    {template.logo_url && !template.primary_color && (
                      <img src={template.logo_url} alt="" className="w-4 h-4 rounded object-contain" />
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

      {/* Campaign Selector */}
      <div className="space-y-3 stagger-item" style={{ animationDelay: '350ms' }}>
        <Label className="text-foreground font-semibold text-sm flex items-center gap-1.5">
          <Megaphone className="w-4 h-4" />
          Liên kết với Chiến dịch
          <span className="text-xs text-muted-foreground ml-1">(tùy chọn)</span>
        </Label>
        <CampaignSelector
          value={selectedCampaignId}
          onValueChange={setSelectedCampaignId}
          disabled={isLoading}
          placeholder="Chọn chiến dịch..."
          showActiveOnly={true}
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAdvanced ? 'Ẩn cài đặt nâng cao' : 'Cài đặt nâng cao (Brand, Logo)'}
      </button>

      {/* Advanced Settings - Collapsible */}
      {showAdvanced && (
        <div className="space-y-4 animate-fade-in">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName" className="text-foreground font-semibold text-sm">
              Tên Brand
            </Label>
            <Input
              id="brandName"
              placeholder="VD: Thuế Hộ by TAF.vn"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={isLoading}
              className="bg-muted/30 border-2 border-border focus:border-primary text-sm h-10"
            />
          </div>

          {/* Brand Guideline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="brandGuideline" className="text-foreground font-semibold text-sm">
                Brand Guideline
              </Label>
              {selectedTemplateId && selectedTemplateId !== 'custom' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Xóa Template
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận xóa template</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa template này? Hành động này không thể hoàn tác.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteTemplate(selectedTemplateId);
                          setSelectedTemplateId('custom');
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Textarea
              id="brandGuideline"
              placeholder="Nhập hướng dẫn về thương hiệu..."
              value={brandGuideline}
              onChange={(e) => setBrandGuideline(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="bg-muted/30 border-2 border-border focus:border-primary text-sm min-h-[100px]"
            />
          </div>

          {/* Include Logo */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Checkbox
              id="includeLogo"
              checked={includeLogo}
              onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="includeLogo" className="text-sm font-normal cursor-pointer">
              Bao gồm logo trong thiết kế
            </Label>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2 stagger-item" style={{ animationDelay: '350ms' }}>
        <Button
          type="submit"
          disabled={!topic.trim() || isLoading}
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
              <Images className="w-5 h-5 mr-2" />
              <span>Tạo Prompt Carousel</span>
            </>
          )}
        </Button>
        
        {/* Estimated time */}
        {!isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Thời gian ước tính: ~20-40 giây
          </p>
        )}
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lưu Brand Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Tên Template</Label>
              <Input
                id="templateName"
                placeholder="VD: Template chính của công ty"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
              <p className="font-medium mb-2">Sẽ lưu:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Tên brand: {brandName || '(chưa nhập)'}</li>
                <li>Brand guideline: {brandGuideline ? `${brandGuideline.slice(0, 40)}...` : '(chưa nhập)'}</li>
                <li>Logo: {includeLogo ? 'Có' : 'Không'}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Lưu Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
