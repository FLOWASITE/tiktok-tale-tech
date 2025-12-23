import { useState } from 'react';
import { useBrandVoiceVariants, BrandVoiceVariant } from '@/hooks/useBrandVoiceVariants';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS,
  LANGUAGE_STYLE_OPTIONS 
} from '@/components/BrandVoiceSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus, 
  FlaskConical, 
  Star, 
  Trash2, 
  Edit2, 
  Loader2,
  CheckCircle2,
  BarChart3,
  Smile,
  Ban
} from 'lucide-react';

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
  const [editingVariant, setEditingVariant] = useState<BrandVoiceVariant | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand_positioning: '',
    tone_of_voice: [] as string[],
    formality_level: '',
    language_style: [] as string[],
    allow_emoji: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brand_positioning: brandTemplate.brand_positioning || '',
      tone_of_voice: brandTemplate.tone_of_voice || [],
      formality_level: brandTemplate.formality_level || '',
      language_style: brandTemplate.language_style || [],
      allow_emoji: brandTemplate.allow_emoji ?? true,
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
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          A/B Testing Variants
          {variants.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {variants.length} variant{variants.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empty state - no control yet */}
        {variants.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-sm text-muted-foreground">
                Chưa có variant nào. Tạo Control variant từ Brand Voice hiện tại để bắt đầu A/B test.
              </p>
            </div>
            <Button onClick={handleCreateControl} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Tạo Control Variant
            </Button>
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
                    </div>
                    
                    {/* Voice attributes */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {variant.brand_positioning && (
                        <Badge variant="outline" className="text-xs">
                          {BRAND_POSITIONING_OPTIONS.find(o => o.value === variant.brand_positioning)?.label || variant.brand_positioning}
                        </Badge>
                      )}
                      {variant.formality_level && (
                        <Badge variant="outline" className="text-xs">
                          {FORMALITY_LEVEL_OPTIONS.find(o => o.value === variant.formality_level)?.label || variant.formality_level}
                        </Badge>
                      )}
                      {variant.tone_of_voice?.map(tone => (
                        <Badge key={tone} variant="secondary" className="text-xs">
                          {TONE_OF_VOICE_OPTIONS.find(o => o.value === tone)?.label || tone}
                        </Badge>
                      ))}
                      {variant.allow_emoji ? (
                        <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300">
                          <Smile className="w-3 h-3" />
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                          <Ban className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>

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

            {/* Add new variant button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleOpenCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm Variant mới
            </Button>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
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
      </CardContent>
    </Card>
  );
}
