import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AdCopyVariation, CTA_BUTTONS } from '@/types/adCopy';

interface EditVariationFormProps {
  variation: AdCopyVariation;
  charLimits: {
    primary_text?: { ideal?: number; max: number };
    headline?: { ideal?: number; max: number };
    description?: { ideal?: number; max: number };
  };
  onSave: (updates: Partial<AdCopyVariation>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditVariationForm({ 
  variation, 
  charLimits, 
  onSave, 
  onCancel,
  isLoading 
}: EditVariationFormProps) {
  const [form, setForm] = useState({
    primary_text: variation.primary_text || '',
    headline: variation.headline || '',
    description: variation.description || '',
    cta_button: variation.cta_button || '',
  });

  useEffect(() => {
    setForm({
      primary_text: variation.primary_text || '',
      headline: variation.headline || '',
      description: variation.description || '',
      cta_button: variation.cta_button || '',
    });
  }, [variation]);

  const renderCharCounter = (text: string, field: 'primary_text' | 'headline' | 'description') => {
    const limit = charLimits[field];
    if (!limit) return null;
    
    const count = text.length;
    const max = limit.max;
    const ideal = limit.ideal || max;
    const percentage = (count / max) * 100;
    
    let color = 'text-green-500';
    let bgColor = 'bg-green-500';
    if (count > max) {
      color = 'text-destructive';
      bgColor = 'bg-destructive';
    } else if (count > ideal) {
      color = 'text-yellow-500';
      bgColor = 'bg-yellow-500';
    }

    return (
      <div className="flex items-center gap-2 mt-1">
        <Progress value={Math.min(percentage, 100)} className={cn("h-1 flex-1", `[&>div]:${bgColor}`)} />
        <span className={cn("text-xs font-mono", color)}>
          {count}/{max}
        </span>
      </div>
    );
  };

  const handleSave = () => {
    onSave({
      primary_text: form.primary_text || null,
      headline: form.headline || null,
      description: form.description || null,
      cta_button: form.cta_button || null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Primary Text */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1 block">Primary Text</label>
        <Textarea
          value={form.primary_text}
          onChange={(e) => setForm(prev => ({ ...prev, primary_text: e.target.value }))}
          placeholder="Nhập primary text..."
          rows={3}
          className="resize-none"
        />
        {renderCharCounter(form.primary_text, 'primary_text')}
      </div>

      {/* Headline */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1 block">Headline</label>
        <Input
          value={form.headline}
          onChange={(e) => setForm(prev => ({ ...prev, headline: e.target.value }))}
          placeholder="Nhập headline..."
        />
        {renderCharCounter(form.headline, 'headline')}
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1 block">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Nhập description..."
          rows={2}
          className="resize-none"
        />
        {renderCharCounter(form.description, 'description')}
      </div>

      {/* CTA Button */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-1 block">CTA Button</label>
        <Select
          value={form.cta_button}
          onValueChange={(value) => setForm(prev => ({ ...prev, cta_button: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn CTA" />
          </SelectTrigger>
          <SelectContent>
            {CTA_BUTTONS.map((cta) => (
              <SelectItem key={cta.value} value={cta.value}>
                {cta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button onClick={handleSave} size="sm" disabled={isLoading}>
          <Save className="h-4 w-4 mr-1" />
          {isLoading ? 'Đang lưu...' : 'Lưu'}
        </Button>
        <Button variant="outline" onClick={onCancel} size="sm" disabled={isLoading}>
          <X className="h-4 w-4 mr-1" />
          Hủy
        </Button>
      </div>
    </div>
  );
}
