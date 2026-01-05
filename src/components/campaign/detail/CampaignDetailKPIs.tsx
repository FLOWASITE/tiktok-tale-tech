import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Plus,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { 
  Campaign, 
  CampaignGoal,
  getKPIMetricConfig, 
  formatMetricValue 
} from '@/types/campaign';
import { cn } from '@/lib/utils';
import { useCampaignDetail } from '@/hooks/useCampaigns';
import { KPILogFormDialog } from '@/components/campaign/kpi/KPILogFormDialog';

interface CampaignDetailKPIsProps {
  campaignId: string;
  campaign: Campaign;
}

export function CampaignDetailKPIs({ campaignId, campaign }: CampaignDetailKPIsProps) {
  const { updateKPIs } = useCampaignDetail(campaignId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState<CampaignGoal[]>([]);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  const handleStartEdit = () => {
    setEditedGoals([...campaign.goals]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedGoals([]);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    await updateKPIs(editedGoals);
    setIsEditing(false);
    setEditedGoals([]);
  };

  const handleGoalChange = (index: number, field: 'target' | 'current', value: number) => {
    const newGoals = [...editedGoals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setEditedGoals(newGoals);
  };

  const currentGoals = isEditing ? editedGoals : campaign.goals;

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Mục tiêu KPI
            </CardTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Hủy
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </Button>
                  <Button size="sm" onClick={() => setIsLogDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log KPI
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentGoals.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Chưa có mục tiêu KPI nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentGoals.map((goal, index) => {
                  const config = getKPIMetricConfig(goal.metric);
                  const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
                  const isCompleted = goal.current >= goal.target && goal.target > 0;
                  
                  return (
                    <div 
                      key={goal.metric}
                      className={cn(
                        "p-4 rounded-xl border-2",
                        isCompleted ? "border-green-500/30 bg-green-500/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{config?.icon}</span>
                        <div>
                          <p className="font-medium">{goal.label}</p>
                          <p className="text-xs text-muted-foreground">{config?.category}</p>
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Mục tiêu:</span>
                            <Input
                              type="number"
                              value={goal.target || ''}
                              onChange={(e) => handleGoalChange(index, 'target', Number(e.target.value))}
                              className="h-8"
                            />
                            {goal.unit && <span className="text-sm text-muted-foreground">{goal.unit}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Hiện tại:</span>
                            <Input
                              type="number"
                              value={goal.current || ''}
                              onChange={(e) => handleGoalChange(index, 'current', Number(e.target.value))}
                              className="h-8"
                            />
                            {goal.unit && <span className="text-sm text-muted-foreground">{goal.unit}</span>}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between mb-2">
                            <span className={cn(
                              "text-3xl font-bold",
                              isCompleted && "text-green-600"
                            )}>
                              {formatMetricValue(goal.current, goal.unit)}
                            </span>
                            <span className="text-muted-foreground">
                              / {formatMetricValue(goal.target, goal.unit)}
                            </span>
                          </div>
                          
                          <Progress 
                            value={progress} 
                            className={cn("h-2", isCompleted && "[&>div]:bg-green-500")}
                          />
                          
                          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>{Math.round(progress)}% hoàn thành</span>
                            {goal.target > 0 && goal.current < goal.target && (
                              <span>
                                Còn thiếu: {formatMetricValue(goal.target - goal.current, goal.unit)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tổng KPI</p>
            <p className="text-2xl font-bold">{campaign.goals.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Đã đạt</p>
            <p className="text-2xl font-bold text-green-600">
              {campaign.goals.filter(g => g.current >= g.target && g.target > 0).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Đang tiến hành</p>
            <p className="text-2xl font-bold text-blue-600">
              {campaign.goals.filter(g => g.current > 0 && g.current < g.target).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Chưa bắt đầu</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {campaign.goals.filter(g => g.current === 0).length}
            </p>
          </Card>
        </div>
      </div>

      {/* Log KPI Dialog */}
      <KPILogFormDialog
        open={isLogDialogOpen}
        onOpenChange={setIsLogDialogOpen}
        campaignId={campaignId}
        goals={campaign.goals}
      />
    </>
  );
}
