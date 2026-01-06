import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  CheckCircle2,
  Zap,
  History,
  BarChart3,
  AlertCircle,
  RefreshCw
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
  KPISuggestion as LocalKPISuggestion,
  getIndustryDisplayName,
  canGenerateSuggestions
} from '@/lib/kpi-suggestions';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { useAIKPISuggestions, AISuggestion } from '@/hooks/useAIKPISuggestions';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

interface KPISuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaign: Campaign;
  industries?: string[] | null;
}

type CombinedSuggestion = (LocalKPISuggestion | AISuggestion) & {
  isAI?: boolean;
};

const ConfidenceBadge = ({ confidence }: { confidence: 'high' | 'medium' | 'low' }) => {
  const configs = {
    high: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Độ tin cậy cao', icon: '🟢' },
    medium: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Trung bình', icon: '🟡' },
    low: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Cần theo dõi', icon: '🔴' },
  };
  const config = configs[confidence];
  
  return (
    <Badge variant="outline" className={cn('text-xs gap-1', config.color)}>
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export function KPISuggestionDialog({
  open,
  onOpenChange,
  campaignId,
  campaign,
  industries,
}: KPISuggestionDialogProps) {
  const { updateKPIs } = useCampaignDetail(campaignId);
  const { currentOrganization } = useOrganizationContext();
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  
  const { 
    fetchSuggestions, 
    reset: resetAI, 
    isLoading: isAILoading, 
    error: aiError, 
    result: aiResult 
  } = useAIKPISuggestions();

  // Generate local suggestions as fallback/instant display
  const localSuggestions = useMemo(() => {
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

  // Fetch AI suggestions when dialog opens
  useEffect(() => {
    if (open && currentOrganization?.id && canGenerateSuggestions(campaign.budget_total)) {
      fetchSuggestions({
        campaignType: campaign.campaign_type,
        budget: campaign.budget_total!,
        budgetCurrency: campaign.budget_currency,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        targetChannels: campaign.target_channels,
        industries: industries || null,
        organizationId: currentOrganization.id,
      });
    }
  }, [open, campaign, industries, currentOrganization?.id, fetchSuggestions]);

  // Combine AI suggestions with local fallback
  const suggestions: CombinedSuggestion[] = useMemo(() => {
    if (aiResult?.suggestions && aiResult.suggestions.length > 0) {
      return aiResult.suggestions.map(s => ({ ...s, isAI: true }));
    }
    return localSuggestions.map(s => ({ ...s, isAI: false }));
  }, [aiResult, localSuggestions]);

  // Initialize selected metrics when dialog opens or suggestions change
  useEffect(() => {
    if (open && suggestions.length > 0) {
      setSelectedMetrics(new Set(suggestions.map(s => s.metric)));
    }
  }, [open, suggestions]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetAI();
      setSelectedMetrics(new Set());
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

  const handleRetryAI = () => {
    if (currentOrganization?.id) {
      fetchSuggestions({
        campaignType: campaign.campaign_type,
        budget: campaign.budget_total!,
        budgetCurrency: campaign.budget_currency,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        targetChannels: campaign.target_channels,
        industries: industries || null,
        organizationId: currentOrganization.id,
      });
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const existingMetrics = new Set(campaign.goals.map(g => g.metric));
      
      const newGoals: CampaignGoal[] = [
        ...campaign.goals,
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
  const isUsingAI = aiResult?.suggestions && aiResult.suggestions.length > 0;

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
            {isUsingAI && (
              <Badge variant="default" className="gap-1 bg-gradient-to-r from-violet-500 to-purple-500">
                <Zap className="h-3 w-3" />
                AI Powered
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUsingAI 
              ? 'Targets được AI phân tích dựa trên historical data, benchmark ngành và mùa vụ'
              : 'Targets được tính toán dựa trên budget, loại campaign và benchmark ngành'
            }
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
          {aiResult?.metadata?.historicalCampaignsCount && aiResult.metadata.historicalCampaignsCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <History className="h-3 w-3" />
              {aiResult.metadata.historicalCampaignsCount} campaigns tham khảo
            </Badge>
          )}
        </div>

        {/* AI Analysis & Recommendations */}
        {isUsingAI && aiResult && (
          <div className="space-y-3 py-3 border-b">
            {aiResult.analysis && (
              <div className="flex items-start gap-2 text-sm">
                <BarChart3 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-muted-foreground">{aiResult.analysis}</p>
              </div>
            )}
            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiResult.recommendations.slice(0, 3).map((rec, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-normal">
                    💡 {rec}
                  </Badge>
                ))}
              </div>
            )}
            {aiResult.fromCache && (
              <p className="text-xs text-muted-foreground">
                📦 Cached result • Cập nhật lần cuối: {new Date(aiResult.cachedAt!).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        )}

        {/* AI Error State */}
        {aiError && !isAILoading && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Không thể tải gợi ý AI, đang dùng công thức mặc định</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRetryAI} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Thử lại
            </Button>
          </div>
        )}

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
            {isAILoading && !aiResult ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl border-2 border-border">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              suggestions.map((suggestion) => {
                const config = getKPIMetricConfig(suggestion.metric);
                const isSelected = selectedMetrics.has(suggestion.metric);
                const existingGoal = campaign.goals.find(g => g.metric === suggestion.metric);
                const aiSuggestion = suggestion as AISuggestion;
                
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xl">{config?.icon}</span>
                          <span className="font-medium">{suggestion.label}</span>
                          {existingGoal && (
                            <Badge variant="secondary" className="text-xs">
                              Đã có
                            </Badge>
                          )}
                          {aiSuggestion.confidence && (
                            <ConfidenceBadge confidence={aiSuggestion.confidence} />
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
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

                        {/* Comparison metrics for AI suggestions */}
                        {(aiSuggestion.historicalAvg != null || aiSuggestion.industryBenchmark != null) && (
                          <div className="flex flex-wrap gap-3 mb-2 text-xs">
                            {aiSuggestion.historicalAvg != null && (
                              <span className="text-muted-foreground">
                                📊 Lịch sử: {aiSuggestion.historicalAvg.toLocaleString('vi-VN')}
                              </span>
                            )}
                            {aiSuggestion.industryBenchmark != null && (
                              <span className="text-muted-foreground">
                                🏭 Benchmark: {aiSuggestion.industryBenchmark.toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{suggestion.reasoning}</span>
                        </div>

                        {aiSuggestion.comparisonNote && (
                          <div className="mt-2 text-xs text-primary/80 bg-primary/5 px-2 py-1 rounded">
                            {aiSuggestion.comparisonNote}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
