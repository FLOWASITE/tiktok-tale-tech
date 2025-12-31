import { useState } from 'react';
import { Plus, X, Target, Brain, Sparkles, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { 
  CustomerPersona,
  FUNNEL_STAGES, 
  INCOME_LEVELS, 
  AGE_RANGES, 
  GENDER_OPTIONS,
  AVATAR_EMOJIS,
} from '@/types/customerPersona';
import { toast } from '@/hooks/use-toast';

interface PersonaQuickAddDialogProps {
  brandTemplateId: string;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const defaultFormData: Partial<CustomerPersona> = {
  name: '',
  avatar_emoji: '👤',
  is_primary: false,
  age_range: null,
  gender: null,
  location: null,
  income_level: null,
  occupation: null,
  pain_points: [],
  desires: [],
  objections: [],
  values: [],
  interests: [],
  buying_triggers: [],
  preferred_channels: [],
  typical_funnel_stage: null,
};

export function PersonaQuickAddDialog({
  brandTemplateId,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: PersonaQuickAddDialogProps) {
  const { createPersona, personas } = useCustomerPersonas({ brandTemplateId, enabled: true });
  const [formData, setFormData] = useState<Partial<CustomerPersona>>(defaultFormData);
  const [newItem, setNewItem] = useState('');
  const [activeArrayField, setActiveArrayField] = useState<keyof CustomerPersona | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên persona', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // If this is the first persona, make it primary
      const isPrimary = personas.length === 0 ? true : formData.is_primary;
      
      await createPersona({
        ...formData,
        is_primary: isPrimary,
        brand_template_id: brandTemplateId,
        organization_id: organizationId || null,
      } as Omit<CustomerPersona, 'id' | 'created_at' | 'updated_at' | 'user_id'>);
      
      toast({ title: 'Thành công', description: 'Đã thêm persona mới' });
      setFormData(defaultFormData);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể thêm persona', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArrayItem = (field: keyof CustomerPersona) => {
    if (!newItem.trim()) return;
    const currentArray = (formData[field] as string[]) || [];
    if (!currentArray.includes(newItem.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, newItem.trim()]
      }));
    }
    setNewItem('');
  };

  const removeArrayItem = (field: keyof CustomerPersona, item: string) => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData(prev => ({
      ...prev,
      [field]: currentArray.filter(i => i !== item)
    }));
  };

  const handleClose = () => {
    setFormData(defaultFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Thêm Persona mới</DialogTitle>
          <DialogDescription>
            Mô tả chân dung khách hàng để AI hiểu pain points và desires
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="name">Tên persona *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Chủ shop online"
                  autoFocus
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Avatar</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start gap-2">
                      <span className="text-xl">{formData.avatar_emoji}</span>
                      <span className="text-sm text-muted-foreground">Chọn emoji</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="grid grid-cols-6 gap-1">
                      {AVATAR_EMOJIS.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-lg"
                          onClick={() => setFormData(prev => ({ ...prev, avatar_emoji: emoji }))}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Demographics */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Nhân khẩu học
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select 
                  value={formData.age_range || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, age_range: v || null }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Độ tuổi" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((age) => (
                      <SelectItem key={age} value={age}>{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={formData.gender || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, gender: (v as 'male' | 'female' | 'all') || null }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={formData.income_level || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, income_level: (v as 'low' | 'medium' | 'high' | 'very_high') || null }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Thu nhập" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_LEVELS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Nghề nghiệp..."
                value={formData.occupation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                className="h-9"
              />
              <Input
                placeholder="Vị trí (VD: TP.HCM, Hà Nội...)"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Pain Points */}
            <div>
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-destructive" />
                Pain Points (Nỗi đau)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeArrayField === 'pain_points' ? newItem : ''}
                  onChange={e => { setNewItem(e.target.value); setActiveArrayField('pain_points'); }}
                  onFocus={() => setActiveArrayField('pain_points')}
                  placeholder="VD: Thiếu thời gian, Không biết bắt đầu từ đâu..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('pain_points'))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pain_points')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.pain_points && formData.pain_points.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.pain_points.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-destructive/10 text-destructive">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeArrayItem('pain_points', item)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Desires */}
            <div>
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Desires (Mong muốn)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeArrayField === 'desires' ? newItem : ''}
                  onChange={e => { setNewItem(e.target.value); setActiveArrayField('desires'); }}
                  onFocus={() => setActiveArrayField('desires')}
                  placeholder="VD: Tăng doanh thu, Tiết kiệm thời gian..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('desires'))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('desires')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.desires && formData.desires.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.desires.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeArrayItem('desires', item)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Objections */}
            <div>
              <Label className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                Objections (Lý do từ chối)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeArrayField === 'objections' ? newItem : ''}
                  onChange={e => { setNewItem(e.target.value); setActiveArrayField('objections'); }}
                  onFocus={() => setActiveArrayField('objections')}
                  placeholder="VD: Giá cao, Chưa tin tưởng..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('objections'))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('objections')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.objections && formData.objections.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.objections.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-amber-500/10 text-amber-600">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeArrayItem('objections', item)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Funnel Stage */}
            <div className="space-y-1.5">
              <Label>Giai đoạn Funnel điển hình</Label>
              <div className="flex gap-2">
                {FUNNEL_STAGES.map((stage) => (
                  <Button
                    key={stage.value}
                    type="button"
                    variant={formData.typical_funnel_stage === stage.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => setFormData(prev => ({ ...prev, typical_funnel_stage: stage.value }))}
                  >
                    {stage.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Set as Primary */}
            {personas.length > 0 && (
              <Button
                type="button"
                variant={formData.is_primary ? 'default' : 'outline'}
                size="sm"
                className="w-full h-9"
                onClick={() => setFormData(prev => ({ ...prev, is_primary: !prev.is_primary }))}
              >
                <Star className={`w-4 h-4 mr-1.5 ${formData.is_primary ? 'fill-current' : ''}`} />
                {formData.is_primary ? 'Persona chính' : 'Đặt làm Persona chính'}
              </Button>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name?.trim()}>
            {isSubmitting ? 'Đang thêm...' : 'Thêm persona'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
