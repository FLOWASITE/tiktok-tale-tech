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
    if (!templatesLoading && templates.length > 0) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        applyTemplate(defaultTemplate);
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [templatesLoading, templates]);

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
      brand_guideline: brandGuideline.trim(),
      include_logo: includeLogo,
      is_default: false,
      logo_url: null,
    });

    if (result) {
      setSaveDialogOpen(false);
      setNewTemplateName('');
      setSelectedTemplateId(result.id);
    }
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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Topic */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-sm font-medium">
          Chủ đề Carousel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="topic"
          placeholder="VD: Bỏ thuế khoán từ 2026 - Hộ kinh doanh cần chuẩn bị gì?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Platform & Slide Count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nền tảng</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Số lượng ảnh</Label>
          <Select value={String(slideCount)} onValueChange={(v) => setSlideCount(Number(v))}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {SLIDE_COUNT_OPTIONS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} ảnh
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Tool */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Công cụ tạo ảnh AI</Label>
        <Select value={aiTool} onValueChange={(v) => setAiTool(v as AITool)}>
          <SelectTrigger className="bg-background/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {AI_TOOL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">({opt.description})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Template Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Bookmark className="w-4 h-4" />
            Brand Template
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            className="h-7 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Lưu Template
          </Button>
        </div>
        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className="bg-background/50 border-border/50">
            <SelectValue placeholder="Chọn template..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="custom">
              <span className="text-muted-foreground">Tùy chỉnh mới...</span>
            </SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  {template.is_default && (
                    <span className="text-xs text-primary">(Mặc định)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-sm font-medium">
          Tên Brand
        </Label>
        <Input
          id="brandName"
          placeholder="VD: Thuế Hộ by TAF.vn"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Brand Guideline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="brandGuideline" className="text-sm font-medium">
            Brand Guideline
          </Label>
          {selectedTemplateId && selectedTemplateId !== 'custom' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
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
          rows={5}
          className="bg-background/50 border-border/50 focus:border-primary text-sm"
        />
      </div>

      {/* Include Logo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeLogo"
          checked={includeLogo}
          onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
        />
        <Label htmlFor="includeLogo" className="text-sm font-normal cursor-pointer">
          Bao gồm logo trong thiết kế
        </Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!topic.trim() || isLoading}
        className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Đang tạo prompts...
          </>
        ) : (
          <>
            <Images className="w-4 h-4 mr-2" />
            Tạo Prompt Carousel
          </>
        )}
      </Button>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
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
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Sẽ lưu:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tên brand: {brandName || '(chưa nhập)'}</li>
                <li>Brand guideline: {brandGuideline ? `${brandGuideline.slice(0, 50)}...` : '(chưa nhập)'}</li>
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
