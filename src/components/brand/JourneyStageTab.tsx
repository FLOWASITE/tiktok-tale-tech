import { Plus, X, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  JourneyStage, 
  JourneyStageMessagingFormData,
  JOURNEY_STAGE_CONFIG,
  EMOTIONAL_TONES,
  EMOTIONAL_TONE_CONFIG,
  CONTENT_TYPE_OPTIONS,
} from '@/types/journeyStageMessaging';
import { useState } from 'react';

interface JourneyStageTabProps {
  stage: JourneyStage;
  formData: JourneyStageMessagingFormData;
  onChange: (data: Partial<JourneyStageMessagingFormData>) => void;
  isLoading?: boolean;
}

type ArrayField = 'pain_points_focus' | 'benefits_highlight' | 'content_types' | 'avoid_messages';

export function JourneyStageTab({
  stage,
  formData,
  onChange,
  isLoading,
}: JourneyStageTabProps) {
  const config = JOURNEY_STAGE_CONFIG[stage];
  const [newItems, setNewItems] = useState<Record<ArrayField, string>>({
    pain_points_focus: '',
    benefits_highlight: '',
    content_types: '',
    avoid_messages: '',
  });

  const addArrayItem = (field: ArrayField) => {
    const value = newItems[field].trim();
    if (!value) return;
    const currentArray = formData[field] || [];
    if (!currentArray.includes(value)) {
      onChange({ [field]: [...currentArray, value] });
    }
    setNewItems(prev => ({ ...prev, [field]: '' }));
  };

  const removeArrayItem = (field: ArrayField, item: string) => {
    const currentArray = formData[field] || [];
    onChange({ [field]: currentArray.filter(i => i !== item) });
  };

  const toggleContentType = (type: string) => {
    const currentTypes = formData.content_types || [];
    if (currentTypes.includes(type)) {
      onChange({ content_types: currentTypes.filter(t => t !== type) });
    } else {
      onChange({ content_types: [...currentTypes, type] });
    }
  };

  return (
    <div className={cn("space-y-4 p-4", isLoading && "opacity-50 pointer-events-none")}>
      {/* Stage Header */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", config.color)}>
          <span className="text-lg">{config.icon}</span>
        </div>
        <div>
          <h4 className="font-medium text-sm">{config.label}</h4>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-1.5">
        <Label className="text-xs">Headline</Label>
        <Input
          value={formData.headline || ''}
          onChange={e => onChange({ headline: e.target.value })}
          placeholder={`Tiêu đề cho giai đoạn ${config.label}...`}
          className="text-sm"
        />
      </div>

      {/* Hook */}
      <div className="space-y-1.5">
        <Label className="text-xs">Hook mở đầu</Label>
        <Input
          value={formData.hook || ''}
          onChange={e => onChange({ hook: e.target.value })}
          placeholder="Câu mở đầu thu hút..."
          className="text-sm"
        />
      </div>

      {/* Key Message */}
      <div className="space-y-1.5">
        <Label className="text-xs">Key Message (Message chính)</Label>
        <Textarea
          value={formData.key_message || ''}
          onChange={e => onChange({ key_message: e.target.value })}
          placeholder="Thông điệp chính cần truyền tải..."
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* Two Columns: Pain Points & Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pain Points Focus */}
        <div className="space-y-1.5">
          <Label className="text-xs text-rose-600">Pain Points ưu tiên</Label>
          <div className="flex gap-1">
            <Input
              value={newItems.pain_points_focus}
              onChange={e => setNewItems(prev => ({ ...prev, pain_points_focus: e.target.value }))}
              placeholder="Thêm pain point..."
              className="text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('pain_points_focus'))}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => addArrayItem('pain_points_focus')}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {(formData.pain_points_focus || []).map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-rose-500/10 text-rose-600 border-0">
                {item}
                <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('pain_points_focus', item)} />
              </Badge>
            ))}
          </div>
        </div>

        {/* Benefits Highlight */}
        <div className="space-y-1.5">
          <Label className="text-xs text-emerald-600">Benefits nhấn mạnh</Label>
          <div className="flex gap-1">
            <Input
              value={newItems.benefits_highlight}
              onChange={e => setNewItems(prev => ({ ...prev, benefits_highlight: e.target.value }))}
              placeholder="Thêm benefit..."
              className="text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('benefits_highlight'))}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => addArrayItem('benefits_highlight')}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {(formData.benefits_highlight || []).map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-0">
                {item}
                <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('benefits_highlight', item)} />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* CTA & Emotional Tone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA Template */}
        <div className="space-y-1.5">
          <Label className="text-xs">CTA Template</Label>
          <Input
            value={formData.cta_template || ''}
            onChange={e => onChange({ cta_template: e.target.value })}
            placeholder={config.ctaExamples[0] || "Call-to-action..."}
            className="text-sm"
          />
          {config.ctaExamples.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {config.ctaExamples.slice(0, 3).map((cta, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => onChange({ cta_template: cta })}
                >
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  {cta}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Emotional Tone */}
        <div className="space-y-1.5">
          <Label className="text-xs">Emotional Tone</Label>
          <Select
            value={formData.emotional_tone || ''}
            onValueChange={value => onChange({ emotional_tone: value as any })}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Chọn tone..." />
            </SelectTrigger>
            <SelectContent>
              {EMOTIONAL_TONES.map(tone => {
                const toneConfig = EMOTIONAL_TONE_CONFIG[tone];
                const isDefault = config.defaultTone === tone;
                return (
                  <SelectItem key={tone} value={tone}>
                    <span className="flex items-center gap-2">
                      <span>{toneConfig.icon}</span>
                      <span>{toneConfig.label}</span>
                      {isDefault && (
                        <Badge variant="secondary" className="text-[9px] h-4 ml-1">Gợi ý</Badge>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Objection Response */}
      <div className="space-y-1.5">
        <Label className="text-xs">Objection Response</Label>
        <Textarea
          value={formData.objection_response || ''}
          onChange={e => onChange({ objection_response: e.target.value })}
          placeholder="Nếu khách nói 'Tôi chưa cần', trả lời..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Content Types */}
      <div className="space-y-1.5">
        <Label className="text-xs">Loại content phù hợp</Label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPE_OPTIONS.map(option => {
            const isSelected = (formData.content_types || []).includes(option.value);
            const isSuggested = config.suggestedContentTypes.includes(option.value);
            return (
              <div key={option.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={`content-${stage}-${option.value}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleContentType(option.value)}
                  className="data-[state=checked]:bg-primary"
                />
                <Label 
                  htmlFor={`content-${stage}-${option.value}`} 
                  className={cn(
                    "text-xs cursor-pointer",
                    isSuggested && "font-medium text-primary"
                  )}
                >
                  {option.label}
                  {isSuggested && <span className="text-[9px] ml-0.5 text-amber-500">★</span>}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avoid Messages */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tránh nhắc đến</Label>
        <div className="flex gap-1">
          <Input
            value={newItems.avoid_messages}
            onChange={e => setNewItems(prev => ({ ...prev, avoid_messages: e.target.value }))}
            placeholder="Thêm chủ đề cần tránh..."
            className="text-xs h-8"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('avoid_messages'))}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => addArrayItem('avoid_messages')}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {(formData.avoid_messages || []).map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-muted text-muted-foreground border-0">
              {item}
              <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('avoid_messages', item)} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
