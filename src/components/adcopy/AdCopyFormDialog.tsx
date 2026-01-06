import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCampaigns } from '@/hooks/useCampaigns';
import { 
  AD_PLATFORMS, 
  AD_OBJECTIVES, 
  FUNNEL_STAGES,
  type AdCopyFormData, 
  type AdPlatform, 
  type AdObjective, 
  type AdFunnelStage 
} from '@/types/adCopy';
import { cn } from '@/lib/utils';

interface AdCopyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AdCopyFormData) => Promise<void>;
  isGenerating: boolean;
  defaultCampaignId?: string;
}

export function AdCopyFormDialog({ open, onOpenChange, onSubmit, isGenerating, defaultCampaignId }: AdCopyFormDialogProps) {
  const { templates: brandTemplates } = useBrandTemplates();
  const { campaigns } = useCampaigns();
  const [formData, setFormData] = useState<AdCopyFormData>({
    topic: '',
    platform: 'meta_feed',
    objective: 'traffic',
    funnelStage: 'awareness',
    variationCount: 3,
    campaignId: defaultCampaignId,
  });

  // Update campaignId when defaultCampaignId changes
  useEffect(() => {
    if (defaultCampaignId) {
      setFormData(prev => ({ ...prev, campaignId: defaultCampaignId }));
    }
  }, [defaultCampaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic.trim()) return;
    await onSubmit(formData);
  };

  const updateField = <K extends keyof AdCopyFormData>(field: K, value: AdCopyFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tạo Ad Copy mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Chủ đề / Mô tả sản phẩm *</Label>
            <Textarea
              id="topic"
              placeholder="VD: Khóa học Digital Marketing cho người mới bắt đầu, giảm 50% trong tuần này"
              value={formData.topic}
              onChange={(e) => updateField('topic', e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Nền tảng quảng cáo *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AD_PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => updateField('platform', platform.value as AdPlatform)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    formData.platform === platform.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-2 block">{platform.icon}</span>
                  <div className="font-medium text-sm">{platform.label}</div>
                  <div className="text-xs text-muted-foreground">{platform.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Objective Selection */}
          <div className="space-y-3">
            <Label>Mục tiêu quảng cáo *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AD_OBJECTIVES.map((obj) => (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => updateField('objective', obj.value as AdObjective)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    formData.objective === obj.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{obj.icon}</span>
                    <span className="font-medium text-sm">{obj.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Funnel Stage */}
          <div className="space-y-3">
            <Label>Giai đoạn Funnel *</Label>
            <div className="flex gap-2">
              {FUNNEL_STAGES.map((stage, index) => (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => updateField('funnelStage', stage.value as AdFunnelStage)}
                  className={cn(
                    "flex-1 p-3 rounded-lg border text-center transition-all relative overflow-hidden",
                    formData.funnelStage === stage.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn("absolute top-0 left-0 right-0 h-1", stage.color)} />
                  <div className="font-medium text-sm mt-1">{stage.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Variation Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Số variations</Label>
              <span className="text-sm font-medium">{formData.variationCount}</span>
            </div>
            <Slider
              value={[formData.variationCount]}
              onValueChange={([value]) => updateField('variationCount', value)}
              min={2}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Tạo nhiều variations để A/B test hiệu quả hơn
            </p>
          </div>

          {/* Brand Template */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand Template (tùy chọn)</Label>
              <Select 
                value={formData.brandTemplateId || ''} 
                onValueChange={(value) => updateField('brandTemplateId', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brandTemplates.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign */}
            <div className="space-y-2">
              <Label>Chiến dịch (tùy chọn)</Label>
              <Select 
                value={formData.campaignId || ''} 
                onValueChange={(value) => updateField('campaignId', value || undefined)}
                disabled={!!defaultCampaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chiến dịch..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns
                    .filter(c => c.status !== 'completed' && c.status !== 'cancelled')
                    .map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Landing URL */}
          <div className="space-y-2">
            <Label htmlFor="landingUrl">URL đích (tùy chọn)</Label>
            <Input
              id="landingUrl"
              type="url"
              placeholder="https://example.com/landing-page"
              value={formData.landingUrl || ''}
              onChange={(e) => updateField('landingUrl', e.target.value || undefined)}
            />
          </div>

          {/* Audience Brief */}
          <div className="space-y-2">
            <Label htmlFor="audienceBrief">Mô tả đối tượng (tùy chọn)</Label>
            <Textarea
              id="audienceBrief"
              placeholder="VD: Nữ 25-35 tuổi, quan tâm đến marketing, thu nhập trung bình khá"
              value={formData.audienceBrief || ''}
              onChange={(e) => updateField('audienceBrief', e.target.value || undefined)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isGenerating || !formData.topic.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Tạo Ad Copy
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
