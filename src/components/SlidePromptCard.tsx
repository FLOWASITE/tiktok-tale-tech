import { CarouselSlide, StructuredTextContent, textContentToString } from '@/types/carousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Check, Target, Type, Palette, Layout, Square, Settings, Pencil, X, Save, ChevronDown } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ImageGeneratorButton } from './ImageGeneratorButton';
import { GeneratedImage } from '@/hooks/useImageGeneration';
import { cn } from '@/lib/utils';

interface SlidePromptCardProps {
  slide: CarouselSlide;
  totalSlides: number;
  generatedImage?: GeneratedImage;
  isGenerating?: boolean;
  onGenerateImage?: () => void;
  canGenerateImage?: boolean;
  onSlideUpdate?: (updatedSlide: CarouselSlide) => void;
}

type EditableField = 'objective' | 'textContent' | 'designStyle' | 'colorLayout' | 'aspectRatio' | 'technicalRequirements' | 'fullPrompt';

export function SlidePromptCard({
  slide,
  totalSlides,
  generatedImage,
  isGenerating = false,
  onGenerateImage,
  canGenerateImage = false,
  onSlideUpdate,
}: SlidePromptCardProps) {
  const [copiedFull, setCopiedFull] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [structuredEditValue, setStructuredEditValue] = useState<StructuredTextContent>({ headline: '' });
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isStructuredText = typeof slide.textContent !== 'string';

  const handleCopyFullPrompt = async () => {
    try {
      await navigator.clipboard.writeText(slide.fullPrompt);
      setCopiedFull(true);
      toast.success('Đã copy prompt!');
      setTimeout(() => setCopiedFull(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const startEditing = useCallback((field: EditableField) => {
    setEditingField(field);
    if (field === 'textContent' && isStructuredText) {
      const tc = slide.textContent as StructuredTextContent;
      setStructuredEditValue({ ...tc });
    } else {
      const val = slide[field];
      setEditValue(field === 'textContent' ? textContentToString(val as any) : (val as string));
    }
  }, [slide, isStructuredText]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    setEditValue('');
    setStructuredEditValue({ headline: '' });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingField || !onSlideUpdate) return;

    let newValue: string | StructuredTextContent;

    if (editingField === 'textContent' && isStructuredText) {
      if (!structuredEditValue.headline.trim()) {
        toast.error('Headline không được để trống');
        return;
      }
      newValue = {
        headline: structuredEditValue.headline.trim(),
        ...(structuredEditValue.subtitle?.trim() && { subtitle: structuredEditValue.subtitle.trim() }),
        ...(structuredEditValue.caption?.trim() && { caption: structuredEditValue.caption.trim() }),
        ...(structuredEditValue.dataValue?.trim() && { dataValue: structuredEditValue.dataValue.trim() }),
        ...(structuredEditValue.dataLabel?.trim() && { dataLabel: structuredEditValue.dataLabel.trim() }),
      };
    } else {
      const trimmed = editValue.trim();
      if (!trimmed) {
        toast.error('Nội dung không được để trống');
        return;
      }
      if (trimmed === slide[editingField]) {
        cancelEditing();
        return;
      }
      newValue = trimmed;
    }

    setSaving(true);
    try {
      const updatedSlide: CarouselSlide = { ...slide, [editingField]: newValue };
      await onSlideUpdate(updatedSlide);
      setEditingField(null);
      setEditValue('');
      setStructuredEditValue({ headline: '' });
      toast.success('Đã cập nhật!');
    } catch {
      toast.error('Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  }, [editingField, editValue, structuredEditValue, isStructuredText, slide, onSlideUpdate, cancelEditing]);

  const getSlideLabel = () => {
    if (slide.slideNumber === 1) return 'Hook';
    if (slide.slideNumber === totalSlides) return 'CTA';
    return `Slide ${slide.slideNumber}`;
  };

  const getSlideColor = () => {
    if (slide.slideNumber === 1) return 'bg-primary text-primary-foreground';
    if (slide.slideNumber === totalSlides) return 'bg-green-500 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  const renderStructuredTextEditor = () => (
    <div className="space-y-2 bg-background rounded-lg border border-input p-3">
      <div className="space-y-1.5">
        <Label className="text-[10px] xs:text-xs">Headline *</Label>
        <Input
          value={structuredEditValue.headline}
          onChange={(e) => setStructuredEditValue(prev => ({ ...prev, headline: e.target.value }))}
          className="h-8 text-xs xs:text-sm"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] xs:text-xs">Subtitle</Label>
        <Input
          value={structuredEditValue.subtitle || ''}
          onChange={(e) => setStructuredEditValue(prev => ({ ...prev, subtitle: e.target.value }))}
          className="h-8 text-xs xs:text-sm"
          placeholder="Phụ đề (tùy chọn)"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] xs:text-xs">Data Value</Label>
          <Input
            value={structuredEditValue.dataValue || ''}
            onChange={(e) => setStructuredEditValue(prev => ({ ...prev, dataValue: e.target.value }))}
            className="h-8 text-xs xs:text-sm"
            placeholder="VD: 85%"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] xs:text-xs">Data Label</Label>
          <Input
            value={structuredEditValue.dataLabel || ''}
            onChange={(e) => setStructuredEditValue(prev => ({ ...prev, dataLabel: e.target.value }))}
            className="h-8 text-xs xs:text-sm"
            placeholder="VD: Tăng trưởng"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] xs:text-xs">Caption</Label>
        <Input
          value={structuredEditValue.caption || ''}
          onChange={(e) => setStructuredEditValue(prev => ({ ...prev, caption: e.target.value }))}
          className="h-8 text-xs xs:text-sm"
          placeholder="Chú thích nhỏ (tùy chọn)"
        />
      </div>
      <div className="flex items-center gap-1.5 justify-end pt-1">
        <span className="text-[9px] xs:text-[10px] text-muted-foreground mr-auto">
          Ctrl+Enter để lưu
        </span>
        <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
          <X className="w-3 h-3 mr-0.5" /> Hủy
        </Button>
        <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
          <Save className="w-3 h-3 mr-0.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </div>
  );

  const renderEditableField = (
    field: EditableField,
    icon: React.ReactNode,
    label: string,
    shortLabel: string,
    value: string,
  ) => {
    const isEditing = editingField === field;

    return (
      <div className="space-y-1 xs:space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs font-medium text-muted-foreground">
            {icon}
            <span className="hidden xs:inline">{label}</span>
            <span className="xs:hidden">{shortLabel}</span>
          </div>
          {onSlideUpdate && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing(field)}
              className="h-5 xs:h-6 w-5 xs:w-6 p-0 text-muted-foreground hover:text-primary"
            >
              <Pencil className="w-2.5 xs:w-3 h-2.5 xs:h-3" />
            </Button>
          )}
        </div>
        {isEditing ? (
          field === 'textContent' && isStructuredText ? (
            renderStructuredTextEditor()
          ) : (
            <div className="space-y-1.5">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-xs xs:text-sm min-h-[60px] resize-y bg-background"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEditing();
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                }}
              />
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[9px] xs:text-[10px] text-muted-foreground mr-auto">
                  Ctrl+Enter để lưu
                </span>
                <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
                  <X className="w-3 h-3 mr-0.5" /> Hủy
                </Button>
                <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
                  <Save className="w-3 h-3 mr-0.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          )
        ) : (
          <p className="text-xs xs:text-sm bg-muted/30 p-2 xs:p-2.5 rounded-lg whitespace-pre-wrap cursor-pointer hover:bg-muted/50 transition-colors"
            onDoubleClick={() => onSlideUpdate && startEditing(field)}
            title={onSlideUpdate ? 'Double-click để chỉnh sửa' : undefined}
          >
            {value}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-2 xs:pb-3 px-3 xs:px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 flex-1">
            <Badge className={`${getSlideColor()} text-[10px] xs:text-xs px-1.5 xs:px-2`}>
              {getSlideLabel()}
            </Badge>
            <CardTitle className="text-xs xs:text-sm font-medium text-muted-foreground truncate">
              Ảnh {slide.slideNumber}/{totalSlides}
            </CardTitle>
            {/* Thumbnail preview if image exists */}
            {generatedImage && (
              <img
                src={generatedImage.imageUrl}
                alt={`Slide ${slide.slideNumber}`}
                className="w-8 h-8 xs:w-10 xs:h-10 rounded object-cover border border-border/50 ml-auto shrink-0"
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFullPrompt}
            className="border-border hover:border-primary h-7 xs:h-8 px-2 xs:px-3 text-xs shrink-0"
          >
            {copiedFull ? (
              <Check className="w-3 xs:w-4 h-3 xs:h-4 text-green-500" />
            ) : (
              <Copy className="w-3 xs:w-4 h-3 xs:h-4" />
            )}
            <span className="ml-1 xs:ml-1.5 hidden xs:inline">Copy</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 xs:space-y-3 px-3 xs:px-4 sm:px-6 py-2 xs:py-3">
        {/* Always visible: textContent (headline) */}
        {renderEditableField(
          'textContent',
          <Type className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
          '[2] Nội dung chữ trên ảnh',
          'Nội dung',
          textContentToString(slide.textContent),
        )}

        {/* Full Prompt - always visible */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-1.5 xs:mb-2">
            <span className="text-[10px] xs:text-xs font-medium text-primary">PROMPT HOÀN CHỈNH</span>
            {onSlideUpdate && editingField !== 'fullPrompt' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEditing('fullPrompt')}
                className="h-5 xs:h-6 px-1.5 text-[10px] xs:text-xs text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-2.5 xs:w-3 h-2.5 xs:h-3 mr-0.5" />
                Sửa
              </Button>
            )}
          </div>
          {editingField === 'fullPrompt' ? (
            <div className="space-y-1.5">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-[10px] xs:text-xs sm:text-sm font-mono min-h-[120px] resize-y bg-background"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEditing();
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                }}
              />
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[9px] xs:text-[10px] text-muted-foreground mr-auto">
                  Ctrl+Enter để lưu
                </span>
                <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
                  <X className="w-3 h-3 mr-0.5" /> Hủy
                </Button>
                <Button size="sm" onClick={saveEdit} className="h-6 px-2 text-[10px] xs:text-xs" disabled={saving}>
                  <Save className="w-3 h-3 mr-0.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="bg-primary/5 border border-primary/20 rounded-lg p-2 xs:p-3 cursor-pointer hover:bg-primary/10 transition-colors"
              onDoubleClick={() => onSlideUpdate && startEditing('fullPrompt')}
              title={onSlideUpdate ? 'Double-click để chỉnh sửa' : undefined}
            >
              <p className="text-[10px] xs:text-xs sm:text-sm whitespace-pre-wrap font-mono leading-relaxed">{slide.fullPrompt}</p>
            </div>
          )}
        </div>

        {/* Collapsible details: objective, designStyle, colorLayout, aspectRatio, technicalRequirements */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-[10px] xs:text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
              <ChevronDown className={cn("w-3 h-3 transition-transform", detailsOpen && "rotate-180")} />
              {detailsOpen ? 'Ẩn chi tiết' : 'Xem chi tiết (Mục tiêu, Phong cách, Màu sắc...)'}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2.5 xs:space-y-3 pt-2">
            {renderEditableField(
              'objective',
              <Target className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
              '[1] Mục tiêu slide',
              'Mục tiêu',
              slide.objective,
            )}

            {renderEditableField(
              'designStyle',
              <Palette className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
              '[3] Phong cách thiết kế',
              'Phong cách',
              slide.designStyle,
            )}

            {renderEditableField(
              'colorLayout',
              <Layout className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
              '[4] Màu sắc – bố cục',
              'Màu sắc',
              slide.colorLayout,
            )}

            {/* AspectRatio + TechnicalRequirements in 2-col grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 xs:gap-3">
              {renderEditableField(
                'aspectRatio',
                <Square className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
                '[5] Tỉ lệ khung hình',
                'Tỉ lệ',
                slide.aspectRatio,
              )}

              {renderEditableField(
                'technicalRequirements',
                <Settings className="w-3 xs:w-3.5 h-3 xs:h-3.5" />,
                '[6] Yêu cầu kỹ thuật',
                'Kỹ thuật',
                slide.technicalRequirements,
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Image Generation Section */}
        {onGenerateImage && (
          <div className="pt-2 xs:pt-3 border-t border-border/50">
            <ImageGeneratorButton
              slideNumber={slide.slideNumber}
              isGenerating={isGenerating}
              generatedImage={generatedImage}
              onGenerate={onGenerateImage}
              disabled={!canGenerateImage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
