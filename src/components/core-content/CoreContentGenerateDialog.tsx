import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useCoreContents } from '@/hooks/useCoreContents';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { CONTENT_GOALS, CONTENT_ANGLES } from '@/types/multichannel';
import type { ContentGoal, ContentAngle } from '@/types/multichannel';

interface CoreContentGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopic?: string;
  onSuccess?: (coreContentId: string) => void;
}

export function CoreContentGenerateDialog({
  open,
  onOpenChange,
  initialTopic = '',
  onSuccess,
}: CoreContentGenerateDialogProps) {
  const { currentOrganization } = useOrganizationContext();
  const { generateCoreContent } = useCoreContents({});

  const [topic, setTopic] = useState(initialTopic);
  const [contentGoal, setContentGoal] = useState<ContentGoal>('education');
  const [contentAngle, setContentAngle] = useState<ContentAngle | '__none__'>('__none__');
  const [brandTemplateId, setBrandTemplateId] = useState<string>('__none__');
  const [targetAudience, setTargetAudience] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề');
      return;
    }

    if (!currentOrganization?.id) {
      toast.error('Không tìm thấy tổ chức');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateCoreContent({
        topic: topic.trim(),
        contentGoal,
        contentAngle: contentAngle === '__none__' ? undefined : contentAngle,
        brandTemplateId: brandTemplateId === '__none__' ? undefined : brandTemplateId,
        organizationId: currentOrganization.id,
        targetAudience: targetAudience || undefined,
        additionalContext: additionalContext || undefined,
      });

      toast.success('Đã tạo Core Content thành công!', {
        description: `${result.wordCount} từ, điểm chất lượng: ${result.qualityScore}/10`,
      });

      onOpenChange(false);
      onSuccess?.(result.id);

      // Reset form
      setTopic('');
      setContentGoal('education');
      setContentAngle('__none__');
      setBrandTemplateId('__none__');
      setTargetAudience('');
      setAdditionalContext('');
    } catch (error) {
      console.error('Error generating core content:', error);
      toast.error('Không thể tạo Core Content', {
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Tạo Core Content
          </DialogTitle>
          <DialogDescription>
            Tạo nội dung gốc dài (800-2000 từ) làm Single Source of Truth
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">
              Chủ đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="topic"
              placeholder="VD: Cách xây dựng thương hiệu cá nhân trên LinkedIn"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Content Goal */}
          <div className="space-y-2">
            <Label>Mục tiêu nội dung</Label>
            <Select
              value={contentGoal}
              onValueChange={(v) => setContentGoal(v as ContentGoal)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_GOALS.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    <div className="flex flex-col">
                      <span>{goal.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {goal.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Angle */}
          <div className="space-y-2">
            <Label>Góc tiếp cận (tùy chọn)</Label>
            <Select
              value={contentAngle}
              onValueChange={(v) => setContentAngle(v as ContentAngle | '__none__')}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn góc tiếp cận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không chọn</SelectItem>
                {CONTENT_ANGLES.map((angle) => (
                  <SelectItem key={angle.value} value={angle.value}>
                    <div className="flex flex-col">
                      <span>{angle.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {angle.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Template - using simple Select */}
          <div className="space-y-2">
            <Label>Brand Template (tùy chọn)</Label>
            <Select
              value={brandTemplateId}
              onValueChange={setBrandTemplateId}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn brand template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không chọn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Đối tượng mục tiêu (tùy chọn)</Label>
            <Input
              id="audience"
              placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Bối cảnh bổ sung (tùy chọn)</Label>
            <Textarea
              id="context"
              placeholder="Thêm thông tin, yêu cầu đặc biệt, hoặc nội dung tham khảo..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              disabled={isGenerating}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Hủy
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Tạo Core Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
