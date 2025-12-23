import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DEFAULT_BRAND_GUIDELINE,
  PLATFORM_OPTIONS,
  AI_TOOL_OPTIONS,
  SLIDE_COUNT_OPTIONS,
} from '@/types/carousel';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
import { Images, Loader2, Save, Trash2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
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
}

export function CarouselForm({ onSubmit, isLoading }: CarouselFormProps) {
  const { templates, loading: templatesLoading, saveTemplate, deleteTemplate } = useBrandTemplates();
  
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [slideCount, setSlideCount] = useState(6);
  const [aiTool, setAiTool] = useState<AITool>('ideogram');
  const [brandName, setBrandName] = useState('Thuế Hộ by TAF.vn');
  const [brandGuideline, setBrandGuideline] = useState(DEFAULT_BRAND_GUIDELINE);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Load default template on mount
  useEffect(() => {
    if (!templatesLoading && templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        applyTemplate(defaultTemplate);
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [templatesLoading, templates, selectedTemplateId]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const applyTemplate = (template: BrandTemplate) => {
    setBrandName(template.brand_name);
    setBrandGuideline(template.brand_guideline);
    setIncludeLogo(template.include_logo);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') {
      // Reset to default values for custom
      setBrandName('');
      setBrandGuideline('');
      setIncludeLogo(true);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        applyTemplate(template);
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
      // Brand Voice defaults
      brand_positioning: null,
      tone_of_voice: null,
      formality_level: null,
      language_style: null,
      preferred_words: null,
      forbidden_words: null,
      allow_emoji: true,
      compliance_rules: null,
      channel_overrides: null,
    });

    if (result) {
      setSaveDialogOpen(false);
      setNewTemplateName('');
      setSelectedTemplateId(result.id);
    }
  };

  // Get selected template's logo URL
  const getSelectedLogoUrl = (): string | null => {
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const template = templates.find(t => t.id === selectedTemplateId);
      return template?.logo_url || null;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-5">
      {/* Topic */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label htmlFor="topic" className="text-xs xs:text-sm font-medium">
          Chủ đề Carousel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="topic"
          placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary text-sm xs:text-base h-9 xs:h-10"
        />
      </div>

      {/* Platform & Slide Count */}
      <div className="grid grid-cols-2 gap-2 xs:gap-4">
        <div className="space-y-1.5 xs:space-y-2">
          <Label className="text-xs xs:text-sm font-medium">Nền tảng</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="bg-background/50 border-border/50 text-xs xs:text-sm h-9 xs:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs xs:text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 xs:space-y-2">
          <Label className="text-xs xs:text-sm font-medium">Số lượng ảnh</Label>
          <Select value={String(slideCount)} onValueChange={(v) => setSlideCount(Number(v))}>
            <SelectTrigger className="bg-background/50 border-border/50 text-xs xs:text-sm h-9 xs:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {SLIDE_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={String(count)} className="text-xs xs:text-sm">
                  {count} ảnh
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Tool */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label className="text-xs xs:text-sm font-medium">Công cụ tạo ảnh AI</Label>
        <Select value={aiTool} onValueChange={(v) => setAiTool(v as AITool)}>
          <SelectTrigger className="bg-background/50 border-border/50 text-xs xs:text-sm h-9 xs:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {AI_TOOL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs xs:text-sm">
                <div className="flex items-center gap-1 xs:gap-2">
                  <span>{opt.label}</span>
                  <span className="text-[10px] xs:text-xs text-muted-foreground hidden xs:inline">({opt.description})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Template Selector */}
      <div className="space-y-1.5 xs:space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs xs:text-sm font-medium flex items-center gap-1 xs:gap-1.5">
            <Bookmark className="w-3 h-3 xs:w-4 xs:h-4" />
            Brand Template
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            className="h-6 xs:h-7 text-[10px] xs:text-xs px-2"
          >
            <Save className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
            <span className="hidden xs:inline">Lưu Template</span>
            <span className="xs:hidden">Lưu</span>
          </Button>
        </div>
        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className="bg-background/50 border-border/50 text-xs xs:text-sm h-9 xs:h-10">
            <SelectValue placeholder="Chọn template..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="custom" className="text-xs xs:text-sm">
              <span className="text-muted-foreground">Tùy chỉnh mới...</span>
            </SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id} className="text-xs xs:text-sm">
                <div className="flex items-center gap-1.5 xs:gap-2">
                  {template.logo_url && (
                    <img src={template.logo_url} alt="" className="w-3 h-3 xs:w-4 xs:h-4 rounded object-contain" />
                  )}
                  {template.primary_color && !template.logo_url && (
                    <div 
                      className="w-3 h-3 xs:w-4 xs:h-4 rounded-full border border-border" 
                      style={{ backgroundColor: template.primary_color }}
                    />
                  )}
                  <span className="truncate max-w-[120px] xs:max-w-none">{template.name}</span>
                  {template.is_default && (
                    <span className="text-[10px] xs:text-xs text-primary hidden xs:inline">(Mặc định)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <BrandPreviewCard template={selectedTemplate} defaultOpen={true} />
        )}
      </div>

      {/* Brand Name */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label htmlFor="brandName" className="text-xs xs:text-sm font-medium">
          Tên Brand
        </Label>
        <Input
          id="brandName"
          placeholder="VD: Thuế Hộ by TAF.vn"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary text-sm xs:text-base h-9 xs:h-10"
        />
      </div>

      {/* Brand Guideline */}
      <div className="space-y-1.5 xs:space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="brandGuideline" className="text-xs xs:text-sm font-medium">
            Brand Guideline
          </Label>
          {selectedTemplateId && selectedTemplateId !== 'custom' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 xs:h-7 text-[10px] xs:text-xs text-destructive hover:text-destructive px-2"
                >
                  <Trash2 className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
                  <span className="hidden xs:inline">Xóa Template</span>
                  <span className="xs:hidden">Xóa</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] xs:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base xs:text-lg">Xác nhận xóa template</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs xs:text-sm">
                    Bạn có chắc chắn muốn xóa template này? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 xs:gap-0">
                  <AlertDialogCancel className="text-xs xs:text-sm h-8 xs:h-9">Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteTemplate(selectedTemplateId);
                      setSelectedTemplateId('custom');
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs xs:text-sm h-8 xs:h-9"
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
          className="bg-background/50 border-border/50 focus:border-primary text-xs xs:text-sm min-h-[80px] xs:min-h-[100px]"
        />
      </div>

      {/* Include Logo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeLogo"
          checked={includeLogo}
          onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
          className="w-4 h-4 xs:w-5 xs:h-5"
        />
        <Label htmlFor="includeLogo" className="text-xs xs:text-sm font-normal cursor-pointer">
          Bao gồm logo trong thiết kế
        </Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!topic.trim() || isLoading}
        className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-10 xs:h-11 text-sm xs:text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5 xs:mr-2 animate-spin" />
            <span className="text-xs xs:text-sm">Đang tạo prompts...</span>
          </>
        ) : (
          <>
            <Images className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5 xs:mr-2" />
            <span className="text-xs xs:text-sm">Tạo Prompt Carousel</span>
          </>
        )}
      </Button>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-[90vw] xs:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base xs:text-lg">Lưu Brand Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 xs:space-y-4 py-3 xs:py-4">
            <div className="space-y-1.5 xs:space-y-2">
              <Label htmlFor="templateName" className="text-xs xs:text-sm">Tên Template</Label>
              <Input
                id="templateName"
                placeholder="VD: Template chính của công ty"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="text-sm xs:text-base h-9 xs:h-10"
              />
            </div>
            <div className="text-xs xs:text-sm text-muted-foreground">
              <p className="font-medium mb-1">Sẽ lưu:</p>
              <ul className="list-disc list-inside space-y-0.5 xs:space-y-1 text-[11px] xs:text-sm">
                <li>Tên brand: {brandName || '(chưa nhập)'}</li>
                <li>Brand guideline: {brandGuideline ? `${brandGuideline.slice(0, 40)}...` : '(chưa nhập)'}</li>
                <li>Logo: {includeLogo ? 'Có' : 'Không'}</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2 xs:gap-0">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="text-xs xs:text-sm h-8 xs:h-9">
              Hủy
            </Button>
            <Button onClick={handleSaveTemplate} className="text-xs xs:text-sm h-8 xs:h-9">
              <Save className="w-3 h-3 xs:w-4 xs:h-4 mr-1 xs:mr-2" />
              Lưu Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
