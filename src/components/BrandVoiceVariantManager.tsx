import { useState } from 'react';
import { useBrandVoiceVariants, BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS,
  LANGUAGE_STYLE_OPTIONS 
} from '@/components/BrandVoiceSection';
import { VariantComparisonTable } from '@/components/VariantComparisonTable';
import { generateSampleText } from '@/utils/generateSampleText';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  FlaskConical, 
  Star, 
  Trash2, 
  Edit2, 
  Loader2,
  CheckCircle2,
  BarChart3,
  Smile,
  Ban,
  GitCompare,
  ArrowLeftRight,
  HelpCircle,
  Lightbulb,
  FileText,
  ChevronDown,
  Copy,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BrandVoiceVariantManagerProps {
  brandTemplate: BrandTemplate;
}

export function BrandVoiceVariantManager({ brandTemplate }: BrandVoiceVariantManagerProps) {
  const { 
    variants, 
    loading, 
    createVariant, 
    updateVariant,
    deleteVariant, 
    setControlVariant,
    createControlFromBrand,
    hasControl
  } = useBrandVoiceVariants(brandTemplate.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<BrandVoiceVariant | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Get control variant for comparison
  const controlVariant = variants.find(v => v.is_control) || null;
  
  // Helper to check if a variant attribute differs from control
  const isDifferent = (variant: BrandVoiceVariant, attr: keyof BrandVoiceVariant) => {
    if (!controlVariant || variant.is_control) return false;
    
    const controlVal = controlVariant[attr];
    const variantVal = variant[attr];
    
    if (Array.isArray(controlVal) && Array.isArray(variantVal)) {
      const controlSet = new Set(controlVal as string[]);
      const variantSet = new Set(variantVal as string[]);
      if (controlSet.size !== variantSet.size) return true;
      for (const v of variantSet) {
        if (!controlSet.has(v)) return true;
      }
      return false;
    }
    
    return controlVal !== variantVal;
  };
  
  // Count differences from control
  const countDifferences = (variant: BrandVoiceVariant) => {
    if (!controlVariant || variant.is_control) return 0;
    let count = 0;
    if (isDifferent(variant, 'brand_positioning')) count++;
    if (isDifferent(variant, 'formality_level')) count++;
    if (isDifferent(variant, 'allow_emoji')) count++;
    if (isDifferent(variant, 'tone_of_voice')) count++;
    if (isDifferent(variant, 'language_style')) count++;
    return count;
  };
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand_positioning: '',
    tone_of_voice: [] as string[],
    formality_level: '',
    language_style: [] as string[],
    allow_emoji: true,
    sample_text: '',
  });
  
  const [sampleTextOpen, setSampleTextOpen] = useState<string | null>(null);

  const resetForm = () => {
    const defaultSampleText = generateSampleText({
      brandName: brandTemplate.brand_name,
      positioning: brandTemplate.brand_positioning || undefined,
      toneOfVoice: brandTemplate.tone_of_voice,
      formalityLevel: brandTemplate.formality_level,
      allowEmoji: brandTemplate.allow_emoji,
    });
    
    setFormData({
      name: '',
      brand_positioning: brandTemplate.brand_positioning || '',
      tone_of_voice: brandTemplate.tone_of_voice || [],
      formality_level: brandTemplate.formality_level || '',
      language_style: brandTemplate.language_style || [],
      allow_emoji: brandTemplate.allow_emoji ?? true,
      sample_text: defaultSampleText,
    });
    setEditingVariant(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (variant: BrandVoiceVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      brand_positioning: variant.brand_positioning || '',
      tone_of_voice: variant.tone_of_voice || [],
      formality_level: variant.formality_level || '',
      language_style: variant.language_style || [],
      allow_emoji: variant.allow_emoji ?? true,
      sample_text: variant.sample_text || generateSampleText({
        brandName: brandTemplate.brand_name,
        toneOfVoice: variant.tone_of_voice,
        formalityLevel: variant.formality_level,
        allowEmoji: variant.allow_emoji,
      }),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      if (editingVariant) {
        await updateVariant(editingVariant.id, {
          name: formData.name,
          brand_positioning: formData.brand_positioning || null,
          tone_of_voice: formData.tone_of_voice.length > 0 ? formData.tone_of_voice : null,
          formality_level: formData.formality_level || null,
          language_style: formData.language_style.length > 0 ? formData.language_style : null,
          allow_emoji: formData.allow_emoji,
          sample_text: formData.sample_text || null,
        });
      } else {
        await createVariant({
          brand_template_id: brandTemplate.id,
          name: formData.name,
          is_control: false,
          brand_positioning: formData.brand_positioning || null,
          tone_of_voice: formData.tone_of_voice.length > 0 ? formData.tone_of_voice : null,
          formality_level: formData.formality_level || null,
          language_style: formData.language_style.length > 0 ? formData.language_style : null,
          allow_emoji: formData.allow_emoji,
          sample_text: formData.sample_text || null,
          preferred_words: brandTemplate.preferred_words || null,
          forbidden_words: brandTemplate.forbidden_words || null,
          user_id: null,
          organization_id: null,
        });
      }
      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateControl = async () => {
    setSaving(true);
    try {
      await createControlFromBrand(brandTemplate);
    } finally {
      setSaving(false);
    }
  };

  const toggleTone = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tone_of_voice: prev.tone_of_voice.includes(value)
        ? prev.tone_of_voice.filter(t => t !== value)
        : prev.tone_of_voice.length < 3 
          ? [...prev.tone_of_voice, value]
          : prev.tone_of_voice
    }));
  };

  const toggleLanguageStyle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      language_style: prev.language_style.includes(value)
        ? prev.language_style.filter(s => s !== value)
        : [...prev.language_style, value]
    }));
  };

  const regenerateSampleText = () => {
    const newSampleText = generateSampleText({
      brandName: brandTemplate.brand_name,
      positioning: formData.brand_positioning || undefined,
      toneOfVoice: formData.tone_of_voice,
      formalityLevel: formData.formality_level,
      allowEmoji: formData.allow_emoji,
    });
    setFormData(prev => ({ ...prev, sample_text: newSampleText }));
    toast.success('Đã tạo lại sample text');
  };

  const copySampleText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy sample text');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            A/B Testing Variants
            {variants.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {variants.length} variant{variants.length > 1 ? 's' : ''}
              </Badge>
            )}
            {/* Help tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">A/B Testing là gì?</p>
                  <p>So sánh các phiên bản Brand Voice khác nhau để tìm ra phong cách nội dung hiệu quả nhất.</p>
                  <div className="border-t pt-2 mt-2">
                    <p className="font-medium">Cách sử dụng:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Tạo "Control" variant từ Brand Voice hiện tại</li>
                      <li>Thêm các variant mới với các điều chỉnh khác nhau</li>
                      <li>So sánh sự khác biệt giữa các variant</li>
                      <li>Áp dụng variant khi tạo nội dung</li>
                    </ol>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          
          {/* Compare button - show when 2+ variants exist */}
          {variants.length >= 2 && controlVariant && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setComparisonOpen(true)}
              className="gap-2"
            >
              <GitCompare className="w-4 h-4" />
              So sánh Variants
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empty state - no control yet */}
        {variants.length === 0 && (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <Lightbulb className="w-4 h-4 text-primary" />
              <AlertDescription className="text-sm">
                <span className="font-medium">Bắt đầu A/B Testing trong 3 bước:</span>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                  <li><strong>Tạo Control:</strong> Click nút bên dưới để tạo variant gốc từ Brand Voice hiện tại</li>
                  <li><strong>Thêm Variant:</strong> Tạo các phiên bản khác với tone, formality hoặc emoji khác nhau</li>
                  <li><strong>So sánh:</strong> Xem bảng so sánh để thấy sự khác biệt giữa các variant</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="text-center py-4 space-y-4">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Chưa có variant nào. Bắt đầu bằng cách tạo Control variant.
                </p>
              </div>
              <Button onClick={handleCreateControl} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Tạo Control Variant
              </Button>
            </div>
          </div>
        )}

        {/* Variants list */}
        {variants.length > 0 && (
          <div className="space-y-3">
            {variants.map(variant => (
              <div 
                key={variant.id}
                className={`p-4 rounded-lg border transition-colors ${
                  variant.is_control 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-muted/30 border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{variant.name}</span>
                      {variant.is_control && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Star className="w-3 h-3" />
                          Control
                        </Badge>
                      )}
                      {!variant.is_control && countDifferences(variant) > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 shrink-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                              <ArrowLeftRight className="w-3 h-3" />
                              {countDifferences(variant)} khác biệt
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>So với Control variant</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Voice attributes with diff highlighting */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {variant.brand_positioning && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            isDifferent(variant, 'brand_positioning') && "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300"
                          )}
                        >
                          {isDifferent(variant, 'brand_positioning') && <ArrowLeftRight className="w-2.5 h-2.5 mr-1" />}
                          {BRAND_POSITIONING_OPTIONS.find(o => o.value === variant.brand_positioning)?.label || variant.brand_positioning}
                        </Badge>
                      )}
                      {variant.formality_level && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            isDifferent(variant, 'formality_level') && "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300"
                          )}
                        >
                          {isDifferent(variant, 'formality_level') && <ArrowLeftRight className="w-2.5 h-2.5 mr-1" />}
                          {FORMALITY_LEVEL_OPTIONS.find(o => o.value === variant.formality_level)?.label || variant.formality_level}
                        </Badge>
                      )}
                      {variant.tone_of_voice?.map(tone => {
                        const isNewTone = !variant.is_control && controlVariant && !(controlVariant.tone_of_voice || []).includes(tone);
                        return (
                          <Badge 
                            key={tone} 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              isNewTone && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                            )}
                          >
                            {isNewTone && <Plus className="w-2.5 h-2.5 mr-1" />}
                            {TONE_OF_VOICE_OPTIONS.find(o => o.value === tone)?.label || tone}
                          </Badge>
                        );
                      })}
                      {variant.allow_emoji ? (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs gap-1",
                            isDifferent(variant, 'allow_emoji') 
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300" 
                              : "text-green-600 border-green-300"
                          )}
                        >
                          {isDifferent(variant, 'allow_emoji') && <ArrowLeftRight className="w-2.5 h-2.5" />}
                          <Smile className="w-3 h-3" />
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs gap-1",
                            isDifferent(variant, 'allow_emoji')
                              ? "bg-destructive/20 text-destructive border-destructive/30"
                              : "text-destructive border-destructive/30"
                          )}
                        >
                          {isDifferent(variant, 'allow_emoji') && <ArrowLeftRight className="w-2.5 h-2.5" />}
                          <Ban className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>

                    {/* Sample Text Preview */}
                    {(variant.sample_text || controlVariant) && (
                      <Collapsible 
                        open={sampleTextOpen === variant.id}
                        onOpenChange={(open) => setSampleTextOpen(open ? variant.id : null)}
                        className="mt-3"
                      >
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2">
                              <FileText className="w-3 h-3" />
                              Sample text
                              <ChevronDown className={cn(
                                "w-3 h-3 transition-transform",
                                sampleTextOpen === variant.id && "rotate-180"
                              )} />
                            </Button>
                          </CollapsibleTrigger>
                          {variant.sample_text && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => copySampleText(variant.sample_text!)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy sample text</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <CollapsibleContent className="mt-2">
                          <div className="bg-background rounded-md border p-3 text-sm whitespace-pre-line text-muted-foreground">
                            {variant.sample_text || (
                              <span className="italic text-muted-foreground/60">
                                Chưa có sample text. Nhấn Edit để thêm.
                              </span>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {variant.content_count} nội dung
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!variant.is_control && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setControlVariant(variant.id)}
                        title="Đặt làm Control"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(variant)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!variant.is_control && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa Variant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa variant "{variant.name}"? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteVariant(variant.id)}>
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Hint when only control exists */}
            {variants.length === 1 && controlVariant && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Bước tiếp theo:</span> Thêm variant mới với các điều chỉnh khác (tone, formality, emoji...) để bắt đầu so sánh A/B.
                </AlertDescription>
              </Alert>
            )}

            {/* Add new variant button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleOpenCreate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm Variant mới
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tạo phiên bản Brand Voice mới với các điều chỉnh khác để test</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVariant ? 'Chỉnh sửa Variant' : 'Tạo Variant mới'}
              </DialogTitle>
              <DialogDescription>
                Tạo variant với Brand Voice khác để thử nghiệm A/B testing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="variant-name">Tên Variant *</Label>
                <Input
                  id="variant-name"
                  placeholder="VD: Variant B - Casual"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Định vị thương hiệu</Label>
                <Select 
                  value={formData.brand_positioning} 
                  onValueChange={v => setFormData(prev => ({ ...prev, brand_positioning: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn định vị" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_POSITIONING_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mức độ trang trọng</Label>
                <Select 
                  value={formData.formality_level} 
                  onValueChange={v => setFormData(prev => ({ ...prev, formality_level: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMALITY_LEVEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone of Voice (tối đa 3)</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OF_VOICE_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={formData.tone_of_voice.includes(opt.value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleTone(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phong cách ngôn ngữ</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_STYLE_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={formData.language_style.includes(opt.value) ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleLanguageStyle(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-emoji"
                  checked={formData.allow_emoji}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, allow_emoji: !!checked }))
                  }
                />
                <Label htmlFor="allow-emoji" className="text-sm">
                  Cho phép sử dụng emoji
                </Label>
              </div>

              {/* Sample Text */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sample-text" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Sample Text Preview
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={regenerateSampleText}
                      >
                        <Wand2 className="w-3 h-3" />
                        Tạo lại
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Tạo lại sample text dựa trên cài đặt hiện tại
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="sample-text"
                  placeholder="Nhập sample text mẫu cho variant này..."
                  value={formData.sample_text}
                  onChange={e => setFormData(prev => ({ ...prev, sample_text: e.target.value }))}
                  rows={5}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Sample text giúp bạn xem trước và so sánh phong cách nội dung giữa các variant.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !formData.name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingVariant ? 'Cập nhật' : 'Tạo Variant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comparison Table Dialog */}
        <VariantComparisonTable
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          controlVariant={controlVariant}
          variants={variants}
        />
      </CardContent>
    </Card>
  );
}
