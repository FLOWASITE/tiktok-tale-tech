import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
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
  const [formData, setFormData] = useState<ScriptFormData>({
    topic: '',
    duration: 60,
    video_type: 'expert_share',
    character_type: 'male_expert',
  });

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