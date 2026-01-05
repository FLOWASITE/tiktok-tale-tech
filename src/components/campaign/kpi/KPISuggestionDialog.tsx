import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  Campaign, 
  CampaignGoal,
  getKPIMetricConfig,
  getCampaignTypeConfig,
  formatBudget
} from '@/types/campaign';
import { 
  generateKPISuggestions, 
  KPISuggestion,
  getIndustryDisplayName,
  canGenerateSuggestions
} from '@/lib/kpi-suggestions';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';

interface KPISuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaign: Campaign;
  industries?: string[] | null;
}

export function KPISuggestionDialog({
  open,
  onOpenChange,
  campaignId,
  campaign,
  industries,
}: KPISuggestionDialogProps) {
  const { updateKPIs } = useCampaignDetail(campaignId);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  // Generate suggestions based on campaign data
  const suggestions = useMemo(() => {
    if (!canGenerateSuggestions(campaign.budget_total)) return [];
    
    return generateKPISuggestions({
      budget: campaign.budget_total!,
      budgetCurrency: campaign.budget_currency,
      campaignType: campaign.campaign_type,
      industries,
      startDate: campaign.start_date,
      targetChannels: campaign.target_channels,
    });
  }, [campaign, industries]);

  // Initialize selected metrics when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Pre-select all suggestions
      setSelectedMetrics(new Set(suggestions.map(s => s.metric)));
    }
    onOpenChange(newOpen);
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metric)) {
        newSet.delete(metric);
      } else {
        newSet.add(metric);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedMetrics(new Set(suggestions.map(s => s.metric)));
  };

  const deselectAll = () => {
    setSelectedMetrics(new Set());
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Merge selected suggestions with existing goals
      const existingMetrics = new Set(campaign.goals.map(g => g.metric));
      
      const newGoals: CampaignGoal[] = [
        ...campaign.goals, // Keep existing goals
        ...suggestions
          .filter(s => selectedMetrics.has(s.metric) && !existingMetrics.has(s.metric))
          .map(s => ({
            metric: s.metric,
            label: s.label,
            target: s.target,
            current: 0,
            unit: s.unit,
          })),
      ];

      // Update existing goals with new targets if selected
      const updatedGoals = newGoals.map(goal => {
        const suggestion = suggestions.find(s => s.metric === goal.metric);
        if (suggestion && selectedMetrics.has(goal.metric)) {
          return { ...goal, target: suggestion.target };
        }
        return goal;
      });

      await updateKPIs(updatedGoals);
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const typeConfig = getCampaignTypeConfig(campaign.campaign_type);
  const hasExistingGoals = campaign.goals.length > 0;

  if (!canGenerateSuggestions(campaign.budget_total)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gợi ý KPI
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Cần thiết lập budget cho campaign để có thể gợi ý KPI targets.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gợi ý KPI Targets
          </DialogTitle>
          <DialogDescription>
            Targets được tính toán dựa trên budget, loại campaign và benchmark ngành
          </DialogDescription>
        </DialogHeader>

        {/* Campaign Context */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {formatBudget(campaign.budget_total, campaign.budget_currency)}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            {typeConfig.icon} {typeConfig.label}
          </Badge>
          <Badge variant="outline">
            Ngành: {getIndustryDisplayName(industries ?? null)}
          </Badge>
          {campaign.target_channels.length > 0 && (
            <Badge variant="outline">
              {campaign.target_channels.length} kênh
            </Badge>
          )}
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">
            Đã chọn {selectedMetrics.size}/{suggestions.length} KPIs
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Chọn tất cả
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Bỏ chọn
            </Button>
          </div>
        </div>

        {/* Suggestions List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            {suggestions.map((suggestion) => {
              const config = getKPIMetricConfig(suggestion.metric);
              const isSelected = selectedMetrics.has(suggestion.metric);
              const existingGoal = campaign.goals.find(g => g.metric === suggestion.metric);
              
              return (
                <div
                  key={suggestion.metric}
                  onClick={() => toggleMetric(suggestion.metric)}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMetric(suggestion.metric)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{config?.icon}</span>
                        <span className="font-medium">{suggestion.label}</span>
                        {existingGoal && (
                          <Badge variant="secondary" className="text-xs">
                            Đã có
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-primary">
                          {suggestion.target.toLocaleString('vi-VN')}
                        </span>
                        {suggestion.unit && (
                          <span className="text-muted-foreground">{suggestion.unit}</span>
                        )}
                        {existingGoal && existingGoal.target !== suggestion.target && (
                          <span className="text-sm text-muted-foreground line-through">
                            (hiện tại: {existingGoal.target.toLocaleString('vi-VN')})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{suggestion.reasoning}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Warning for existing goals */}
        {hasExistingGoals && selectedMetrics.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Các KPI đã có sẽ được cập nhật target mới. Giá trị hiện tại (current) không thay đổi.
            </span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={selectedMetrics.size === 0 || isApplying}
            className="gap-2"
          >
            {isApplying ? (
              'Đang áp dụng...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Áp dụng {selectedMetrics.size} KPIs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
