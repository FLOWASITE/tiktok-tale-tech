import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { BrandPreviewCard } from '@/components/BrandPreviewCard';
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

  const selectedTemplate = templates.find(t => t.id === formData.brandTemplateId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-6">
      {/* Topic Input */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label htmlFor="topic" className="text-foreground font-medium text-xs xs:text-sm">
          Chủ đề video <span className="text-primary">*</span>
        </Label>
        <Textarea
          id="topic"
          placeholder="Nhập chủ đề video của bạn, ví dụ: 5 sai lầm khi đầu tư chứng khoán..."
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          className="min-h-[80px] xs:min-h-[100px] bg-muted/50 border-border focus:border-primary focus:ring-primary/20 resize-none text-sm xs:text-base"
          disabled={isLoading}
        />
      </div>

      {/* Brand Template Select */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label htmlFor="brandTemplate" className="text-foreground font-medium text-xs xs:text-sm">
          Brand Template <span className="text-[10px] xs:text-xs text-muted-foreground">(Brand Voice)</span>
        </Label>
        {templatesLoading ? (
          <div className="h-9 xs:h-10 bg-muted/50 border border-border rounded-md flex items-center px-3">
            <span className="text-xs xs:text-sm text-muted-foreground">Đang tải templates...</span>
          </div>
        ) : (
          <Select
            value={formData.brandTemplateId ?? 'none'}
            onValueChange={(value) => setFormData({ ...formData, brandTemplateId: value === 'none' ? undefined : value })}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-muted/50 border-border focus:border-primary text-xs xs:text-sm h-9 xs:h-10">
              <SelectValue placeholder="Chọn Brand Template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs xs:text-sm">Không sử dụng</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id} className="text-xs xs:text-sm">
                  <span className="flex items-center gap-1.5 xs:gap-2">
                    {template.primary_color && (
                      <span
                        className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded-full inline-block"
                        style={{ backgroundColor: template.primary_color }}
                      />
                    )}
                    <span className="truncate max-w-[100px] xs:max-w-none">{template.name}</span>
                    {template.is_default && (
                      <span className="text-[10px] xs:text-xs text-muted-foreground hidden xs:inline">(Mặc định)</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedTemplate && (
          <BrandPreviewCard template={selectedTemplate} defaultOpen={true} />
        )}
      </div>

      {/* Duration & Video Type - 2 columns on larger screens */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
        {/* Duration Select */}
        <div className="space-y-1.5 xs:space-y-2">
          <Label htmlFor="duration" className="text-foreground font-medium text-xs xs:text-sm">
            Thời lượng video
          </Label>
          <Select
            value={formData.duration.toString()}
            onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) as Duration })}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-muted/50 border-border focus:border-primary text-xs xs:text-sm h-9 xs:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DURATION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs xs:text-sm">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Video Type Select */}
        <div className="space-y-1.5 xs:space-y-2">
          <Label htmlFor="video_type" className="text-foreground font-medium text-xs xs:text-sm">
            Thể loại video
          </Label>
          <Select
            value={formData.video_type}
            onValueChange={(value) => setFormData({ ...formData, video_type: value as VideoType })}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-muted/50 border-border focus:border-primary text-xs xs:text-sm h-9 xs:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIDEO_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs xs:text-sm">
                  <span className="truncate">{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Character Type Select */}
      <div className="space-y-1.5 xs:space-y-2">
        <Label htmlFor="character_type" className="text-foreground font-medium text-xs xs:text-sm">
          Nhân vật
        </Label>
        <Select
          value={formData.character_type}
          onValueChange={(value) => setFormData({ ...formData, character_type: value as CharacterType })}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-muted/50 border-border focus:border-primary text-xs xs:text-sm h-9 xs:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs xs:text-sm">
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
        className="w-full h-10 xs:h-12 gradient-primary hover:opacity-90 transition-all duration-300 glow-primary font-semibold text-sm xs:text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 mr-1.5 xs:mr-2 animate-spin" />
            <span className="text-xs xs:text-sm">Đang tạo kịch bản...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 mr-1.5 xs:mr-2" />
            <span className="text-xs xs:text-sm">Tạo kịch bản AI</span>
          </>
        )}
      </Button>
    </form>
  );
}
