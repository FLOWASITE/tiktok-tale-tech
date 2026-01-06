import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, 
  Sparkles, 
  Megaphone, 
  Target, 
  Layers, 
  Copy, 
  ChevronDown,
  Link2,
  Users,
  Briefcase,
  Flag,
  Wand2,
  CheckCircle2
} from 'lucide-react';
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const selectedPlatform = AD_PLATFORMS.find(p => p.value === formData.platform);
  const selectedObjective = AD_OBJECTIVES.find(o => o.value === formData.objective);
  const selectedFunnel = FUNNEL_STAGES.find(f => f.value === formData.funnelStage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/10">
        {/* Header with gradient */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <DialogHeader className="relative z-10 p-6 pb-4">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Tạo Ad Copy mới
                </span>
                <p className="text-sm font-normal text-muted-foreground mt-0.5">
                  AI sẽ tạo {formData.variationCount} variations cho bạn
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Topic - Highlighted */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="topic" className="flex items-center gap-2 text-base font-semibold">
                <Megaphone className="h-4 w-4 text-primary" />
                Chủ đề / Mô tả sản phẩm
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Bắt buộc</Badge>
              </Label>
              <Textarea
                id="topic"
                placeholder="VD: Khóa học Digital Marketing cho người mới bắt đầu, giảm 50% trong tuần này. Học viên sẽ được cấp chứng chỉ sau khóa học..."
                value={formData.topic}
                onChange={(e) => updateField('topic', e.target.value)}
                rows={4}
                required
                className="bg-background/60 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Mô tả càng chi tiết, AI sẽ tạo ad copy càng chất lượng
              </p>
            </motion.div>

            {/* Platform Selection - Visual Grid */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Target className="h-4 w-4 text-primary" />
                Nền tảng quảng cáo
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AD_PLATFORMS.map((platform, index) => (
                  <motion.button
                    key={platform.value}
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.03 }}
                    onClick={() => updateField('platform', platform.value as AdPlatform)}
                    className={cn(
                      "group relative p-4 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden",
                      formData.platform === platform.value
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border/50 bg-background/60 hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    {formData.platform === platform.value && (
                      <motion.div
                        layoutId="platform-selected"
                        className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{platform.icon}</span>
                        {formData.platform === platform.value && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="font-medium text-sm">{platform.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{platform.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Objective Selection - Chips */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Flag className="h-4 w-4 text-primary" />
                Mục tiêu quảng cáo
              </Label>
              <div className="flex flex-wrap gap-2">
                {AD_OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => updateField('objective', obj.value as AdObjective)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                      formData.objective === obj.value
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border/50 bg-background/60 hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <span className="mr-1.5">{obj.icon}</span>
                    {obj.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Funnel Stage - Visual Steps */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Layers className="h-4 w-4 text-primary" />
                Giai đoạn Funnel
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {FUNNEL_STAGES.map((stage, index) => (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => updateField('funnelStage', stage.value as AdFunnelStage)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-center transition-all duration-200 overflow-hidden",
                      formData.funnelStage === stage.value
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border/50 bg-background/60 hover:border-primary/50"
                    )}
                  >
                    <div className={cn("absolute top-0 left-0 right-0 h-1.5 rounded-t-lg", stage.color)} />
                    <div className="pt-1">
                      <div className="text-2xl mb-1">
                        {index === 0 ? '👀' : index === 1 ? '🤔' : '💰'}
                      </div>
                      <div className="font-medium text-sm">{stage.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {stage.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Variation Count - Enhanced Slider */}
            <motion.div 
              className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-semibold">
                  <Copy className="h-4 w-4 text-primary" />
                  Số variations
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{formData.variationCount}</span>
                  <span className="text-sm text-muted-foreground">versions</span>
                </div>
              </div>
              <Slider
                value={[formData.variationCount]}
                onValueChange={([value]) => updateField('variationCount', value)}
                min={2}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2 (Nhanh)</span>
                <span>5 (Đa dạng)</span>
              </div>
            </motion.div>

            {/* Advanced Options - Collapsible */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <motion.button
                  type="button"
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/30 transition-colors text-sm font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Tùy chọn nâng cao
                  <ChevronDown className={cn(
                    "h-4 w-4 ml-auto transition-transform duration-200",
                    advancedOpen && "rotate-180"
                  )} />
                </motion.button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <motion.div 
                  className="mt-3 space-y-4 p-4 rounded-xl border border-border/50 bg-muted/20"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  {/* Brand & Campaign */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        Brand Template
                      </Label>
                      <Select 
                        value={formData.brandTemplateId || ''} 
                        onValueChange={(value) => updateField('brandTemplateId', value || undefined)}
                      >
                        <SelectTrigger className="bg-background border-border/50">
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

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                        Chiến dịch
                      </Label>
                      <Select 
                        value={formData.campaignId || ''} 
                        onValueChange={(value) => updateField('campaignId', value || undefined)}
                        disabled={!!defaultCampaignId}
                      >
                        <SelectTrigger className="bg-background border-border/50">
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
                    <Label htmlFor="landingUrl" className="flex items-center gap-2 text-sm">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      URL đích
                    </Label>
                    <Input
                      id="landingUrl"
                      type="url"
                      placeholder="https://example.com/landing-page"
                      value={formData.landingUrl || ''}
                      onChange={(e) => updateField('landingUrl', e.target.value || undefined)}
                      className="bg-background border-border/50"
                    />
                  </div>

                  {/* Audience Brief */}
                  <div className="space-y-2">
                    <Label htmlFor="audienceBrief" className="flex items-center gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Mô tả đối tượng
                    </Label>
                    <Textarea
                      id="audienceBrief"
                      placeholder="VD: Nữ 25-35 tuổi, quan tâm đến marketing, thu nhập trung bình khá"
                      value={formData.audienceBrief || ''}
                      onChange={(e) => updateField('audienceBrief', e.target.value || undefined)}
                      rows={2}
                      className="bg-background border-border/50 resize-none"
                    />
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>

            {/* Summary Preview */}
            <AnimatePresence>
              {formData.topic.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/20"
                >
                  <div className="text-sm font-medium mb-2 text-primary">Tổng quan:</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      {selectedPlatform?.icon} {selectedPlatform?.label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      {selectedObjective?.icon} {selectedObjective?.label}
                    </Badge>
                    <Badge variant="secondary" className={cn("gap-1", selectedFunnel?.color.replace('bg-', 'text-'))}>
                      {selectedFunnel?.label}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Copy className="h-3 w-3" /> {formData.variationCount} variations
                    </Badge>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-border/50"
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating || !formData.topic.trim()}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 min-w-[140px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Tạo Ad Copy
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
