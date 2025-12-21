import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { 
  ScriptFormData, 
  VideoType, 
  CharacterType, 
  Duration,
  VIDEO_TYPE_LABELS,
  CHARACTER_TYPE_LABELS,
  DURATION_LABELS
} from '@/types/script';

interface ScriptFormProps {
  onSubmit: (data: ScriptFormData) => Promise<void>;
  isLoading: boolean;
}

export function ScriptForm({ onSubmit, isLoading }: ScriptFormProps) {
  const { templates, loading: templatesLoading } = useBrandTemplates();
  const [formData, setFormData] = useState<ScriptFormData>({
    topic: '',
    duration: 60,
    video_type: 'expert_share',
    character_type: 'male_expert',
    brandTemplateId: undefined,
  });

  // Set default template on load
  useEffect(() => {
    if (!templatesLoading && templates.length > 0 && !formData.brandTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        setFormData(prev => ({ ...prev, brandTemplateId: defaultTemplate.id }));
      }
    }
  }, [templates, templatesLoading, formData.brandTemplateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Topic Input */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-foreground font-medium">
          Chủ đề video <span className="text-primary">*</span>
        </Label>
        <Textarea
          id="topic"
          placeholder="Nhập chủ đề video của bạn, ví dụ: 5 sai lầm khi đầu tư chứng khoán..."
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          className="min-h-[100px] bg-muted/50 border-border focus:border-primary focus:ring-primary/20 resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Brand Template Select */}
      <div className="space-y-2">
        <Label htmlFor="brandTemplate" className="text-foreground font-medium">
          Brand Template <span className="text-xs text-muted-foreground">(Brand Voice)</span>
        </Label>
        <Select
          value={formData.brandTemplateId || 'none'}
          onValueChange={(value) => setFormData({ ...formData, brandTemplateId: value === 'none' ? undefined : value })}
          disabled={isLoading || templatesLoading}
        >
          <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
            <SelectValue placeholder="Chọn Brand Template..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Không sử dụng</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} {template.is_default && '(Mặc định)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.brandTemplateId && (
          <p className="text-xs text-muted-foreground">
            Kịch bản sẽ tuân theo Brand Voice đã cấu hình trong template
          </p>
        )}
      </div>

      {/* Duration Select */}
      <div className="space-y-2">
        <Label htmlFor="duration" className="text-foreground font-medium">
          Thời lượng video
        </Label>
        <Select
          value={formData.duration.toString()}
          onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) as Duration })}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DURATION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Video Type Select */}
      <div className="space-y-2">
        <Label htmlFor="video_type" className="text-foreground font-medium">
          Thể loại video
        </Label>
        <Select
          value={formData.video_type}
          onValueChange={(value) => setFormData({ ...formData, video_type: value as VideoType })}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Character Type Select */}
      <div className="space-y-2">
        <Label htmlFor="character_type" className="text-foreground font-medium">
          Nhân vật
        </Label>
        <Select
          value={formData.character_type}
          onValueChange={(value) => setFormData({ ...formData, character_type: value as CharacterType })}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !formData.topic.trim()}
        className="w-full h-12 gradient-primary hover:opacity-90 transition-all duration-300 glow-primary font-semibold text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Đang tạo kịch bản...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Tạo kịch bản AI
          </>
        )}
      </Button>
    </form>
  );
}
